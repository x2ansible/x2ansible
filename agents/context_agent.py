import json
import uuid
from pathlib import Path
from llama_stack_client import LlamaStackClient, RAGDocument

class ContextAgent:
    def __init__(
        self,
        base_url,
        vector_db_id,
        docs_folder="docs",
        embedding_model="all-MiniLM-L6-v2",
        embedding_dim=384,
        chunk_size=512,
    ):
        self.client = LlamaStackClient(base_url=base_url)
        self.vector_db_id = vector_db_id
        self.docs_folder = Path(docs_folder)
        self.embedding_model = embedding_model
        self.embedding_dim = embedding_dim
        self.chunk_size = chunk_size
        self._vector_db_ensured = False
        self._ingested = False

    def ensure_vector_db(self):
        # Use the proper high-level method to list vector DBs
        response = self.client.vector_dbs.list()
        existing = []
        
        for db in response:
            if hasattr(db, 'identifier'):
                existing.append(db.identifier)
            elif isinstance(db, dict) and "identifier" in db:
                existing.append(db["identifier"])
            elif isinstance(db, dict) and "vector_db_id" in db:
                existing.append(db["vector_db_id"])
            elif isinstance(db, str):
                existing.append(db)
                
        if self.vector_db_id not in existing:
            # Use the proper high-level method to register vector DB
            self.client.vector_dbs.register(
                vector_db_id=self.vector_db_id,
                embedding_model=self.embedding_model,
                embedding_dimension=self.embedding_dim,
                provider_id="faiss"
            )

    def ingest_documents(self):
        folder = self.docs_folder / self.vector_db_id
        if not folder.exists():
            return
            
        documents = []
        for file in folder.rglob("*"):
            if file.suffix.lower() in {".jsonl", ".md", ".txt", ".adoc", ".yaml", ".yml"}:
                try:
                    if file.suffix == ".jsonl":
                        with open(file, "r", encoding="utf-8") as f:
                            for line in f:
                                obj = json.loads(line)
                                documents.append(RAGDocument(
                                    document_id=str(uuid.uuid4()),
                                    content=obj["text"],
                                    metadata=obj.get("metadata", {"filename": file.name}),
                                    mime_type="text/plain"
                                ))
                    else:
                        content = file.read_text(encoding="utf-8")
                        documents.append(RAGDocument(
                            document_id=str(uuid.uuid4()),
                            content=content,
                            metadata={"filename": file.name},
                            mime_type="text/plain"
                        ))
                except Exception:
                    continue
                    
        if documents:
            # Use the proper high-level method
            self.client.tool_runtime.rag_tool.insert(
                vector_db_id=self.vector_db_id,
                documents=documents,
                chunk_size_in_tokens=self.chunk_size
            )

    def _ensure_setup(self):
        if not self._vector_db_ensured:
            self.ensure_vector_db()
            self._vector_db_ensured = True
        if not self._ingested:
            self.ingest_documents()
            self._ingested = True

    def ingest_document(self, content, filename, mime_type="text/plain"):
        self._ensure_setup()
        doc = RAGDocument(
            document_id=str(uuid.uuid4()),
            content=content,
            metadata={"filename": filename},
            mime_type=mime_type
        )
        
        # Use the proper high-level method
        return self.client.tool_runtime.rag_tool.insert(
            vector_db_id=self.vector_db_id,
            documents=[doc],
            chunk_size_in_tokens=self.chunk_size
        )

    def query_context(self, query, top_k=5):
        self._ensure_setup()
        
        # Use the proper high-level method
        return self.client.tool_runtime.rag_tool.query(
            content=query,
            vector_db_ids=[self.vector_db_id]
        )