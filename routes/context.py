import yaml
import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

# Load config and initialize agent ONCE
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)
BASE_URL = config["llama_stack"]["base_url"]
MODEL_ID = config["llama_stack"]["model"]
VECTOR_DB_ID = config["vector_db"]["id"]

try:
    from agents.context_agent import ContextAgent
    context_agent = ContextAgent(BASE_URL, MODEL_ID, VECTOR_DB_ID)
    logger = logging.getLogger(__name__)
    logger.info("✅ ContextAgent initialized successfully")
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.error(f"❌ Failed to initialize ContextAgent: {e}")
    context_agent = None

router = APIRouter()

class ContextQueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5

@router.get("/context/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "context",
        "agent_available": context_agent is not None,
        "endpoints": {
            "health": "/api/context/health",
            "query": "/api/context/query"
        }
    }

@router.post("/context/query")
async def context_query(req: ContextQueryRequest):
    # Explicit: log first 100 chars of input
    logger.info(f"🔍 Context query called with {len(req.query)} chars: {repr(req.query[:100])}")
    if not context_agent:
        raise HTTPException(status_code=500, detail="ContextAgent not available")
    try:
        # Log before calling agent
        logger.info(f"📬 Sending query to ContextAgent: {repr(req.query[:100])}")
        result = context_agent.query_context(req.query, req.top_k)
        context_chunks = result.get('context', [])
        logger.info(f"✅ ContextAgent returned {len(context_chunks)} context chunks")
        return {
            "success": True,
            "context": context_chunks,   # Always a list of dicts [{text: ...}]
            "steps": result.get("steps", []),
            "debug_info": {
                "input": req.query[:100],
                "input_length": len(req.query),
                "num_chunks": len(context_chunks)
            }
        }
    except Exception as e:
        logger.exception(f"❌ ContextAgent query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Context query failed: {e}")
