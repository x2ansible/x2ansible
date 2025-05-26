# main.py

import logging
import yaml
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from starlette.concurrency import run_in_threadpool
from pydantic import BaseModel
from typing import List

from llama_stack_client import LlamaStackClient
from agents.classifier_agent import ClassifierAgent, ClassificationError
from routes.files import router as files_router

# ─── Configure logging ───────────────────────────────────────────────
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ─── Load config.yaml ────────────────────────────────────────────────
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

llama_cfg  = config["llama_stack"]
client     = LlamaStackClient(base_url=llama_cfg["base_url"])
classifier = ClassifierAgent(client=client, model=llama_cfg["model"])

# ─── FastAPI App Setup ───────────────────────────────────────────────
app = FastAPI(title="IaC Classifier API")

app.mount(
    "/uploads",
    StaticFiles(directory="uploads", html=False),
    name="uploads"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ─── Request Model ───────────────────────────────────────────────────
class ClassifyRequest(BaseModel):
    code: str

# ─── Optional Full Response Model for Docs (optional) ────────────────
class ClassifyResponseFull(BaseModel):
    classification: str
    summary: str
    detailed_analysis: str
    resources: List[str]
    key_operations: List[str]
    dependencies: str
    configuration_details: str
    complexity_level: str
    convertible: bool
    conversion_notes: str
    duration_ms: float
    manual_estimate_ms: float
    speedup: float

# ─── Classification Endpoint (FULL DATA) ─────────────────────────────
@app.post("/api/classify", response_model=ClassifyResponseFull)
async def classify_endpoint(req: ClassifyRequest):
    try:
        wrapped = await run_in_threadpool(classifier.get_json_result, req.code)

        # 👇 UNWRAP `.data` from { success, data, error }
        if wrapped.get("success") and wrapped.get("data"):
            return wrapped["data"]

        raise HTTPException(
            status_code=400,
            detail=wrapped.get("error", "Missing classification result")
        )

    except ClassificationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    except Exception:
        logger.exception("Unhandled error in classify endpoint")
        raise HTTPException(status_code=500, detail="Internal server error")


# ─── Include file upload/browse routes ───────────────────────────────
app.include_router(files_router, prefix="/api")
