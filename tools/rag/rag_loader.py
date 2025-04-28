import os
import re
import yaml
import json
import hashlib
from pathlib import Path
from docling.document_converter import DocumentConverter
from llama_stack_client import LlamaStackClient
from llama_stack_client.types import Document

def compute_file_hash(file_path):
    sha256 = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()

def load_hash_index(index_path):
    if index_path.exists():
        with open(index_path, "r") as f:
            return json.load(f)
    return {}

def save_hash_index(index_path, index):
    with open(index_path, "w") as f:
        json.dump(index, f, indent=2)

def clean_adoc(content):
    content = re.sub(r"^:.*?:.*?$", "", content, flags=re.MULTILINE)
    content = re.sub(r"////.*?////", "", content, flags=re.DOTALL)
    content = re.sub(r"^\[\[.*?\]\]", "", content, flags=re.MULTILINE)
    return content.strip()

def parse_adoc_locally(file_path):
    try:
        converter = DocumentConverter()
        result = converter.convert(str(file_path))
        doc = result.document
        if doc:
            markdown = doc.export_to_markdown()
            return [{"title": "", "text": markdown.strip()}]
        else:
            raise ValueError("Docling returned no document structure.")
    except Exception as e:
        print(f"⚠️ Docling failed for {file_path}. Falling back to raw text. Error: {e}")
        return None

# Load config
with open("config.yaml") as f:
    config = yaml.safe_load(f)

profile = config["default"]
base_url = config["llama_stack"][profile]["base_url"]

client = LlamaStackClient(base_url=base_url)
print(f"✅ Connected to LlamaStack @ {base_url} (profile: {profile})")

chunk_size = config["vector_db_chunk_size"]
embedding_model = config["embedding_model"]
embedding_dim = config["embedding_dimension"]
provider_id = config["vector_db_provider_id"]
docs_root = Path(config["docs_folder_root"])
vector_dbs = config["vector_dbs"]

cache_dir = Path("tools/rag/.rag_cache")
cache_dir.mkdir(parents=True, exist_ok=True)

valid_exts = [".md", ".txt", ".yaml", ".yml", ".json", ".rst", ".adoc"]

for vector_db_id, subfolder in vector_dbs.items():
    folder_path = docs_root / subfolder
    if not folder_path.exists():
        print(f"⚠️ Folder {folder_path} does not exist. Skipping.")
        continue

    index_path = cache_dir / f"{vector_db_id}.rag_index.json"
    hash_index = load_hash_index(index_path)

    existing = [v.provider_resource_id for v in client.vector_dbs.list()]
    if vector_db_id not in existing:
        client.vector_dbs.register(
            vector_db_id=vector_db_id,
            embedding_model=embedding_model,
            embedding_dimension=embedding_dim,
            provider_id=provider_id
        )
        print(f"📚 Created vector DB: {vector_db_id}")
    else:
        print(f"ℹ️ Vector DB '{vector_db_id}' already exists.")

    documents = []
    updated_index = hash_index.copy()
    skipped_files = []
    ingested_files = []

    for file in folder_path.rglob("*"):
        if file.suffix.lower() in valid_exts and file.is_file():
            file_hash = compute_file_hash(file)
            if str(file) in hash_index and hash_index[str(file)] == file_hash:
                skipped_files.append(str(file))
                continue

            try:
                sections = []
                if file.suffix.lower() == ".adoc":
                    sections = parse_adoc_locally(file)
                    if not sections:
                        with open(file, "r", encoding="utf-8") as f:
                            fallback = clean_adoc(f.read())
                        sections = [{"title": "", "text": fallback}]
                else:
                    with open(file, "r", encoding="utf-8") as f:
                        text = f.read()
                    sections = [{"title": "", "text": text}]

                for idx, section in enumerate(sections):
                    if section["text"]:
                        documents.append(Document(
                            document_id=f"{file.stem}-{idx}",
                            content=section["text"],
                            mime_type="text/plain",
                            metadata={
                                "source": str(file),
                                "section_title": section.get("title", ""),
                                "hash": file_hash
                            }
                        ))

                updated_index[str(file)] = file_hash
                ingested_files.append(str(file))

            except Exception as e:
                print(f"❌ Failed to process {file}: {e}")

    if documents:
        client.tool_runtime.rag_tool.insert(
            documents=documents,
            vector_db_id=vector_db_id,
            chunk_size_in_tokens=chunk_size
        )
        print(f"✅ Ingested {len(ingested_files)} files into '{vector_db_id}' with {len(documents)} chunks")
        save_hash_index(index_path, updated_index)
    else:
        print(f"⏩ No new documents to ingest for '{vector_db_id}'")

    log_path = cache_dir / f"{vector_db_id}.ingest_log.json"
    with open(log_path, "w") as logf:
        json.dump({
            "ingested": ingested_files,
            "skipped": skipped_files
        }, logf, indent=2)

    print(f"📝 Ingest log written to: {log_path}")

print("🏁 Full RAG ingestion complete using local Docling + deduplication + logs.")
