import uuid
import yaml
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional
from llama_stack_client import LlamaStackClient, RAGDocument

# Load config.yaml for base_url
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

BASE_URL = config["llama_stack"]["base_url"]
VECTOR_DB_ID = config["vector_db"]["id"]
client = LlamaStackClient(base_url=BASE_URL)

router = APIRouter()

# List all vector databases
@router.get("/vector-dbs")
def list_vector_dbs():
    try:
        # Use the proper high-level method
        resp = client.vector_dbs.list()
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list vector DBs: {e}")

# Create a new vector database
@router.post("/vector-dbs")
def create_vector_db(
    vector_db_id: str = Query(...),
    embedding_model: str = Query(...)
):
    try:
        # Use the proper high-level method
        resp = client.vector_dbs.register(
            vector_db_id=vector_db_id,
            embedding_model=embedding_model,
            embedding_dimension=384,  # Default dimension
            provider_id="faiss"  # Default provider
        )
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create vector DB: {e}")

# Delete an existing vector database
@router.delete("/vector-dbs/{vector_db_id}")
def delete_vector_db(vector_db_id: str):
    try:
        # Use the proper high-level method
        resp = client.vector_dbs.unregister(vector_db_id=vector_db_id)
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete vector DB: {e}")

# Ingest/upload a document to a vector database (single file)
@router.post("/vector-dbs/{vector_db_id}/ingest")
async def ingest_doc(vector_db_id: str, file: UploadFile = File(...)):
    try:
        content = await file.read()
        doc_id = str(uuid.uuid4())
        rag_doc = RAGDocument(
            document_id=doc_id,
            content=content.decode(),
            metadata={"filename": file.filename},
            mime_type=file.content_type or "text/plain",
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

# Query a vector database for relevant context chunks
@router.post("/vector-dbs/{vector_db_id}/query")
def query_vector_db(vector_db_id: str, query: str = Query(...), top_k: Optional[int] = 5):
    try:
        # Use the proper high-level method
        resp = client.tool_runtime.rag_tool.query(
            content=query,
            vector_db_ids=[vector_db_id]
        )
        
        # Handle the response properly
        if hasattr(resp, 'content'):
            return {"success": True, "context": resp.content, "chunks": getattr(resp, 'chunks', [])}
        else:
            return {"success": True, "response": resp}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")