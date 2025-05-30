import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from typing import Optional
from llama_stack_client import LlamaStackClient, RAGDocument

router = APIRouter()

# Globals set from main.py
client: Optional[LlamaStackClient] = None
DEFAULT_VECTOR_DB_ID: Optional[str] = None
DEFAULT_CHUNK_SIZE: int = 512

def set_vector_db_client(
    injected_client: LlamaStackClient,
    default_vector_db_id: Optional[str] = None,
    default_chunk_size: int = 512
):
    global client, DEFAULT_VECTOR_DB_ID, DEFAULT_CHUNK_SIZE
    client = injected_client
    DEFAULT_VECTOR_DB_ID = default_vector_db_id
    DEFAULT_CHUNK_SIZE = default_chunk_size

# List all vector databases
@router.get("/vector-dbs")
def list_vector_dbs():
    if not client:
        raise HTTPException(status_code=500, detail="LlamaStackClient not initialized")
    try:
        return client.vector_dbs.list()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list vector DBs: {e}")

# Create a new vector database
@router.post("/vector-dbs")
def create_vector_db(
    vector_db_id: str = Query(...),
    embedding_model: str = Query(...)
):
    if not client:
        raise HTTPException(status_code=500, detail="LlamaStackClient not initialized")
    try:
        resp = client.vector_dbs.register(
            vector_db_id=vector_db_id,
            embedding_model=embedding_model,
            embedding_dimension=384,  # You could make this configurable
            provider_id="faiss"
        )
        return resp
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create vector DB: {e}")

# Delete an existing vector database
@router.delete("/vector-dbs/{vector_db_id}")
def delete_vector_db(vector_db_id: str):
    if not client:
        raise HTTPException(status_code=500, detail="LlamaStackClient not initialized")
    try:
        return client.vector_dbs.unregister(vector_db_id=vector_db_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete vector DB: {e}")

# Ingest/upload a document to a vector database (single file)
@router.post("/vector-dbs/{vector_db_id}/ingest")
async def ingest_doc(vector_db_id: str, file: UploadFile = File(...)):
    if not client:
        raise HTTPException(status_code=500, detail="LlamaStackClient not initialized")
    try:
        content = await file.read()
        doc_id = str(uuid.uuid4())
        rag_doc = RAGDocument(
            document_id=doc_id,
            content=content.decode(),
            metadata={"filename": file.filename},
            mime_type=file.content_type or "text/plain",
        )
        resp = client.tool_runtime.rag_tool.insert(
            vector_db_id=vector_db_id,
            documents=[rag_doc],
            chunk_size_in_tokens=DEFAULT_CHUNK_SIZE
        )
        return {"success": True, "detail": resp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ingestion failed: {e}")

# Query a vector database for relevant context chunks
@router.post("/vector-dbs/{vector_db_id}/query")
def query_vector_db(
    vector_db_id: str, 
    query: str = Query(...), 
    top_k: Optional[int] = 5
):
    if not client:
        raise HTTPException(status_code=500, detail="LlamaStackClient not initialized")
    try:
        resp = client.tool_runtime.rag_tool.query(
            content=query,
            vector_db_ids=[vector_db_id]
        )
        if hasattr(resp, 'content'):
            return {"success": True, "context": resp.content, "chunks": getattr(resp, 'chunks', [])}
        else:
            return {"success": True, "response": resp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query failed: {e}")
