# ai_modules/agentic_model.py
import logging
import os
from llama_stack_client import LlamaStackClient
from llama_stack_client.lib.agents.agent import Agent
from llama_stack_client.lib.agents.event_logger import EventLogger

class AgenticModel:
    def __init__(self, base_url="http://localhost:8321", vector_db="ansible_rules"):
        self.base_url = base_url
        self.vector_db = vector_db
        self.model = "llama3.2:3b"

        logging.info("🔌 Initializing AgenticModel for Chef/Puppet → Ansible conversion")
        logging.info(f"📡 LlamaStack URL: {self.base_url}")
        logging.info(f"🧠 Model: {self.model}")

        self.client = LlamaStackClient(base_url=self.base_url)

        # Check if vector DB exists
        vector_db_ids = [db.provider_resource_id for db in self.client.vector_dbs.list()]
        if self.vector_db not in vector_db_ids:
            self.client.vector_dbs.register(
                vector_db_id=self.vector_db,
                embedding_model="all-MiniLM-L6-v2",
                embedding_dimension=384,
                provider_id="faiss",
            )
            logging.info(f"✅ Registered vector database '{self.vector_db}'.")
        else:
            logging.info(f"✅ Vector database '{self.vector_db}' already exists.")

    def transform(self, code, mode="convert", stream_ui=False):
        logging.info(f"🚀 transform() called with mode='{mode}', stream_ui={stream_ui}")

        instructions = self._load_instructions(mode)

        agent = Agent(
            client=self.client,
            model=self.model,
            instructions=instructions,
            tools=[
                {
                    "name": "builtin::rag",
                    "args": {
                        "vector_db_ids": [self.vector_db],
                        "top_k": 3,
                    }
                }
            ],
            tool_config={"tool_choice": "auto"},
            sampling_params={
                "strategy": {"type": "top_p", "temperature": 0.3, "top_p": 0.9},
                "max_tokens": 2048,
            },
            max_infer_iters=4,
        )

        try:
            session_id = agent.create_session(session_name=f"convert2ansible-{mode}")
            turn = agent.create_turn(
                session_id=session_id,
                messages=[{"role": "user", "content": code}],
                stream=True
            )
        except Exception as e:
            logging.error(f"❌ Error during session or turn creation: {e}")
            yield f"ERROR: {e}"
            return

        output = ""
        for log in EventLogger().log(turn):
            if hasattr(log, "content") and isinstance(log.content, str):
                output += log.content
                if stream_ui:
                    yield log.content

            if hasattr(log, "tool_calls") and log.tool_calls:
                for tool_call in log.tool_calls:
                    if tool_call.get("name") == "builtin::rag":
                        logging.info(f"🔎 Retrieved RAG context: {tool_call.get('arguments', {})}")

            if hasattr(log, "inference") and log.inference:
                logging.info(f"📤 Model inference output (streamed chunk): {log.inference}")

        output = output.strip()

        if not stream_ui:
            logging.info(f"📋 Final complete model output:\n{output}")
            yield output

    def _load_instructions(self, mode):
        """Load prompt instructions from external file based on mode."""
        filename = "tools/analyze_instructions.txt" if mode == "analyze" else "tools/convert_instructions.txt"
        try:
            with open(filename, "r") as f:
                content = f.read().strip()
                logging.info(f"📄 Loaded instructions from {filename}")
                return content
        except Exception as e:
            logging.error(f"❌ Failed to load instructions file {filename}: {e}")
            return "You are a helpful AI assistant."

