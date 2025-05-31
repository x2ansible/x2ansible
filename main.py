# main.py 
import logging

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
import yaml
import os
import platform
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from copy import deepcopy

from llama_stack_client import LlamaStackClient
from agents.classifier_agent import ClassifierAgent
from agents.validation_agent import ValidationAgent
from agents.context_agent import ContextAgent
from agents.code_generator_agent import CodeGeneratorAgent
from agents.spec_agent import SpecAgent

# Import config system - FIXED IMPORT!
from config.agent_config import get_config

from routes.validate import set_validation_agent
from routes.classify import set_classifier_agent
from routes.files import router as files_router, set_upload_dir
from routes.context import router as context_router, set_context_agent as set_context_context_agent
from routes.vector_db import router as vector_db_router, set_vector_db_client
from routes.generate import router as generate_router, set_codegen_agent, set_context_agent as set_generate_context_agent
from routes.validate import router as validate_router
from routes.spec import router as spec_router, set_spec_agent
from routes.classify import router as classify_router

# Import admin routes - ADD THIS
from routes import admin

# --- Helper: Merge dicts deeply (profile overrides defaults) ---
def deep_merge(dct, merge_dct):
    """Recursive dict merge. merge_dct overrides dct"""
    for k, v in merge_dct.items():
        if (
            k in dct and isinstance(dct[k], dict) and isinstance(v, dict)
        ):
            dct[k] = deep_merge(dct[k], v)
        else:
            dct[k] = v
    return dct

# --- Load config with profile layering ---
with open("config.yaml", "r") as f:
    raw_config = yaml.safe_load(f)

active_profile = os.environ.get("X2ANSIBLE_PROFILE", raw_config.get("active_profile", "local"))

if "defaults" not in raw_config or "profiles" not in raw_config:
    raise RuntimeError("config.yaml must contain both 'defaults' and 'profiles' sections.")

if active_profile not in raw_config["profiles"]:
    raise RuntimeError(f"Profile '{active_profile}' not found in config.yaml.")

config = deep_merge(deepcopy(raw_config["defaults"]), raw_config["profiles"][active_profile])
logger = logging.getLogger(__name__)
logger.info(f"Loaded config profile: {active_profile}")

# Initialize agent config system - ADD THIS
try:
    agent_config = get_config()
    logger.info(f"Agent configuration system initialized: {len(agent_config.get_all_agents())} agents configured")
except Exception as e:
    logger.error(f"Failed to initialize agent config system: {e}")
    logger.warning("Agents will use fallback instructions")

# --- Get commonly used config values ---
llama_cfg = config["llama_stack"]
vector_db_cfg = config.get("vector_db", {})
cors_cfg = config.get("cors", {})
logging_cfg = config.get("logging", {})
paths_cfg = config.get("paths", {})
app_cfg = config.get("app", {})

# --- App/Build Info ---
GIT_HASH = os.environ.get("GIT_HASH", "unknown")
BUILD_TIME = os.environ.get("BUILD_TIME", "unknown")
APP_VERSION = os.environ.get("APP_VERSION", app_cfg.get("version", "dev"))

# --- Agent Initialization ---
classifier = None
validation_agent = None
context_agent = None
code_generator_agent = None
spec_agent = None

try:
    client = LlamaStackClient(base_url=llama_cfg["base_url"])

    # ClassifierAgent now uses config system automatically
    classifier = ClassifierAgent(client=client, model=llama_cfg["model"])
    logger.info("ClassifierAgent initialized with config-driven instructions")

    validation_agent = ValidationAgent(client=client, model=llama_cfg["model"])
    logger.info("ValidationAgent initialized")

    vector_db_id = vector_db_cfg.get("id")
    context_agent = ContextAgent(llama_cfg["base_url"], llama_cfg["model"], vector_db_id)
    logger.info("ContextAgent initialized")

    code_generator_agent = CodeGeneratorAgent(llama_cfg["base_url"], llama_cfg["model"])
    logger.info("CodeGeneratorAgent initialized")

    spec_agent = SpecAgent(llama_cfg["base_url"], llama_cfg["model"], vector_db_id)
    logger.info("SpecAgent initialized")

    # Inject agents into all route modules
    set_classifier_agent(classifier)
    set_validation_agent(validation_agent)
    set_context_context_agent(context_agent)
    set_generate_context_agent(context_agent)
    set_codegen_agent(code_generator_agent)
    set_spec_agent(
        spec_agent,
        model_id=llama_cfg["model"],
        base_url=llama_cfg["base_url"],
        vector_db_id=vector_db_id
    )
    set_upload_dir(paths_cfg.get("uploads", "uploads"))
    set_vector_db_client(
        injected_client=client,
        default_vector_db_id=vector_db_cfg.get("id"),
        default_chunk_size=vector_db_cfg.get("chunk_size", 512)
    )
    logger.info("All agents/configs injected into route modules")

except Exception as e:
    logger.error(f"Failed to load config.yaml or initialize agents: {e}")
    raise

# --- FastAPI Lifespan Handler ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(f"x2Ansible API starting up with profile: {active_profile}")
    logger.info("Services initialized:")
    logger.info(f"   - ClassifierAgent: {'available' if classifier else 'unavailable'} (Config-driven: True)")
    logger.info(f"   - ValidationAgent: {'available' if validation_agent else 'unavailable'} (Model: {getattr(validation_agent, 'model', None)})")
    logger.info(f"   - ContextAgent: {'available' if context_agent else 'unavailable'} (Model: {getattr(context_agent, 'model', None) if context_agent else None})")
    logger.info(f"   - CodeGeneratorAgent: {'available' if code_generator_agent else 'unavailable'} (Model: {getattr(code_generator_agent, 'model', None) if code_generator_agent else None})")
    logger.info(f"   - SpecAgent: {'available' if spec_agent else 'unavailable'}")
    logger.info(f"   - LlamaStack: {llama_cfg['base_url']}")
    
    # Log config system status
    try:
        config_info = classifier.get_config_info() if classifier else {}
        logger.info(f"   - Agent Config System: Active (Instructions: {config_info.get('instructions_length', 0)} chars)")
    except:
        logger.info("   - Agent Config System: Fallback mode")
    
    logger.info("All agentic services are ready.")
    yield
    logger.info("x2Ansible API shutting down...")
    logger.info("All agents cleaned up successfully")

# --- FastAPI App Setup ---
app = FastAPI(
    title="x2Ansible API",
    description="A modular, agentic platform for IaC analysis, validation, and Ansible playbook generation.",
    version=APP_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_cfg.get("allow_origins", ["*"]),
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.mount(
    "/uploads",
    StaticFiles(directory=paths_cfg.get("uploads", "uploads"), html=False),
    name="uploads"
)

# --- Routers ---
app.include_router(files_router, prefix="/api")
app.include_router(context_router, prefix="/api")
app.include_router(vector_db_router, prefix="/api")
app.include_router(generate_router, prefix="/api")
app.include_router(validate_router, prefix="/api")
app.include_router(spec_router, prefix="/api")
app.include_router(classify_router, prefix="/api")

# Add admin router - ADD THIS
app.include_router(admin.router)

# --- Structured Error Handling ---
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {repr(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "An unexpected server error occurred.",
            "detail": str(exc)
        },
    )

# --- Health/Readiness/Liveness/Version Endpoints ---
@app.get("/health", tags=["Status"], summary="Full system health check")
async def health_check():
    return {
        "status": "healthy",
        "profile": active_profile,
        "services": {
            "classifier_agent": {
                "available": classifier is not None,
                "model": llama_cfg["model"] if llama_cfg else None,
                "config_driven": True
            },
            "validation_agent": {
                "available": validation_agent is not None,
                "model": validation_agent.model if validation_agent else None
            },
            "context_agent": {
                "available": context_agent is not None,
                "model": getattr(context_agent, "model", None) if context_agent else None
            },
            "code_generator_agent": {
                "available": code_generator_agent is not None,
                "model": getattr(code_generator_agent, "model", None) if code_generator_agent else None
            },
            "spec_agent": {
                "available": spec_agent is not None,
                "model": getattr(spec_agent, 'model', None) if spec_agent else None
            },
            "llama_stack": {
                "base_url": llama_cfg["base_url"] if llama_cfg else None,
                "connected": True
            },
            "admin_config": {
                "available": True,
                "agents_configured": len(get_config().get_all_agents()) if get_config() else 0
            }
        },
        "message": "All agents initialized and ready"
    }

@app.get("/live", tags=["Status"], summary="Liveness probe")
async def live_probe():
    return {"status": "live"}

@app.get("/ready", tags=["Status"], summary="Readiness probe")
async def ready_probe():
    ready = all([
        classifier is not None,
        validation_agent is not None,
        context_agent is not None,
        code_generator_agent is not None,
        spec_agent is not None
    ])
    return {"status": "ready" if ready else "not ready"}

@app.get("/version", tags=["Status"], summary="Application version and build info")
async def version_info():
    return {
        "profile": active_profile,
        "app_version": APP_VERSION,
        "git_hash": GIT_HASH,
        "build_time": BUILD_TIME,
        "python_version": platform.python_version(),
        "fastapi_version": getattr(FastAPI, '__version__', 'unknown'),
        "llama_stack_client_version": getattr(LlamaStackClient, '__version__', 'unknown'),
        "config_system": "active"
    }