import logging
from llama_stack_client import Agent
from llama_stack_client.types import UserMessage

logger = logging.getLogger("ContextAgent")
logging.basicConfig(level=logging.INFO)


class ContextAgent:
    def __init__(self, client, model, vector_db):
        self.client = client
        self.model = model
        self.vector_db = vector_db

    def retrieve_context(self, query: str) -> str:
        logger.info("📚 Running ContextAgent.retrieve_context")

        agent = Agent(
            client=self.client,
            model=self.model,
            instructions="You retrieve relevant documentation using RAG for this query.",
            tools=[{
                "name": "builtin::rag/knowledge_search",
                "args": {
                    "vector_db_ids": [self.vector_db],
                    "top_k": 5
                }
            }],
        )

        session_id = agent.create_session("context_retrieval")
        turn = agent.create_turn(
            session_id=session_id,
            messages=[UserMessage(role="user", content=query)],
            stream=False
        )

        step = next((s for s in turn.steps if s.step_type == "tool_execution"), None)
        if step and step.tool_responses:
            context = step.tool_responses[0].content
            logger.info(f"✅ Retrieved context length: {len(context)} characters")
            return context

        logger.warning("⚠️ No relevant context found via RAG")
        return ""
