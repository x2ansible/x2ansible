import os
import uuid
import logging
from pathlib import Path

from llama_stack_client import LlamaStackClient, Agent, RAGDocument
from llama_stack_client.types import UserMessage
from llama_stack_client.lib.agents.event_logger import EventLogger

# === Setup Logging ===
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Create base logger
logging.basicConfig(
    filename=log_dir / "agentic_model.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)

# Add console logging
console = logging.StreamHandler()
console.setLevel(logging.INFO)
logging.getLogger().addHandler(console)

# Add app.log file logging
app_log = logging.FileHandler(log_dir / "app.log")
app_log.setLevel(logging.INFO)
logging.getLogger().addHandler(app_log)


class AgenticModel:
    def __init__(self, base_url="http://localhost:8321", vector_db="puppet_docs"):
        self.base_url = base_url
        self.vector_db = vector_db
        self.model = "llama3.2:3b"
        self.embedding_model = "all-MiniLM-L6-v2"
        self.embedding_dim = 384
        self.client = LlamaStackClient(base_url=self.base_url)
        self._ensure_vector_db()

    def _ensure_vector_db(self):
        existing = [db.provider_resource_id for db in self.client.vector_dbs.list()]
        if self.vector_db not in existing:
            self.client.vector_dbs.register(
                vector_db_id=self.vector_db,
                embedding_model=self.embedding_model,
                embedding_dimension=self.embedding_dim,
                provider_id="faiss",
            )
            logging.info(f"Registered vector DB: {self.vector_db}")

    def transform(self, code, mode="convert", stream_ui=False):
        logging.info(f"▶️ Running AgenticModel.transform with mode={mode}")

        # Step 1: Run RAG search to get contextual docs
        rag_agent = Agent(
            self.client,
            model=self.model,
            instructions="Use the RAG tool to fetch IaC-related context.",
            tools=[{
                "name": "builtin::rag/knowledge_search",
                "args": {
                    "vector_db_ids": [self.vector_db],
                    "top_k": 5
                }
            }],
        )
        rag_session_id = rag_agent.create_session("enrich")
        rag_turn = rag_agent.create_turn(
            messages=[UserMessage(role="user", content="Puppet file resource definition")],
            session_id=rag_session_id,
            stream=False
        )
        tool_step = next((s for s in rag_turn.steps if s.step_type == "tool_execution"), None)
        tool_context = tool_step.tool_responses[0].content if tool_step else ""

        # Log RAG chunks
        logging.info("🧠 RAG Context:")
        if isinstance(tool_context, list):
            for i, item in enumerate(tool_context):
                logging.info(f"Chunk {i+1}: {getattr(item, 'text', str(item))}")
        else:
            logging.info(tool_context)

        # Step 2: Build final prompt
        if mode == "analyze":
            prompt = (
                "You are an AI analyst.\n"
                "Explain in clear English what the following Puppet or Chef code does step by step:\n\n"
                f"```puppet\n{code}\n```"
            )
        else:
            prompt = (
                "You are an AI agent that converts Puppet or Chef code to a well-structured Ansible playbook.\n\n"
                "Here is the Puppet code:\n"
                f"```puppet\n{code}\n```\n\n"
                "Here is helpful documentation context retrieved from RAG:\n"
                f"{tool_context}\n\n"
                "Generate a valid Ansible playbook in YAML format only. Do not include explanations."
            )

        logging.info(" Final combined prompt:\n%s", prompt)

        # Step 3: Generator agent for playbook or analysis
        generator_agent = Agent(
            self.client,
            model=self.model,
            instructions="You generate playbooks or explain IaC code using helpful context.",
        )
        session_id = generator_agent.create_session(f"convert2ansible-{mode}")
        turn = generator_agent.create_turn(
            messages=[UserMessage(role="user", content=prompt)],
            session_id=session_id,
            stream=stream_ui,
        )

        # Step 4: Return output
        if stream_ui:
            for step in EventLogger().log(turn):
                if hasattr(step, "content"):
                    yield step.content
        else:
            yield turn.output_message.content
