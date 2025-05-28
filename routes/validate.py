from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any
import logging

from tools.ansible_lint_tool import ansible_lint_tool  # Adjust as needed

router = APIRouter()

class ValidateRequest(BaseModel):
    playbook: str
    lint_profile: str = "production"

class ValidateResponse(BaseModel):
    passed: bool
    summary: str
    issues: List[Dict[str, Any]]
    raw_output: str
    debug_info: Dict[str, Any]

@router.post("/validate", response_model=ValidateResponse)
def validate_playbook(req: ValidateRequest):
    logging.info(f"Received playbook for validation ({len(req.playbook)} chars) with profile '{req.lint_profile}'")
    try:
        tool_response = ansible_lint_tool(req.playbook, req.lint_profile)
        logging.info(f"Tool raw response: {tool_response!r}")

        if not tool_response or "output" not in tool_response:
            summary = "No tool response from ansible_lint_tool."
            logging.error(summary)
            return ValidateResponse(
                passed=False,
                summary=summary,
                issues=[],
                raw_output="",
                debug_info={"status": "fail", "reason": "empty_result"}
            )

        output = tool_response["output"]
        passed = output.get("summary", {}).get("passed", False)
        raw_output = output.get("raw_output", {}).get("stdout", "")
        issues = output.get("issues", [])
        summary = "Passed" if passed else "Failed"
        debug_info = {
            "status": "success",
            "tool_response": tool_response,
            "playbook_length": len(req.playbook),
            "num_issues": len(issues)
        }
        return ValidateResponse(
            passed=passed,
            summary=summary,
            issues=issues,
            raw_output=raw_output,
            debug_info=debug_info
        )
    except Exception as e:
        logging.exception("Validation failed due to exception!")
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")
