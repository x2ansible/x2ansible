# validation_agent.py

from typing import List, Any, Dict, Optional
from llama_stack_client import Agent, LlamaStackClient
from tools.ansible_lint_tool import ansible_lint_tool


class ValidationResult:
    def __init__(self, passed: bool, summary: str, issues: List[Any], raw_output: str, lint_summary: Optional[Dict] = None):
        self.passed = passed
        self.summary = summary
        self.issues = issues
        self.raw_output = raw_output
        self.lint_summary = lint_summary

class ValidationAgent:
    def __init__(self, client, model: str = "llama3-8b"):
        self.agent = Agent(
            client,
            model=model,
            instructions="You are a validation agent. Use ansible_lint_tool for playbook linting.",
            tools=[ansible_lint_tool],
        )

    def validate_playbook(self, playbook_yaml: str, lint_profile: str = "production") -> ValidationResult:
        prompt = (
            f"Lint this Ansible playbook using profile '{lint_profile}':\n"
            f"```yaml\n{playbook_yaml}\n```"
        )
        response = self.agent.create_turn([{"role": "user", "content": prompt}])

        # Defensive parsing in case LLM response is not strictly as expected
        lint_result = response.get("tool_responses", [{}])[0] if isinstance(response, dict) else response
        passed = lint_result.get("exit_code", 1) == 0
        summary = lint_result.get("stdout", "")[:300] + "..." if lint_result.get("stdout", "") else ""
        issues = [lint_result.get("stderr", "")] if lint_result.get("stderr") else []
        raw_output = lint_result.get("stdout", "") + "\n" + lint_result.get("stderr", "")
        # Here you may add postprocessing if you expect a more complex lint summary
        return ValidationResult(
            passed=passed,
            summary=summary,
            issues=issues,
            raw_output=raw_output,
            lint_summary=None,  # Extend if needed!
        )
