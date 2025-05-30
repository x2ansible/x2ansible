import logging
import re
from llama_stack_client.types import UserMessage
from config.agent_config import get_agent_instructions, get_config

logger = logging.getLogger(__name__)

def _clean_playbook_output(output: str) -> str:
    # ... [same as your current function, unchanged] ...
    output = re.sub(r"(?m)^(```+|~~~+)[\w\-]*\n?", '', output)
    output = output.strip()
    if output.startswith("'''") and output.endswith("'''"):
        output = output[3:-3].strip()
    elif output.startswith('"""') and output.endswith('"""'):
        output = output[3:-3].strip()
    elif output.startswith("'") and output.endswith("'") and output.count('\n') > 1:
        output = output[1:-1].strip()
    elif output.startswith('"') and output.endswith('"') and output.count('\n') > 1:
        output = output[1:-1].strip()
    output = output.replace('\\n', '\n').replace('\\t', '\t')
    output = re.sub(r"^('?-{3,}'?\n)+", '', output)
    output = '---\n' + output.lstrip()
    output = output.rstrip() + '\n'
    return output

class CodeGeneratorAgent:
    def __init__(self, base_url, model_id, timeout=30):
        # LlamaStack client and agent setup
        from llama_stack_client import LlamaStackClient, Agent
        self.client = LlamaStackClient(base_url=base_url)
        self.model_id = model_id
        self.timeout = timeout
        self.config = get_config()
        self.agent_id = "code_generator"

        self._initialize_agent()
        self._last_instructions_hash = hash(self._get_current_instructions())

        logger.info(f"CodeGeneratorAgent initialized with model: {model_id}")

    def _get_current_instructions(self):
        instructions = get_agent_instructions(self.agent_id)
        if not instructions:
            logger.warning("No instructions found in config, using fallback.")
            return self._get_fallback_instructions()
        return instructions

    def _get_fallback_instructions(self):
        return (
            "You are an expert in Ansible. "
            "Given INPUT CODE and CONTEXT, generate a single, production-ready Ansible playbook. "
            "Use YAML comments for any essential explanation. "
            "Output only the playbook and YAML comments—"
            "do NOT use Markdown code blocks or code fences (e.g., no triple backticks). "
            "Your response must start with '---' and contain no extra blank lines at the start or end."
        )

    def _initialize_agent(self):
        from llama_stack_client import Agent
        current_instructions = self._get_current_instructions()
        self.agent = Agent(
            client=self.client,
            model=self.model_id,
            instructions=current_instructions
        )

    def _check_and_reload_config(self):
        try:
            current_instructions = self._get_current_instructions()
            current_hash = hash(current_instructions)
            if current_hash != self._last_instructions_hash:
                logger.info("CodeGeneratorAgent instructions changed, reloading agent.")
                self._initialize_agent()
                self._last_instructions_hash = current_hash
        except Exception as e:
            logger.error(f"Failed to check/reload config: {e}")

    def generate(self, input_code, context):
        self._check_and_reload_config()
        prompt = (
            f"[CONTEXT]\n{context}\n\n"
            f"[INPUT CODE]\n{input_code}\n\n"
            "Convert the above into a single production-quality Ansible playbook. "
            "Output only the YAML (no Markdown, no code fences, no extra document markers). "
            "Start with '---'."
        )
        try:
            logger.info("🤖 Creating agent session...")
            session_id = self.agent.create_session("code_generation")
            logger.info(f"✅ Session created: {session_id}")
            logger.info("🔄 Creating turn...")
            turn = self.agent.create_turn(
                session_id=session_id,
                messages=[UserMessage(role="user", content=prompt)],
                stream=False
            )
            logger.info("✅ Turn completed")

            # Extract output from turn (robust against all response types)
            if hasattr(turn, 'output_message') and hasattr(turn.output_message, 'content'):
                output = turn.output_message.content
            elif hasattr(turn, 'content'):
                output = turn.content
            elif isinstance(turn, str):
                output = turn
            else:
                if hasattr(turn, 'steps') and turn.steps:
                    output = ""
                    for step in turn.steps:
                        if hasattr(step, 'content'):
                            output += str(step.content)
                        elif hasattr(step, 'output'):
                            output += str(step.output)
                    if not output.strip():
                        output = str(turn)
                else:
                    output = str(turn)

            if isinstance(output, str):
                output = output.strip()
            else:
                output = str(output).strip()

            # Clean with robust function
            output = _clean_playbook_output(output)

            if not output:
                raise RuntimeError("LLM returned empty output")
            logger.info(f"✅ Generated playbook: {len(output)} characters")
            logger.info(f"📄 Preview (first 10 lines):\n" + "\n".join(output.splitlines()[:10]))
            return output

        except Exception as e:
            logger.exception(f"❌ Error during playbook generation: {e}")
            error_msg = str(e)
            if "session_id" in error_msg:
                logger.error("🔍 Session ID error - LlamaStack API may have changed")
                raise RuntimeError(f"Agent API error (session_id): {e}")
            elif "create_turn" in error_msg:
                logger.error("🔍 Turn creation error")
                raise RuntimeError(f"Agent turn creation failed: {e}")
            else:
                raise RuntimeError(f"Playbook generation failed: {e}")
