# routes/classify.py
"""
MINIMAL FIXED classify route - just fixes the missing function
"""

import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.classifier_agent import ClassifierAgent, ClassificationError

logger = logging.getLogger("routes.classify")
router = APIRouter()

class ClassifyRequest(BaseModel):
    code: str

# Global variable to hold the classifier instance
classifier = None

def set_classifier_agent(agent: ClassifierAgent):
    """Set the classifier agent instance (called from main.py)"""
    global classifier
    classifier = agent
    logger.info("ClassifierAgent set in classify route")

@router.post("/classify")
async def classify_code(req: ClassifyRequest):
    logger.info(f"🔍 Classify called with {len(req.code)} chars: {repr(req.code[:100])}")

    if not classifier:
        logger.error("ClassifierAgent not available - check main.py initialization")
        raise HTTPException(
            status_code=500, 
            detail="ClassifierAgent not available - server initialization failed"
        )

    if not req.code or not req.code.strip():
        logger.error("Empty or invalid code provided")
        raise HTTPException(
            status_code=400,
            detail="Code snippet cannot be empty"
        )

    try:
        logger.info("🔍 About to call classifier.get_json_result")
        result = classifier.get_json_result(req.code)
        logger.info(f"🔍 Raw classifier result: {result}")

        if result is None:
            logger.error("ClassifierAgent returned None result")
            raise HTTPException(
                status_code=500, 
                detail="ClassifierAgent returned no result"
            )

        if not isinstance(result, dict):
            logger.error(f"ClassifierAgent returned invalid result type: {type(result)}")
            raise HTTPException(
                status_code=500,
                detail=f"ClassifierAgent returned invalid result type: {type(result)}"
            )

        if result.get("success") and result.get("data"):
            logger.info("✅ Classification successful")
            return result["data"]

        error_msg = result.get("error", "Classification failed without specific error")
        error_type = result.get("error_type", "UnknownError")
        logger.error(f"ClassifierAgent error ({error_type}): {error_msg}")

        if error_type == "ClassificationError":
            raise HTTPException(status_code=400, detail=error_msg)
        else:
            raise HTTPException(status_code=500, detail=f"Internal classification error: {error_msg}")

    except HTTPException:
        raise
    except ClassificationError as e:
        logger.exception("ClassificationError from agent")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.exception(f"Unexpected error in classify_code: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error during classification: {str(e)}"
        )