import os
import uuid
from llama_stack_client import LlamaStackClient, Agent
from llama_stack_client import RAGDocument

# Connect to local LlamaStack server
client = LlamaStackClient(base_url="http://localhost:8321")

MODEL_ID = "llama3.2:3b"

# === Agent Factory Functions ===

def get_vanilla_agent():
    return Agent(
        client,
        model=MODEL_ID,
        instructions="You are a helpful assistant.",
    )

def get_billing_agent():
    return Agent(
        client,
        model=MODEL_ID,
        instructions="You are a billing support agent. Answer questions related to invoices and overcharges with empathy and detail.",
    )

def get_tech_support_agent():
    return Agent(
        client,
        model=MODEL_ID,
        instructions="You are a technical support engineer helping users with software installation and network setup issues.",
    )

def get_routing_agent(agent_type="billing"):
    if agent_type == "billing":
        return get_billing_agent()
    return get_tech_support_agent()

def get_orchestrator_agent():
    return Agent(
        client,
        model=MODEL_ID,
        instructions="You are an orchestrator agent that generates Ansible playbooks by routing requests, invoking tools, and validating results.",
    )

def get_rag_agent(vector_db_id, top_k=3):
    return Agent(
        client,
        model=MODEL_ID,
        instructions="Use retrieved knowledge base context to answer precisely and clearly.",
        tools=[{
            "name": "builtin::rag/knowledge_search",
            "args": {
                "vector_db_ids": [vector_db_id],
                "top_k": top_k
            }
        }]
    )

def ingest_docs_for_rag(vector_db_id, doc_paths, embedding_model, embedding_dim, provider_id="faiss"):
    client.vector_dbs.register(
        vector_db_id=vector_db_id,
        embedding_model=embedding_model,
        embedding_dimension=embedding_dim,
        provider_id=provider_id,
    )

    documents = [
        RAGDocument(
            document_id=str(uuid.uuid4()),
            content=open(path).read(),
            mime_type="text/plain"
        ) for path in doc_paths if os.path.exists(path)
    ]
    if documents:
        client.tool_runtime.rag_tool.insert(
            documents=documents,
            vector_db_id=vector_db_id,
            chunk_size_in_tokens=512
        )

# === Routing Map Subagents ===

routing_map = {
    "billing": get_billing_agent(),
    "technical": Agent(
        client, model=MODEL_ID,
        instructions="You provide technical support for networking, servers, and bugs."
    ),
    "account": Agent(
        client, model=MODEL_ID,
        instructions="You help users manage their account settings, subscriptions, and billing info."
    ),
    "product": Agent(
        client, model=MODEL_ID,
        instructions="You assist users with product roadmap, feature questions, and demos."
    )
}

# === Fixed Named Agents for Orchestration Chain ===

worker_agent = Agent(
    client,
    model=MODEL_ID,
    instructions="You refine infrastructure tasks into clear, structured steps."
)

generator_agent = Agent(
    client,
    model=MODEL_ID,
    instructions="Generate an Ansible playbook based on the input task description."
)

evaluator_agent = Agent(
    client,
    model=MODEL_ID,
    instructions="Evaluate whether the provided playbook is secure, efficient, and correct."
)

# === Exported Symbols ===

__all__ = [
    "client",
    "MODEL_ID",
    "get_vanilla_agent",
    "get_routing_agent",
    "get_orchestrator_agent",
    "get_rag_agent",
    "ingest_docs_for_rag",
    "routing_map",
    "worker_agent",
    "generator_agent",
    "evaluator_agent"
]
