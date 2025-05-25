# infra/ingestor.py

import logging
from llama_stack_client import LlamaStackClient

logger = logging.getLogger("Ingestor")
logging.basicConfig(level=logging.INFO)


def ingest_docs(model: LlamaStackClient, collection_name: str = "iac", path: str = "docs/iac") -> None:
    logger.info(f"📥 Ingesting documents from: {path} into collection: {collection_name}")

    try:
        ingest_result = model.tool_runtime.call_tool("rag-tool/insert", {
            "collection": collection_name,
            "input_dir": path
        })

        if ingest_result.get("success", False):
            logger.info(f"✅ Ingested {ingest_result.get('document_count', '?')} documents into '{collection_name}'")
        else:
            logger.error(f"❌ Ingestion failed: {ingest_result}")
    except Exception as e:
        logger.error(f"❌ Tool call to 'rag-tool/insert' failed: {e}")
