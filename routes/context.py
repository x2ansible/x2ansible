import logging
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from typing import Optional

logger = logging.getLogger("routes.context")
router = APIRouter()

# Global agent instance
context_agent = None

def set_context_agent(agent):
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
            "query": "/api/context/query",
            "ingest": "/api/context/ingest"
        }
    }

@router.post("/context/query")
async def context_query(req: ContextQueryRequest):
    logger.info(f"Context query called with {len(req.query)} chars")
    if not context_agent:
        raise HTTPException(status_code=500, detail="ContextAgent not available")
    
    try:
        result = context_agent.query_context(req.query, req.top_k)
        context_chunks = result.get('context', [])
        logger.info(f"ContextAgent returned {len(context_chunks)} context chunks")
        return {
            "success": True,
            "context": context_chunks,
            "steps": result.get("steps", [])
        }
    except Exception as e:
        logger.exception(f"ContextAgent query failed: {e}")
        raise HTTPException(status_code=500, detail=f"Context query failed: {e}")

@router.post("/context/ingest")
async def ingest_context_file(file: UploadFile = File(...)):
    """Ingest a file into the vector database."""
    logger.info(f"Ingest endpoint called with file: {file.filename}")
    
    if not context_agent:
        raise HTTPException(status_code=500, detail="ContextAgent not available")
    
    try:
        # Read file content
        content = await file.read()
        content_str = content.decode('utf-8')
        
        # Check if context agent has client
        if not hasattr(context_agent, 'client'):
            raise HTTPException(status_code=500, detail="ContextAgent client not available")
        
        # Import RAGDocument here to avoid import issues
        from llama_stack_client import RAGDocument
        
        client = context_agent.client
        vector_db_id = getattr(context_agent, "vector_db_id", "iac")
        doc_id = str(uuid.uuid4())
        
        # Create document
        rag_doc = RAGDocument(
            document_id=doc_id,
            content=content_str,
            metadata={"filename": file.filename or "uploaded_file"},
            mime_type=file.content_type or "text/plain",
        )
        
        # Insert document
        resp = client.tool_runtime.rag_tool.insert(
            vector_db_id=vector_db_id,
            documents=[rag_doc],
            chunk_size_in_tokens=512
        )
        
        logger.info(f"Successfully ingested file: {file.filename}")
        return {
            "success": True, 
            "detail": f"File '{file.filename}' ingested successfully",
            "document_id": doc_id
        }
        
    except UnicodeDecodeError:
        logger.error(f"Failed to decode file {file.filename} as UTF-8")
        raise HTTPException(status_code=400, detail="File must be valid UTF-8 text")
    except Exception as e:
        logger.exception(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {str(e)}")

@router.get("/context/test")
async def test_endpoint():
    """Test endpoint to verify router is working."""
    return {
        "message": "Context router is working", 
        "agent_available": context_agent is not None
    }