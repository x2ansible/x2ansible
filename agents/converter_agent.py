import logging
from llama_stack_client import Agent
from llama_stack_client.types import UserMessage

logger = logging.getLogger("ConverterAgent")
logging.basicConfig(level=logging.INFO)


class ConverterAgent:
    def __init__(self, client, model):
        self.client = client
        self.model = model

    def convert(self, code: str, context: str) -> str:
        logger.info("🔁 Running ConverterAgent.convert")

        prompt = (
            "You are an AI agent that converts Puppet or Chef code to Ansible YAML.\n\n"
            f"Here is the IaC snippet:\n```puppet\n{code}\n```\n\n"
            f"Context from documentation:\n{context}\n\n"
            "Strict output rules:\n"
            "- Output only valid Ansible YAML. No explanations, no Markdown.\n"
            "- Use `ansible.builtin.` module paths.\n"
            "- Begin output with `---`.\n"
            "- Do not use `vars:` inside tasks.\n"
            "- Avoid duplicate tasks and ensure `ansible-lint` passes."
        )

        agent = Agent(
            client=self.client,
            model=self.model,
            instructions="Generate clean, valid Ansible YAML based on input and documentation context."
        )

        session_id = agent.create_session("convert")
        turn = agent.create_turn(
            session_id=session_id,
            messages=[UserMessage(role="user", content=prompt)],
            stream=False
        )

        result = turn.output_message.content.strip()
        logger.info(f"✅ Conversion complete. Length: {len(result)} characters")
        return result
