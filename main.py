# main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agents.classifier_agent import ClassifierAgent
from llama_stack_client import LlamaStackClient
from routes.files import router as files_router
import yaml

# ───────────── Load config
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

llama_cfg = config["llama_stack"]
client = LlamaStackClient(base_url=llama_cfg["base_url"])
classifier = ClassifierAgent(client=client, model=llama_cfg["model"])

# ───────────── FastAPI app
app = FastAPI()

# ───────────── CORS setup (allow frontend on port 3000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ───────────── API models
class ClassifyRequest(BaseModel):
    code: str

# ───────────── Endpoints
@app.post("/api/classify")
async def classify(req: ClassifyRequest):
    result = classifier.classify(req.code)
    return {"classification": result}

# Include file management routes
app.include_router(files_router, prefix="/api")
