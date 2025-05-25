import logging
from llama_stack_client import Agent
from llama_stack_client.types import UserMessage
from utils.utils import step_printer    # ← fixed import

logger = logging.getLogger("ClassifierAgent")

class ClassifierAgent:
    def __init__(self, client, model):
        self.client = client
        self.model = model

    def classify(self, code: str) -> str:
        logger.info("📦 Running ClassifierAgent.classify")
        agent = Agent(
            client=self.client,
            model=self.model,
            instructions=(
                "Classify the Infrastructure-as-Code (IaC) snippet by its tool type "
                "(e.g., Puppet, Chef, Terraform, etc.)."
            )
        )
        session_id = agent.create_session("classify")
        turn = agent.create_turn(
            session_id=session_id,
            messages=[UserMessage(role="user", content=code)],
            stream=False
        )

        # now you can pretty-print the internal LlamaStack steps:
        step_printer(turn.steps)

        result = turn.output_message.content.strip()
        logger.info(f"✅ Classification result: {result}")
        return result
