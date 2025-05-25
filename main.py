from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

import yaml

from agents.classifier_agent import ClassifierAgent
from llama_stack_client import LlamaStackClient
from routes.files import router as files_router

with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

llama_cfg = config["llama_stack"]
client     = LlamaStackClient(base_url=llama_cfg["base_url"])
classifier = ClassifierAgent(client=client, model=llama_cfg["model"])

app = FastAPI()

# serve uploads/ at /uploads/*
app.mount("/uploads", StaticFiles(directory="uploads", html=False), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ClassifyRequest(BaseModel):
    code: str

@app.post("/api/classify")
async def classify(req: ClassifyRequest):
    try:
        result = classifier.classify(req.code)
        return {"classification": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

app.include_router(files_router, prefix="/api")
