# routes/validate.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import asyncio

from agents.validation_agent import ValidationAgent

# Setup logger
logger = logging.getLogger("ValidateRoute")

router = APIRouter()

# Global validation agent instance (will be initialized in main.py)
validation_agent: Optional[ValidationAgent] = None

def set_validation_agent(agent: ValidationAgent):
    """Set the global validation agent instance."""
    global validation_agent
    validation_agent = agent

class ValidateRequest(BaseModel):
    playbook: str
    lint_profile: str = "production"

class ValidationIssue(BaseModel):
    rule: Optional[str] = None
    category: Optional[str] = None
    specific_rule: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[str] = None
    file: Optional[str] = None
    line: Optional[int] = None
    column: Optional[int] = None

class ValidationRecommendation(BaseModel):
    issue: Optional[str] = None
    recommendation: Optional[str] = None
    action: Optional[str] = None
    example: Optional[str] = None
    line: Optional[int] = None

class ValidateResponse(BaseModel):
    success: bool
    validation_passed: bool
    exit_code: int
    message: str
    summary: Dict[str, Any]
    issues: List[ValidationIssue]
    recommendations: List[ValidationRecommendation]
    agent_analysis: str
    raw_output: Dict[str, str]
    playbook_length: int
    lint_profile: str
    debug_info: Optional[Dict[str, Any]] = None

@router.post("/validate", response_model=ValidateResponse)
async def validate_playbook(req: ValidateRequest):
    """
    Validate an Ansible playbook using the ValidationAgent.
    This endpoint provides a fully agentic approach to playbook validation.
    """
    if not validation_agent:
        logger.error("❌ ValidationAgent not initialized")
        raise HTTPException(
            status_code=500, 
            detail="Validation service not available - agent not initialized"
        )
    
    logger.info(f"🚀 Received validation request: {len(req.playbook)} chars, profile: {req.lint_profile}")
    
    try:
        # Call the validation agent asynchronously
        agent_result = await validation_agent.validate_playbook(
            playbook=req.playbook,
            lint_profile=req.lint_profile
        )
        
        logger.info(f"📋 Agent validation completed: success={agent_result.get('success')}, passed={agent_result.get('validation_passed')}")
        
        # Convert agent result to API response format
        issues = []
        for issue_data in agent_result.get("issues", []):
            issues.append(ValidationIssue(**{
                k: v for k, v in issue_data.items() 
                if k in ValidationIssue.__fields__
            }))
        
        recommendations = []
        for rec_data in agent_result.get("recommendations", []):
            recommendations.append(ValidationRecommendation(**{
                k: v for k, v in rec_data.items() 
                if k in ValidationRecommendation.__fields__
            }))
        
        # Build the response
        response = ValidateResponse(
            success=agent_result.get("success", False),
            validation_passed=agent_result.get("validation_passed", False),
            exit_code=agent_result.get("exit_code", -1),
            message=agent_result.get("message", ""),
            summary=agent_result.get("summary", {}),
            issues=issues,
            recommendations=recommendations,
            agent_analysis=agent_result.get("agent_analysis", ""),
            raw_output=agent_result.get("raw_output", {}),
            playbook_length=agent_result.get("playbook_length", len(req.playbook)),
            lint_profile=agent_result.get("lint_profile", req.lint_profile),
            debug_info={
                "model": validation_agent.model,
                "total_issues": len(issues),
                "total_recommendations": len(recommendations)
            }
        )
        
        # Log summary
        if response.validation_passed:
            logger.info("✅ Playbook validation PASSED via agent")
        else:
            logger.warning(f"❌ Playbook validation FAILED via agent: {len(issues)} issues found")
        
        return response
        
    except asyncio.TimeoutError:
        error_msg = "Agent validation timed out"
        logger.error(f"⏰ {error_msg}")
        raise HTTPException(status_code=408, detail=error_msg)
        
    except Exception as e:
        error_msg = f"Agent validation failed: {str(e)}"
        logger.error(f"💥 {error_msg}")
        logger.exception("Full validation error details:")
        raise HTTPException(status_code=500, detail=error_msg)


@router.get("/validate/health")
async def validation_health():
    """Health check endpoint for the validation service."""
    if not validation_agent:
        return {
            "status": "unhealthy",
            "message": "ValidationAgent not initialized",
            "agent_available": False
        }
    
    return {
        "status": "healthy",
        "message": "ValidationAgent ready",
        "agent_available": True,
        "model": validation_agent.model
    }