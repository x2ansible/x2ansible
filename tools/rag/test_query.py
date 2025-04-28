import yaml
from llama_stack_client import LlamaStackClient
from llama_stack_client.lib.models.rag import RAGQueryConfig, QueryGeneratorConfig

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

profile = config["default"]
client = LlamaStackClient(base_url=config["llama_stack"][profile]["base_url"])

query_text = "How should roles be structured in an Ansible playbook?"

# Define query config just like your curl
query_config = RAGQueryConfig(
    query_generator_config=QueryGeneratorConfig(
        type="default",
        separator=" "
    ),
    max_tokens_in_context=4096,
    max_chunks=5
)

response = client.tool_runtime.rag_tool.query(
    content=query_text,
    vector_db_ids=["ansible_docs"],
    query_config=query_config
)

# Print result chunks
print(f"\n🔍 Query: {query_text}\n")
print("Top Results:")
for i, result in enumerate(response.chunk_results, 1):
    metadata = result.metadata or {}
    print(f"{i}. Source: {metadata.get('source', 'unknown')}")
    print(f"   Section: {metadata.get('section_title', 'N/A')}")
    print(f"   Content: {result.chunk[:300].strip()}...\n")
