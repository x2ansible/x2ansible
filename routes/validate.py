# routes/validate.py

import logging
import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from dataclasses import asdict
from agents.validation_agent import ValidationAgent
from tools.ansible_lint_tool import ansible_lint_tool


logger = logging.getLogger(__name__)

# Load config.yaml
try:
    with open("config.yaml", "r") as f:
        config = yaml.safe_load(f)
    BASE_URL = config["llama_stack"]["base_url"]
    MODEL_ID = config["llama_stack"]["model"]
except Exception as e:
    logger.error(f"❌ Failed to load config.yaml: {e}")
    BASE_URL, MODEL_ID = None, None

# Agent import and initialization
try:
    from validation_agent import ValidationAgent
    from llama_stack_client import LlamaStackClient

    if BASE_URL and MODEL_ID:
        client = LlamaStackClient(BASE_URL)
        validation_agent = ValidationAgent(client, model=MODEL_ID)
        logger.info("✅ ValidationAgent initialized successfully")
    else:
        validation_agent = None
        logger.error("❌ Missing BASE_URL or MODEL_ID, ValidationAgent not initialized.")
except Exception as e:
    logger.error(f"❌ Failed to initialize ValidationAgent: {e}")
    validation_agent = None

router = APIRouter()

class ValidateRequest(BaseModel):
    playbook: str
    lint_profile: Optional[str] = "production"

class ValidateResponse(BaseModel):
    passed: bool
    summary: str
    issues: List[Any]
    raw_output: str
    debug_info: Optional[Dict[str, Any]] = None

@router.get("/validate/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "validate",
        "agent_available": validation_agent is not None,
        "endpoints": {
            "health": "/api/validate/health",
            "validate": "/api/validate"
        }
    }

@router.post("/validate", response_model=ValidateResponse)
async def validate_playbook(req: ValidateRequest):
    logger.info(f"🔎 Validation called with playbook length: {len(req.playbook)} chars")
    try:
        if not validation_agent:
            logger.warning("⚠️ ValidationAgent not available, fallback used")
            return ValidateResponse(
                passed=False,
                summary="Validation agent is unavailable. No validation performed.",
                issues=[],
                raw_output="",
                debug_info={
                    "status": "fallback",
                    "agent_used": "none"
                }
            )

        logger.info("🤖 Using real ValidationAgent...")
        result = validation_agent.validate_playbook(
            playbook_yaml=req.playbook,
            lint_profile=req.lint_profile or "production"
        )

        return ValidateResponse(
            passed=result.passed,
            summary=result.summary,
            issues=result.issues,
            raw_output=result.raw_output,
            debug_info={
                "status": "success",
                "agent_used": "real",
                "playbook_length": len(req.playbook),
                "num_issues": len(result.issues) if result.issues else 0,
            }
        )
    except Exception as e:
        logger.exception(f"❌ Validation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )

logger.info("✅ Validate router with real agent loaded")
