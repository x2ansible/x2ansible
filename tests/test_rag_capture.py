import os
import uuid
import logging
from pathlib import Path

from llama_stack_client import LlamaStackClient, Agent
from llama_stack_client.types import UserMessage
from llama_stack_client import RAGDocument
from llama_stack_client.lib.agents.event_logger import EventLogger

# === Setup Logging ===
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)
logging.basicConfig(
    filename=log_dir / "rag_test.log",
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
console = logging.StreamHandler()
console.setLevel(logging.INFO)
logging.getLogger().addHandler(console)

# === Config ===
BASE_URL = "http://localhost:8321"
VECTOR_DB_ID = "puppet_docs"
EMBEDDING_MODEL = "all-MiniLM-L6-v2"
EMBEDDING_DIM = 384
MOCK_DOC_PATHS = [
    "tests/mock_docs/puppet_file_resource.txt",
    "tests/mock_docs/puppet_template_usage.txt",
]
UPLOAD_CODE_FILE = "uploads/apache_firewall.pp"

# === Step 1: Ingest Mock Docs into RAG DB ===
client = LlamaStackClient(base_url=BASE_URL)

try:
    client.vector_dbs.register(
        vector_db_id=VECTOR_DB_ID,
        embedding_model=EMBEDDING_MODEL,
        embedding_dimension=EMBEDDING_DIM,
        provider_id="faiss"
    )
except Exception as e:
    logging.warning(f"⚠️ Vector DB may already exist: {e}")

documents = []
for path in MOCK_DOC_PATHS:
    if os.path.exists(path):
        documents.append(
            RAGDocument(
                document_id=str(uuid.uuid4()),
                content=open(path).read(),
                mime_type="text/plain"
            )
        )

if documents:
    client.tool_runtime.rag_tool.insert(
        documents=documents,
        vector_db_id=VECTOR_DB_ID,
        chunk_size_in_tokens=512
    )
    logging.info(f"✅ Ingested mock docs into vector DB: {VECTOR_DB_ID}")
else:
    logging.warning("⚠️ No mock documents found to ingest.")

# === Step 2: Load Puppet Code from Uploads ===
if not os.path.exists(UPLOAD_CODE_FILE):
    raise FileNotFoundError(f"❌ File not found: {UPLOAD_CODE_FILE}")
with open(UPLOAD_CODE_FILE, "r") as f:
    puppet_code = f.read().strip()

# === Step 3: RAG agent to retrieve context ===
rag_agent = Agent(
    client,
    model="llama3.2:3b",
    instructions="Use the RAG tool to fetch context for infrastructure-as-code concepts.",
    tools=[{
        "name": "builtin::rag/knowledge_search",
        "args": {
            "vector_db_ids": [VECTOR_DB_ID],
            "top_k": 5
        }
    }]
)

rag_session_id = rag_agent.create_session("puppet_rag_enrichment")

rag_turn = rag_agent.create_turn(
    messages=[UserMessage(role="user", content="Puppet file resource")],
    session_id=rag_session_id,
    stream=False
)

tool_step = next((s for s in rag_turn.steps if s.step_type == "tool_execution"), None)
tool_context = tool_step.tool_responses[0].content if tool_step else ""

print("\n📄 Retrieved RAG Context (pretty):\n")
try:
    from rich import print as rprint
    for i, item in enumerate(tool_context):
        rprint(f"[bold green]Chunk {i+1}:[/bold green] {item.text.strip()}\n")
except Exception:
    print("🔧 Could not pretty print RAG context. Raw output follows:")
    print(tool_context)


# === Step 4: Use RAG context + Puppet code for playbook generation ===
conversion_prompt = (
    "You are an AI agent that converts Puppet code into well-structured Ansible playbooks.\n\n"
    "Here is the Puppet code:\n"
    "```puppet\n"
    f"{puppet_code}\n"
    "```\n\n"
    "Here is helpful documentation context retrieved from RAG:\n"
    f"{tool_context}\n\n"
    "Generate a valid Ansible playbook in YAML format only. Do not include explanations."
)

generator_agent = Agent(
    client,
    model="llama3.2:3b",
    instructions="You generate Ansible playbooks from Puppet or Chef using helpful context.",
)

convert_session_id = generator_agent.create_session("puppet_to_ansible")

final_turn = generator_agent.create_turn(
    messages=[UserMessage(role="user", content=conversion_prompt)],
    session_id=convert_session_id,
    stream=False
)
logging.info(f"🧠 Using combined prompt:\n{conversion_prompt}")
print("\n📦 Generated Ansible Playbook:\n")
print(final_turn.output_message.content)
