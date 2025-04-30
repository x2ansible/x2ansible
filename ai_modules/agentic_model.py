import os
import json
import logging
from pathlib import Path
from uuid import uuid4
from llama_stack_client import LlamaStackClient
from llama_stack_client.lib.agents.agent import Agent
from llama_stack_client.lib.agents.event_logger import EventLogger
from llama_stack_client.types import Document

logger = logging.getLogger("agentic_model")
logger.setLevel(logging.INFO)
log_dir = Path("logs")
log_dir.mkdir(parents=True, exist_ok=True)
log_file = log_dir / "app.log"

file_handler = logging.FileHandler(log_file, encoding="utf-8")
stream_handler = logging.StreamHandler()
formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
file_handler.setFormatter(formatter)
stream_handler.setFormatter(formatter)

if not logger.handlers:
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

class AgenticModel:
    def __init__(self, base_url="http://localhost:8321", vector_db="ansible_rules"):
        self.base_url = base_url
        self.vector_db = vector_db
        self.model = "granite-code:8b"
        self.ingestion_marker = Path(".ingestion_complete")

        logger.info("Initializing AgenticModel for Chef/Puppet → Ansible conversion")
        logger.info(f"LlamaStack URL: {self.base_url}")
        logger.info(f"Model: {self.model}")

        self.client = LlamaStackClient(base_url=self.base_url)
        self._ensure_vector_db()
        if not self.ingestion_marker.exists():
            self._ingest_local_docs()

    def _ensure_vector_db(self):
        vector_db_ids = [db.provider_resource_id for db in self.client.vector_dbs.list()]
        if self.vector_db not in vector_db_ids:
            self.client.vector_dbs.register(
                vector_db_id=self.vector_db,
                embedding_model="all-MiniLM-L6-v2",
                embedding_dimension=384,
                provider_id="faiss",
            )
            logger.info(f"Registered vector database '{self.vector_db}'.")
        else:
            logger.info(f"Vector database '{self.vector_db}' already exists.")

    def _ingest_local_docs(self):
        docs_path = Path("docs")
        documents = []
        if docs_path.exists():
            for md_file in docs_path.rglob("*.md"):
                try:
                    with open(md_file, "r", encoding="utf-8") as f:
                        content = f.read().strip()
                        if content:
                            logger.info(f"Loaded document: {md_file.name}")
                            documents.append(Document(
                                content=content,
                                document_id=str(uuid4()),
                                metadata={"source": str(md_file)}
                            ))
                except Exception as e:
                    logger.warning(f"Failed to load {md_file}: {e}")

            if documents:
                logger.info(f"Inserting {len(documents)} documents into '{self.vector_db}'...")
                self.client.tool_runtime.rag_tool.insert(
                    documents=documents,
                    vector_db_id=self.vector_db,
                    chunk_size_in_tokens=512
                )
                logger.info("RAG ingestion complete.")
                self.ingestion_marker.touch()
            else:
                logger.warning("No valid markdown documents found in './docs'.")
        else:
            logger.warning("'./docs' folder not found. Skipping ingestion.")

    def transform(self, code, mode="convert", stream_ui=False):
        logger.info(f"transform() called with mode='{mode}', stream_ui={stream_ui}")

        instructions = self._load_instructions(mode)
        logger.info(f"Loaded instructions from tools/{mode}_instructions.txt")

        session_prompts = [
            "Retrieve best practices for writing Ansible playbooks.",
            f"Summarize the following Puppet/Chef code in simple englosh explaining what it does in steps?\n\n{code}",
            f"Convert the above understanding and code into a valid Ansible playbook YAML only using the best practises retreived previously."
        ]

        agent = Agent(
            client=self.client,
            model=self.model,
            instructions=instructions,
            tools=[{
                "name": "builtin::rag",
                "args": {
                    "vector_db_ids": [self.vector_db],
                    "top_k": 5
                }
            }],
            tool_config={"tool_choice": "required"},
            sampling_params={
                "strategy": {"type": "top_p", "temperature": 0.3, "top_p": 0.9},
                "max_tokens": 2048,
            },
            max_infer_iters=4,
        )

        try:
            session_id = agent.create_session(session_name=f"convert2ansible-{mode}")
            prompt_index = 0
            full_output = ""
            for prompt in session_prompts:
                logger.info(f"Sending prompt {prompt_index+1}: {prompt}")
                turn = agent.create_turn(
                    session_id=session_id,
                    messages=[{"role": "user", "content": prompt}],
                    stream=True
                )
                content_accum = ""
                for log in EventLogger().log(turn):
                    if hasattr(log, "content") and isinstance(log.content, str):
                        content_accum += log.content
                        if stream_ui and prompt_index == 1 and mode == "analyze":
                            yield log.content
                        if stream_ui and prompt_index == 2 and mode == "convert":
                            yield log.content
                full_output += content_accum
                prompt_index += 1

            if not stream_ui:
                if mode == "convert":
                    yield self._clean_yaml_output(full_output)
                else:
                    yield full_output

        except Exception as e:
            logger.error(f"Agent session or turn creation failed: {e}")
            yield f"ERROR: {e}"

    def _load_instructions(self, mode):
        filename = f"tools/{mode}_instructions.txt"
        try:
            with open(filename, "r", encoding="utf-8") as f:
                return f.read().strip()
        except Exception as e:
            logger.error(f"Failed to load instructions file {filename}: {e}")
            return "You are a helpful assistant."

    def _clean_yaml_output(self, output):
        lines = output.strip().splitlines()
        return "\n".join(
            line for line in lines if not line.strip().startswith("```")
        ).strip()
