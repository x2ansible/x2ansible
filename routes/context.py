import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from agents.context_agent import ContextAgent

logger = logging.getLogger("routes.context")
router = APIRouter()

# Global agent instance
context_agent = None

def set_context_agent(agent: ContextAgent):
    """Set the ContextAgent instance (called from main.py)."""
    global context_agent
    context_agent = agent
    logger.info("ContextAgent set in context route")

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
    logger.info(f"Context query called with {len(req.query)} chars: {repr(req.query[:100])}")
    if not context_agent:
        logger.error("ContextAgent not available - check main.py initialization")
        raise HTTPException(status_code=500, detail="ContextAgent not available - server initialization failed")
    try:
        logger.info(f"Sending query to ContextAgent: {repr(req.query[:100])}")
        result = context_agent.query_context(req.query, req.top_k)
        context_chunks = result.get('context', [])
        logger.info(f"ContextAgent returned {len(context_chunks)} context chunks")
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
        logger.exception(f"ContextAgent query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Context query failed: {e}")
