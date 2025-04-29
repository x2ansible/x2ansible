import logging
import os
import json
import pprint
from pathlib import Path
from uuid import uuid4
from llama_stack_client import LlamaStackClient
from llama_stack_client.lib.agents.agent import Agent
from llama_stack_client.lib.agents.event_logger import EventLogger
from llama_stack_client.types import Document

# ========== Logging Setup ==========
logger = logging.getLogger(__name__)
if not logger.hasHandlers():
    logger.setLevel(logging.INFO)
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    log_file = log_dir / "app.log"

    file_handler = logging.FileHandler(log_file)
    stream_handler = logging.StreamHandler()

    formatter = logging.Formatter("%(asctime)s [%(levelname)s] %(message)s")
    file_handler.setFormatter(formatter)
    stream_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

# ========== AgenticModel Class ==========
class AgenticModel:
    def __init__(self, base_url="http://localhost:8321", vector_db="ansible_rules"):
        self.base_url = base_url
        self.vector_db = vector_db
        self.model = "granite-code:8b"

        logger.info("🔌 Initializing AgenticModel for Chef/Puppet → Ansible conversion")
        logger.info(f"📱 LlamaStack URL: {self.base_url}")
        logger.info(f"🧠 Model: {self.model}")

        self.client = LlamaStackClient(base_url=self.base_url)

        # Register vector DB if needed
        vector_db_ids = [db.provider_resource_id for db in self.client.vector_dbs.list()]
        if self.vector_db not in vector_db_ids:
            self.client.vector_dbs.register(
                vector_db_id=self.vector_db,
                embedding_model="all-MiniLM-L6-v2",
                embedding_dimension=384,
                provider_id="faiss",
            )
            logger.info(f"✅ Registered vector database '{self.vector_db}'.")
        else:
            logger.info(f"✅ Vector database '{self.vector_db}' already exists.")

        # Ingest local .md files from ./docs folder
        docs_path = Path("docs")
        documents = []
        if docs_path.exists():
            for md_file in docs_path.rglob("*.md"):
                try:
                    with open(md_file, "r", encoding="utf-8") as f:
                        content = f.read().strip()
                        if content:
                            logger.info(f"📄 Loaded document: {md_file.name}")
                            documents.append(Document(
                                content=content,
                                document_id=str(uuid4()),
                                metadata={"source": str(md_file)}
                            ))
                except Exception as e:
                    logger.warning(f"⚠️ Failed to load {md_file}: {e}")

            if documents:
                logger.info(f"🌐 Inserting {len(documents)} documents into '{self.vector_db}'...")
                self.client.tool_runtime.rag_tool.insert(
                    documents=documents,
                    vector_db_id=self.vector_db,
                    chunk_size_in_tokens=512
                )
                logger.info("✅ Local RAG ingestion complete.")
            else:
                logger.warning("⚠️ No valid markdown documents found in './docs'.")
        else:
            logger.warning("⚠️ './docs' folder not found. Skipping ingestion.")

    def transform(self, code, mode="convert", stream_ui=False):
        logger.info(f"🚀 transform() called with mode='{mode}', stream_ui={stream_ui}")

        instructions = self._load_instructions(mode)
        logger.debug(f"🗞 Agent Instructions Preview:\n{instructions}")

        agent = Agent(
            client=self.client,
            model=self.model,
            instructions=instructions,
            tools=[
                {
                    "name": "builtin::rag",
                    "args": {
                        "vector_db_ids": [self.vector_db],
                        "top_k": 7,
                    }
                }
            ],
            tool_config={"tool_choice": "required"},
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
            logger.error(f"❌ Error during session or turn creation: {e}")
            yield f"ERROR: {e}"
            return

        output = ""
        rag_contexts = []
        tool_ran = False
        pp = pprint.PrettyPrinter(indent=2)

        for log in EventLogger().log(turn):
            if hasattr(log, "content") and isinstance(log.content, str):
                output += log.content
                if stream_ui:
                    yield log.content

            if hasattr(log, "tool_results") and log.tool_results:
                tool_ran = True
                for tool_result in log.tool_results:
                    if tool_result.get("name") == "builtin::rag":
                        try:
                            rag_result = tool_result.get("result", {})
                            if isinstance(rag_result, str):
                                rag_result = json.loads(rag_result)

                            rag_contexts.append(rag_result)

                            logger.info("📚 RAG Retrieved Context (Preview):")
                            for i, doc in enumerate(rag_result.get("documents", [])):
                                text_preview = doc.get('text', '')[:100]
                                metadata = doc.get('metadata', {})
                                score = doc.get('score', 0)

                                logger.info(f"  Document {i+1}: {text_preview}...")
                                logger.info(f"    Metadata: {json.dumps(metadata)}")
                                logger.info(f"    Score: {score}")
                        except Exception as e:
                            logger.error(f"❌ Error parsing RAG results: {e}")

            if hasattr(log, "inference") and log.inference:
                logger.debug(f"📤 Model inference output (streamed chunk): {log.inference}")

        if not tool_ran:
            logger.warning("⚠️ builtin::rag was NOT triggered. Check if model supports tools or input needs more complexity.")

        if rag_contexts:
            logger.info("=== FULL RAG CONTEXTS RETRIEVED ===")
            for i, context in enumerate(rag_contexts):
                logger.info(f"📖 RAG Context {i+1}:")
                pp.pprint(context)
                logger.info("---")

        output = self._clean_yaml_output(output)

        if not stream_ui:
            logger.info(f"📋 Final complete model output:\n{output}")
            yield output

    def _load_instructions(self, mode):
        filename = "tools/analyze_instructions.txt" if mode == "analyze" else "tools/convert_instructions.txt"
        try:
            with open(filename, "r") as f:
                content = f.read().strip()
                logger.info(f"📄 Loaded instructions from {filename}")
                return content
        except Exception as e:
            logger.error(f"❌ Failed to load instructions file {filename}: {e}")
            return "You are a helpful AI assistant."

    def _clean_yaml_output(self, output: str) -> str:
        lines = output.strip().splitlines()
        cleaned = []
        for line in lines:
            if line.strip().startswith("```yaml") or line.strip() == "```":
                continue
            cleaned.append(line)
        return "\n".join(cleaned).strip()