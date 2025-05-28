# agents/validation_agent.py

import logging
from typing import List, Any, Dict, Optional
from llama_stack_client import Agent, LlamaStackClient
from tools.ansible_lint_tool import ansible_lint_tool
from llama_stack_client.types import UserMessage

logger = logging.getLogger("ValidationAgent")
logging.basicConfig(level=logging.INFO)

class ValidationResult:
    def __init__(self, passed: bool, summary: str, issues: List[Any], raw_output: str, lint_summary: Optional[Dict] = None):
        self.passed = passed
        self.summary = summary
        self.issues = issues
        self.raw_output = raw_output
        self.lint_summary = lint_summary

class ValidationAgent:
    def __init__(self, client, model: str = "llama3-3b"):
        self.agent = Agent(
            client,
            model=model,
            instructions="You are a validation agent. Use ansible_lint_tool for playbook linting.",
            tools=[ansible_lint_tool],
        )
        logger.info(f"✅ ValidationAgent initialized with model: {model}")

    def validate_playbook(self, playbook_yaml: str, lint_profile: str = "production") -> ValidationResult:
        logger.info(f"🛡️ Validating playbook with length {len(playbook_yaml)} using profile: {lint_profile}")

        prompt = (
            f"Lint this Ansible playbook using profile '{lint_profile}':\n"
            f"```yaml\n{playbook_yaml}\n```"
        )

        session_id = self.agent.create_session("validate")
        logger.info(f"🔑 Session created: {session_id}")

        turn = self.agent.create_turn(
            session_id=session_id,
            messages=[UserMessage(role="user", content=prompt)],
            stream=False
        )
        logger.info("🔄 Agent turn created and executed.")

        # Extract tool response robustly
        tool_responses = getattr(turn, "tool_responses", None)
        if not tool_responses or not isinstance(tool_responses, list) or not tool_responses:
            logger.warning("⚠️ No tool_responses found in agent output!")
            return ValidationResult(
                passed=False,
                summary="No tool response from agent.",
                issues=[],
                raw_output="",
                lint_summary=None
            )
        lint_result = tool_responses[0]

        passed = lint_result.get("exit_code", 1) == 0
        summary = lint_result.get("stdout", "")[:300] + "..." if lint_result.get("stdout", "") else ""
        issues = [lint_result.get("stderr", "")] if lint_result.get("stderr") else []
        raw_output = (lint_result.get("stdout", "") or "") + "\n" + (lint_result.get("stderr", "") or "")

        logger.info(f"✅ Validation completed. Passed: {passed}. Summary length: {len(summary)}")
        return ValidationResult(
            passed=passed,
            summary=summary,
            issues=issues,
            raw_output=raw_output,
            lint_summary=None,
        )
