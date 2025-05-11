import os
import uuid
import json
import yaml
import logging
from pathlib import Path

from llama_stack_client import LlamaStackClient, Agent, RAGDocument
from llama_stack_client.types import UserMessage
from llama_stack_client.lib.agents.event_logger import EventLogger

# === Config Loader ===
def load_config(path="config.yaml"):
    if Path(path).exists():
        with open(path, "r") as f:
            return yaml.safe_load(f)
    return {}

# === Agentic Model ===
class AgenticModel:
    def __init__(self, config_path="config.yaml"):
        self.config = load_config(config_path)

        # LlamaStack
        self.base_url = self.config.get("llama_stack", {}).get("base_url", "http://localhost:8321")
        self.model = self.config.get("llama_stack", {}).get("model", "llama3.2:3b")

        # Vector DB
        self.vector_db = self.config.get("vector_db", {}).get("id", "iac")
        self.embedding_model = self.config.get("vector_db", {}).get("embedding_model", "all-MiniLM-L6-v2")
        self.embedding_dim = self.config.get("vector_db", {}).get("embedding_dim", 384)
        self.chunk_size = self.config.get("vector_db", {}).get("chunk_size", 512)

        # Docs
        self.docs_dir = Path(self.config.get("docs_folder", "docs"))

        # Logging
        self._setup_logging()

        # LlamaStack Client
        self.client = LlamaStackClient(base_url=self.base_url)

        # State flags
        self._vector_db_ensured = False
        self._ingested = False

    def _setup_logging(self):
        log_cfg = self.config.get("logging", {})
        log_level = getattr(logging, log_cfg.get("level", "INFO"))
        log_dir = Path(log_cfg.get("log_dir", "logs"))

        # Console handler is always active
        root_logger = logging.getLogger()
        root_logger.setLevel(log_level)

        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        root_logger.addHandler(console_handler)

        # Try to create file log handlers if permitted
        try:
            log_dir.mkdir(parents=True, exist_ok=True)

            file_handler = logging.FileHandler(log_dir / log_cfg.get("file", "agentic_model.log"))
            file_handler.setLevel(log_level)
            file_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
            root_logger.addHandler(file_handler)

            app_log_handler = logging.FileHandler(log_dir / log_cfg.get("app_log", "app.log"))
            app_log_handler.setLevel(log_level)
            app_log_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
            root_logger.addHandler(app_log_handler)

        except PermissionError as e:
            root_logger.warning(f"⚠️ File logging disabled due to permission error: {e}")

    def _ensure_vector_db(self):
        logging.info("🔁 Ensuring vector DB exists")
        existing = [db.provider_resource_id for db in self.client.vector_dbs.list()]
        if self.vector_db not in existing:
            self.client.vector_dbs.register(
                vector_db_id=self.vector_db,
                embedding_model=self.embedding_model,
                embedding_dimension=self.embedding_dim,
                provider_id="faiss",
            )
            logging.info(f"✅ Registered vector DB: {self.vector_db}")
        else:
            logging.info(f"ℹ️ Vector DB '{self.vector_db}' already exists.")

    def _ingest_documents(self):
        logging.info("📅 Running document ingestion")
        folder = self.docs_dir / self.vector_db
        if not folder.exists():
            logging.warning(f"⚠️ Docs folder '{folder}' not found. Skipping ingestion.")
            return

        documents = []
        for file in folder.rglob("*"):
            if file.suffix.lower() in {".jsonl", ".md", ".txt", ".adoc", ".yaml", ".yml"}:
                try:
                    if file.suffix == ".jsonl":
                        with open(file, "r", encoding="utf-8") as f:
                            for line in f:
                                obj = json.loads(line)
                                documents.append(RAGDocument(
                                    document_id=str(uuid.uuid4()),
                                    content=obj["text"],
                                    metadata=obj.get("metadata", {"filename": file.name}),
                                    mime_type="text/plain"
                                ))
                    else:
                        content = file.read_text(encoding="utf-8")
                        documents.append(RAGDocument(
                            document_id=str(uuid.uuid4()),
                            content=content,
                            metadata={"filename": file.name},
                            mime_type="text/plain"
                        ))
                    logging.info(f"📄 Prepared: {file}")
                except Exception as e:
                    logging.warning(f"⚠️ Skipped {file.name}: {e}")

        if documents:
            self.client.tool_runtime.rag_tool.insert(
                documents=documents,
                vector_db_id=self.vector_db,
                chunk_size_in_tokens=self.chunk_size,
            )
            logging.info(f"📦 Ingested {len(documents)} document(s) into '{self.vector_db}'")
        else:
            logging.info("📬 No documents found to ingest.")

    def transform(self, code, mode="convert", stream_ui=False):
        if not self._vector_db_ensured:
            self._ensure_vector_db()
            self._vector_db_ensured = True
        if not self._ingested:
            self._ingest_documents()
            self._ingested = True

        logging.info(f"▶️ Running AgenticModel.transform with mode={mode}")

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
            messages=[UserMessage(role="user", content="Infrastructure-as-code resource definition")],
            session_id=rag_session_id,
            stream=False
        )
        tool_step = next((s for s in rag_turn.steps if s.step_type == "tool_execution"), None)
        tool_context = tool_step.tool_responses[0].content if tool_step else ""

        logging.info("🧠 RAG Context:")
        if isinstance(tool_context, list):
            for i, item in enumerate(tool_context):
                logging.info(f"Chunk {i+1}: {getattr(item, 'text', str(item))}")
        else:
            logging.info(tool_context)

        fenced_code = f"```puppet\n{code}\n```"

        if mode == "analyze":
            prompt = (
                "You are an AI analyst.\n"
                "Explain in clear English what the following Infrastructure-as-code does step by step:\n\n"
                f"{fenced_code}"
            )
        else:
            prompt = (
                "You are an AI agent that converts Puppet or Chef code to a well-structured Ansible playbook.\n\n"
                "Here is the IaC snippet:\n"
                f"{fenced_code}\n\n"
                "Here is helpful documentation context retrieved from RAG:\n"
                f"{tool_context}\n\n"
                "Strict output rules:\n"
                "- Output only valid Ansible YAML. No explanations, Markdown, code blocks, or preambles.\n"
                "- Start output with `---`.\n"
                "- Use `ansible.builtin.` prefixes for all modules.\n"
                "- Use `.j2` extension and Jinja2 syntax — never `.erb`.\n"
                "- Do **not** use `vars:` inside tasks. Define variables only in the play-level `vars:` block.\n"
                "- Never put `vars:` under `template:` or other modules — this is invalid.\n"
                "- Avoid repeating the same task. Do not include duplicate `service:` or `package:` operations.\n"
                "- Ensure output is minimal, idempotent, and functional.\n"
                "- The YAML output must pass `ansible-lint` without errors.\n"
            )

        logging.info("\ud83d\udce4 Final prompt:\n%s", prompt)

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

        if stream_ui:
            for step in EventLogger().log(turn):
                if hasattr(step, "content"):
                    yield step.content
        else:
            yield turn.output_message.content
import os
import uuid
import json
import yaml
import logging
from pathlib import Path

from llama_stack_client import LlamaStackClient, Agent, RAGDocument
from llama_stack_client.types import UserMessage
from llama_stack_client.lib.agents.event_logger import EventLogger

# === Config Loader ===
def load_config(path="config.yaml"):
    if Path(path).exists():
        with open(path, "r") as f:
            return yaml.safe_load(f)
    return {}

# === Agentic Model ===
class AgenticModel:
    def __init__(self, config_path="config.yaml"):
        self.config = load_config(config_path)

        # LlamaStack
        self.base_url = self.config.get("llama_stack", {}).get("base_url", "http://localhost:8321")
        self.model = self.config.get("llama_stack", {}).get("model", "llama3.2:3b")

        # Vector DB
        self.vector_db = self.config.get("vector_db", {}).get("id", "iac")
        self.embedding_model = self.config.get("vector_db", {}).get("embedding_model", "all-MiniLM-L6-v2")
        self.embedding_dim = self.config.get("vector_db", {}).get("embedding_dim", 384)
        self.chunk_size = self.config.get("vector_db", {}).get("chunk_size", 512)

        # Docs
        self.docs_dir = Path(self.config.get("docs_folder", "docs"))

        # Logging
        self._setup_logging()

        # LlamaStack Client
        self.client = LlamaStackClient(base_url=self.base_url)

        # State flags
        self._vector_db_ensured = False
        self._ingested = False

    def _setup_logging(self):
        log_cfg = self.config.get("logging", {})
        log_level = getattr(logging, log_cfg.get("level", "INFO"))
        log_dir = Path(log_cfg.get("log_dir", "/tmp/logs"))  # default to safe /tmp

        root_logger = logging.getLogger()
        root_logger.setLevel(log_level)

        # Console logs always
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
        root_logger.addHandler(console_handler)

        # Try to add file logging
        try:
            log_dir.mkdir(parents=True, exist_ok=True)

            file_log_path = log_dir / log_cfg.get("file", "agentic_model.log")
            fh = logging.FileHandler(file_log_path)
            fh.setLevel(log_level)
            fh.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
            root_logger.addHandler(fh)

            app_log_path = log_dir / log_cfg.get("app_log", "app.log")
            af = logging.FileHandler(app_log_path)
            af.setLevel(log_level)
            af.setFormatter(logging.Formatter("%(asctime)s [%(levelname)s] %(message)s"))
            root_logger.addHandler(af)

        except PermissionError as e:
            root_logger.warning(f"⚠️ File logging skipped (PermissionError): {e}")

    def _ensure_vector_db(self):
        logging.info("🔁 Ensuring vector DB exists")
        existing = [db.provider_resource_id for db in self.client.vector_dbs.list()]
        if self.vector_db not in existing:
            self.client.vector_dbs.register(
                vector_db_id=self.vector_db,
                embedding_model=self.embedding_model,
                embedding_dimension=self.embedding_dim,
                provider_id="faiss",
            )
            logging.info(f"✅ Registered vector DB: {self.vector_db}")
        else:
            logging.info(f"ℹ️ Vector DB '{self.vector_db}' already exists.")

    def _ingest_documents(self):
        logging.info("📥 Running document ingestion")
        folder = self.docs_dir / self.vector_db
        if not folder.exists():
            logging.warning(f"⚠️ Docs folder '{folder}' not found. Skipping ingestion.")
            return

        documents = []
        for file in folder.rglob("*"):
            if file.suffix.lower() in {".jsonl", ".md", ".txt", ".adoc", ".yaml", ".yml"}:
                try:
                    if file.suffix == ".jsonl":
                        with open(file, "r", encoding="utf-8") as f:
                            for line in f:
                                obj = json.loads(line)
                                documents.append(RAGDocument(
                                    document_id=str(uuid.uuid4()),
                                    content=obj["text"],
                                    metadata=obj.get("metadata", {"filename": file.name}),
                                    mime_type="text/plain"
                                ))
                    else:
                        content = file.read_text(encoding="utf-8")
                        documents.append(RAGDocument(
                            document_id=str(uuid.uuid4()),
                            content=content,
                            metadata={"filename": file.name},
                            mime_type="text/plain"
                        ))
                    logging.info(f"📄 Prepared: {file}")
                except Exception as e:
                    logging.warning(f"⚠️ Skipped {file.name}: {e}")

        if documents:
            self.client.tool_runtime.rag_tool.insert(
                documents=documents,
                vector_db_id=self.vector_db,
                chunk_size_in_tokens=self.chunk_size,
            )
            logging.info(f"📦 Ingested {len(documents)} document(s) into '{self.vector_db}'")
        else:
            logging.info("📭 No documents found to ingest.")

    def transform(self, code, mode="convert", stream_ui=False):
        if not self._vector_db_ensured:
            self._ensure_vector_db()
            self._vector_db_ensured = True
        if not self._ingested:
            self._ingest_documents()
            self._ingested = True

        logging.info(f"▶️ Running AgenticModel.transform with mode={mode}")

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
            messages=[UserMessage(role="user", content="Infrastructure-as-code resource definition")],
            session_id=rag_session_id,
            stream=False
        )
        tool_step = next((s for s in rag_turn.steps if s.step_type == "tool_execution"), None)
        tool_context = tool_step.tool_responses[0].content if tool_step else ""

        logging.info("🧠 RAG Context:")
        if isinstance(tool_context, list):
            for i, item in enumerate(tool_context):
                logging.info(f"Chunk {i+1}: {getattr(item, 'text', str(item))}")
        else:
            logging.info(tool_context)

        fenced_code = f"```puppet\n{code}\n```"

        if mode == "analyze":
            prompt = (
                "You are an AI analyst.\n"
                "Explain in clear English what the following Infrastructure-as-code does step by step:\n\n"
                f"{fenced_code}"
            )
        else:
            prompt = (
                "You are an AI agent that converts Puppet or Chef code to a well-structured Ansible playbook.\n\n"
                "Here is the IaC snippet:\n"
                f"{fenced_code}\n\n"
                "Here is helpful documentation context retrieved from RAG:\n"
                f"{tool_context}\n\n"
                "Strict output rules:\n"
                "- Output only valid Ansible YAML. No explanations, Markdown, code blocks, or preambles.\n"
                "- Start output with `---`.\n"
                "- Use `ansible.builtin.` prefixes for all modules.\n"
                "- Use `.j2` extension and Jinja2 syntax — never `.erb`.\n"
                "- Do **not** use `vars:` inside tasks. Define variables only in the play-level `vars:` block.\n"
                "- Never put `vars:` under `template:` or other modules — this is invalid.\n"
                "- Avoid repeating the same task. Do not include duplicate `service:` or `package:` operations.\n"
                "- Ensure output is minimal, idempotent, and functional.\n"
                "- The YAML output must pass `ansible-lint` without errors.\n"
            )

        logging.info("📤 Final prompt:\n%s", prompt)

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

        if stream_ui:
            for step in EventLogger().log(turn):
                if hasattr(step, "content"):
                    yield step.content
        else:
            yield turn.output_message.content
