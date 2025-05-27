# agents/code_generator_agent.py - Fixed for New LlamaStack API

import logging
from llama_stack_client.types import UserMessage

logger = logging.getLogger(__name__)

class CodeGeneratorAgent:
    def __init__(self, base_url, model_id):
        from llama_stack_client import LlamaStackClient, Agent
        self.client = LlamaStackClient(base_url=base_url)
        self.model_id = model_id
        self.agent = Agent(
            client=self.client,
            model=self.model_id,
            instructions=(
                "You are an expert in Ansible. "
                "Given INPUT CODE and CONTEXT, generate a single, production-ready Ansible playbook. "
                "Use YAML comments for any essential explanation. Output only the playbook and comments, nothing else."
            )
        )
        logger.info(f"CodeGeneratorAgent initialized with model: {model_id}")

    def generate(self, input_code, context):
        prompt = (
            f"[CONTEXT]\n{context}\n\n"
            f"[INPUT CODE]\n{input_code}\n\n"
            f"Convert the above into a single production-quality Ansible playbook. Use best practices. Output only YAML."
        )
        try:
            logger.info("🤖 Creating agent session...")
            
            # Create session first (this is the new pattern)
            session_id = self.agent.create_session("code_generation")
            logger.info(f"✅ Session created: {session_id}")
            
            # Create turn with session_id and messages
            logger.info("🔄 Creating turn...")
            turn = self.agent.create_turn(
                session_id=session_id,
                messages=[UserMessage(role="user", content=prompt)],
                stream=False
            )
            logger.info("✅ Turn completed")
            
            # Extract output from turn response
            if hasattr(turn, 'output_message') and hasattr(turn.output_message, 'content'):
                output = turn.output_message.content
            elif hasattr(turn, 'content'):
                output = turn.content
            elif isinstance(turn, str):
                output = turn
            else:
                # Try to extract content from steps if available
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
            
            # Clean and validate output
            if isinstance(output, str):
                output = output.strip()
            else:
                output = str(output).strip()
                
            if not output:
                raise RuntimeError("LLM returned empty output")
                
            logger.info(f"✅ Generated playbook: {len(output)} characters")
            return output
            
        except Exception as e:
            logger.exception(f"❌ Error during playbook generation: {e}")
            
            # More specific error handling
            error_msg = str(e)
            if "session_id" in error_msg:
                logger.error("🔍 Session ID error - LlamaStack API may have changed")
                raise RuntimeError(f"Agent API error (session_id): {e}")
            elif "create_turn" in error_msg:
                logger.error("🔍 Turn creation error")
                raise RuntimeError(f"Agent turn creation failed: {e}")
            else:
                raise RuntimeError(f"Playbook generation failed: {e}")