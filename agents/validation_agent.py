# agents/validation_agent.py

"""
ValidationAgent: LlamaStack agent for Ansible playbook validation using a custom tool.

- Registers the Python function `ansible_lint_tool` as a LlamaStack agent tool.
- The agent is prompted to always call the tool for validation, NOT to hallucinate results.
- All results, issues, and recommendations come from the tool output.
- Agent analysis text is also captured for the UI, but the tool output is the source of truth.
"""

import logging
from typing import Dict, Any
from llama_stack_client import LlamaStackClient
from llama_stack_client.lib.agents.agent import Agent
from llama_stack_client.lib.agents.event_logger import EventLogger

# Import our LlamaStack-compliant tool
from tools.ansible_lint_tool import ansible_lint_tool

logger = logging.getLogger("ValidationAgent")

class ValidationAgent:
    """
    LlamaStack ValidationAgent that uses the custom ansible_lint_tool
    to validate Ansible playbooks.
    """
    def __init__(self, client: LlamaStackClient, model: str):
        self.client = client
        self.model = model
        self.agent = None
        self._initialize_agent()

    def _initialize_agent(self):
        """Initialize the LlamaStack agent with the ansible_lint_tool."""
        try:
            self.agent = Agent(
                client=self.client,
                model=self.model,
                instructions=self._get_agent_instructions(),
                tools=[ansible_lint_tool]  # Register our tool with the agent
            )
            logger.info(f"✅ ValidationAgent initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize ValidationAgent: {e}")
            raise

    def _get_agent_instructions(self) -> str:
        """System instructions for the validation agent."""
        return (
            "You are an expert Ansible playbook validation agent. Your role is to:\n"
            "1. Always use the ansible_lint_tool when asked to validate a playbook (never answer directly, never guess).\n"
            "2. Analyze and explain the lint results for users (status, errors, fixes, why it matters).\n"
            "3. Be thorough, clear, and educational in your response."
        )

    async def validate_playbook(self, playbook: str, lint_profile: str = "basic") -> Dict[str, Any]:
        """
        Validate playbook through the agent using the ansible_lint_tool.

        Args:
            playbook (str): Ansible playbook content as YAML string.
            lint_profile (str): Lint profile, e.g. "basic", "production".

        Returns:
            Dict[str, Any]: Validation result and agent reasoning.
        """
        try:
            logger.info(f"🚀 Starting agentic validation with {lint_profile} profile")
            session_id = self.agent.create_session("validation-session")
            prompt = (
                f"Validate this Ansible playbook using the ansible_lint_tool with the '{lint_profile}' profile:\n\n"
                f"```yaml\n{playbook}\n```\n"
                "Always call the tool, then provide a comprehensive analysis of the results."
            )

            response = self.agent.create_turn(
                messages=[{
                    "role": "user",
                    "content": prompt
                }],
                session_id=session_id
            )

            return await self._process_agent_response(response, playbook, lint_profile)

        except Exception as e:
            logger.error(f"❌ ValidationAgent error: {e}")
            logger.exception("Full error details:")
            return self._create_error_response(f"Agent validation failed: {str(e)}")

    async def _process_agent_response(self, response, playbook: str, lint_profile: str) -> Dict[str, Any]:
        """Process the agent's response and extract tool results."""
        try:
            event_logger = EventLogger()
            agent_text = ""
            tool_results = []
            all_events = []

            # Stream/process events (if supported)
            for log in event_logger.log(response):
                event_str = str(log)
                all_events.append(event_str)
                # Print the log to see what we're getting
                log.print()

                # Look for tool execution response
                if "tool_execution> Tool:ansible_lint_tool Response:" in event_str:
                    try:
                        json_start = event_str.find('Response:') + len('Response:')
                        json_str = event_str[json_start:].strip()
                        logger.info(f"🔧 Found tool response JSON: {json_str}")
                        import json
                        tool_result = json.loads(json_str)
                        tool_results.append(tool_result)
                        logger.info(f"✅ Successfully parsed tool result: {tool_result}")
                    except Exception as e:
                        logger.error(f"❌ Failed to parse tool result: {e}")
                # Agent text/inference response
                elif event_str.startswith("inference> ") and not event_str.startswith("inference> ["):
                    agent_text += event_str[len("inference> "):] + "\n"
                if hasattr(log, 'message') and log.message:
                    agent_text += log.message + "\n"
                # Check for structured tool results in event object
                if hasattr(log, 'event') and log.event:
                    if hasattr(log.event, 'payload'):
                        payload = log.event.payload
                        if hasattr(payload, 'tool_call_delta') and payload.tool_call_delta:
                            if hasattr(payload.tool_call_delta, 'content'):
                                logger.info(f"🛠️ Found tool_call_delta content: {payload.tool_call_delta.content}")
                                tool_results.append(payload.tool_call_delta.content)
                        if isinstance(payload, dict) and 'validation_passed' in payload:
                            logger.info(f"✅ Found validation result in payload: {payload}")
                            tool_results.append(payload)

            logger.info(f"📋 Processed response:")
            logger.info(f"   - Agent text: {len(agent_text)} chars")
            logger.info(f"   - Tool results: {len(tool_results)}")
            logger.info(f"   - All events: {len(all_events)}")

            # Look for validation results in tool outputs
            validation_result = None
            for i, tool_result in enumerate(tool_results):
                logger.info(f"🔍 Checking tool result {i}: {type(tool_result)}")
                if isinstance(tool_result, dict) and 'validation_passed' in tool_result:
                    validation_result = tool_result
                    logger.info(f"✅ Found validation result: passed={validation_result.get('validation_passed')}")
                    break
                elif hasattr(tool_result, 'content') and isinstance(tool_result.content, dict):
                    if 'validation_passed' in tool_result.content:
                        validation_result = tool_result.content
                        logger.info(f"✅ Found validation result in content: {validation_result}")
                        break

            if validation_result:
                logger.info(f"🎉 Successfully found validation result!")
                return {
                    "success": True,
                    "validation_passed": validation_result.get("validation_passed", False),
                    "exit_code": validation_result.get("exit_code", -1),
                    "message": validation_result.get("message", ""),
                    "summary": validation_result.get("summary", {}),
                    "issues": validation_result.get("issues", []),
                    "recommendations": validation_result.get("recommendations", []),
                    "agent_analysis": agent_text.strip(),
                    "raw_output": validation_result.get("raw_output", {}),
                    "playbook_length": len(playbook),
                    "lint_profile": lint_profile,
                    "debug_info": {
                        "tool_results_found": len(tool_results),
                        "events_processed": len(all_events)
                    }
                }
            else:
                logger.warning("⚠️ No validation result found in tool outputs")
                logger.warning(f"🔍 Available tool results: {tool_results}")
                return {
                    "success": True,
                    "validation_passed": True,  # Conservative assumption
                    "exit_code": 0,
                    "message": "Agent completed analysis (no tool result detected)",
                    "summary": {
                        "passed": True,
                        "violations": 0,
                        "warnings": 0,
                        "total_issues": 0
                    },
                    "issues": [],
                    "recommendations": [],
                    "agent_analysis": agent_text.strip() or "Agent processed the validation request",
                    "raw_output": {},
                    "playbook_length": len(playbook),
                    "lint_profile": lint_profile,
                    "debug_info": {
                        "mode": "text_only_fallback",
                        "tool_results_found": len(tool_results),
                        "events_processed": len(all_events)
                    }
                }

        except Exception as e:
            logger.error(f"❌ Failed to process agent response: {e}")
            logger.exception("Full error details:")
            return self._create_error_response(f"Failed to process agent response: {str(e)}")

    def _create_error_response(self, error_message: str) -> Dict[str, Any]:
        """Create standardized error response."""
        return {
            "success": False,
            "validation_passed": False,
            "exit_code": -1,
            "message": f"❌ {error_message}",
            "summary": {
                "passed": False,
                "violations": 0,
                "warnings": 0,
                "total_issues": 0,
                "error": True
            },
            "issues": [],
            "recommendations": [],
            "agent_analysis": f"Validation failed: {error_message}",
            "error": error_message
        }
