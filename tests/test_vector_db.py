# tests/test_vector_db.py

import os
from llama_stack_client import LlamaStackClient
from llama_stack_client.lib.agents.agent import Agent
from llama_stack_client.lib.agents.event_logger import EventLogger

LLS_BASE_URL = os.getenv("LLS_BASE_URL", "http://localhost:8321")
VECTOR_DB_ID = "ansible_rules"
MODEL = "granite-code:8b"  # or whatever you use

def main():
    client = LlamaStackClient(base_url=LLS_BASE_URL)

    print(f"\n📡 Connected to LlamaStack at: {LLS_BASE_URL}")
    print(f"🧠 Using model: {MODEL}")
    print(f"🔍 Testing vector DB: '{VECTOR_DB_ID}'\n")

    agent = Agent(
        client=client,
        model=MODEL,
        instructions="You are a helpful assistant. Always use the RAG tool to retrieve knowledge before answering.",
        tools=[{
            "name": "builtin::rag",
            "args": {
                "vector_db_ids": [VECTOR_DB_ID],
                "top_k": 5
            }
        }],
        tool_config={"tool_choice": "auto"},
    )

    session_id = agent.create_session(session_name="test_rag_session")

    prompt = "Explain Ansible variable naming best practices"

    print(f"📨 User prompt: {prompt}\n")

    try:
        turn = agent.create_turn(
            session_id=session_id,
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )

        print("🔍 RAG Retrieval + Response:\n")
        for log in EventLogger().log(turn):
            log.print()

    except Exception as e:
        print(f" Error: {e}")

if __name__ == "__main__":
    main()
