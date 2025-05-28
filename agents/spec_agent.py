# agents/spec_agent.py

import logging
from llama_stack_client.types import UserMessage

logger = logging.getLogger(__name__)

class SpecAgent:
    def __init__(self, base_url, model_id, vector_db_id):
        from llama_stack_client import LlamaStackClient, Agent
        self.client = LlamaStackClient(base_url=base_url)
        self.model_id = model_id
        self.vector_db_id = vector_db_id
        self.agent = Agent(
            client=self.client,
            model=self.model_id,
            instructions=(
                "Given the input code and context, extract a concise, structured technical specification "
                "for the required Ansible playbook. Do not output code—only step-by-step requirements, goals, and constraints."
            )
        )
        logger.info(f"SpecAgent initialized with model: {model_id}")

    def generate_spec(self, code, context=None):
        prompt = (
            f"[CONTEXT]\n{context or ''}\n\n"
            f"[INPUT CODE]\n{code}\n\n"
            f"Extract a technical spec (no code) listing user requirements, conversion goals, and constraints."
        )
        session_id = self.agent.create_session("spec_generation")
        turn = self.agent.create_turn(
            session_id=session_id,
            messages=[UserMessage(role="user", content=prompt)],
            stream=False
        )
        # Always extract .content or .output_message.content
        output = getattr(turn, "output_message", None)
        if output and hasattr(output, "content"):
            result = output.content.strip()
        elif hasattr(turn, "content"):
            result = turn.content.strip()
        else:
            result = str(turn).strip()
        if not result:
            raise RuntimeError("SpecAgent LLM returned empty output")
        return result
