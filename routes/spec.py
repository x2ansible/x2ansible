# routes/spec.py

import yaml
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

BASE_URL = config["llama_stack"]["base_url"]
MODEL_ID = config["llama_stack"]["model"]
VECTOR_DB_ID = config["vector_db"]["id"]

try:
    from agents.spec_agent import SpecAgent
    spec_agent = SpecAgent(BASE_URL, MODEL_ID, VECTOR_DB_ID)
    logger = logging.getLogger(__name__)
    logger.info("✅ SpecAgent initialized successfully")
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.error(f"❌ Failed to initialize SpecAgent: {e}")
    spec_agent = None

router = APIRouter()

class SpecRequest(BaseModel):
    code: str
    context: Optional[str] = None

class SpecResponse(BaseModel):
    spec_text: str

@router.post("/spec/generate", response_model=SpecResponse)
async def generate_spec(req: SpecRequest):
    if not spec_agent:
        raise HTTPException(status_code=500, detail="SpecAgent not available")
    try:
        spec_text = spec_agent.generate_spec(req.code, req.context)
        return SpecResponse(spec_text=spec_text)
    except Exception as e:
        logger.exception(f"❌ SpecAgent generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"SpecAgent generation failed: {e}")
