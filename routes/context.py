import uuid
import yaml
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
from llama_stack_client import LlamaStackClient, RAGDocument
from typing import Optional

# Load config.yaml for base_url, vector DB ID, etc.
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

BASE_URL = config["llama_stack"]["base_url"]
VECTOR_DB_ID = config["vector_db"]["id"]
client = LlamaStackClient(base_url=BASE_URL)

router = APIRouter()

class ContextQueryRequest(BaseModel):
    query: str
    top_k: Optional[int] = 5
    vector_db_id: Optional[str] = None

@router.post("/context/query")
def context_query(req: ContextQueryRequest):
    try:
        # Use the proper high-level method instead of low-level client.post()
        resp = client.tool_runtime.rag_tool.query(
            content=req.query,
            vector_db_ids=[req.vector_db_id or VECTOR_DB_ID]
        )
        
        # The response should have a 'content' attribute with the retrieved context
        if hasattr(resp, 'content'):
            return {"success": True, "context": resp.content, "chunks": getattr(resp, 'chunks', [])}
        else:
            return {"success": True, "response": resp}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Context query failed: {e}")

@router.post("/context/ingest")
async def ingest_doc(file: UploadFile = File(...), vector_db_id: str = VECTOR_DB_ID):
    try:
        content = await file.read()
        doc_id = str(uuid.uuid4())
        rag_doc = RAGDocument(
            document_id=doc_id,
            content=content.decode(),
            metadata={"filename": file.filename},
            mime_type=file.content_type or "text/plain"
        )
        
        # Use the proper high-level method
        resp = client.tool_runtime.rag_tool.insert(
            vector_db_id=vector_db_id,
            documents=[rag_doc],
            chunk_size_in_tokens=512
        )
        
        return {"success": True, "detail": resp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")