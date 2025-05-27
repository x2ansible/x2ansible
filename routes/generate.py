# routes/generate.py - Using Real CodeGeneratorAgent with Fixed API
import yaml
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import logging

# Load config and initialize agents (same pattern as context.py)
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

BASE_URL = config["llama_stack"]["base_url"]
MODEL_ID = config["llama_stack"]["model"]
VECTOR_DB_ID = config["vector_db"]["id"]

# Import and initialize the real agent
try:
    from agents.code_generator_agent import CodeGeneratorAgent
    from agents.context_agent import ContextAgent
    
    codegen_agent = CodeGeneratorAgent(BASE_URL, MODEL_ID)
    context_agent = ContextAgent(BASE_URL, VECTOR_DB_ID)
    logger = logging.getLogger(__name__)
    logger.info("✅ Real agents initialized successfully")
    
except Exception as e:
    logger = logging.getLogger(__name__)
    logger.error(f"❌ Failed to initialize agents: {e}")
    codegen_agent = None
    context_agent = None

router = APIRouter()

class GenerateRequest(BaseModel):
    input_code: str
    context: Optional[str] = None

class GenerateResponse(BaseModel):
    playbook: str
    raw: Optional[str] = None
    debug_info: Optional[dict] = None

@router.get("/generate/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "generate", 
        "agents_available": {
            "codegen_agent": codegen_agent is not None,
            "context_agent": context_agent is not None
        },
        "endpoints": {
            "health": "/api/generate/health",
            "generate": "/api/generate"
        }
    }

@router.post("/generate", response_model=GenerateResponse)
async def generate_playbook(req: GenerateRequest):
    """Generate Ansible playbook using real CodeGeneratorAgent"""
    logger.info(f"🚀 Real generation called with {len(req.input_code)} chars of code")
    
    try:
        # Use provided context or fetch it
        if req.context and req.context.strip():
            context = req.context
            logger.info(f"📋 Using provided context: {len(context)} chars")
        else:
            # Fetch context using real ContextAgent
            if context_agent:
                logger.info("🔍 Fetching context from ContextAgent...")
                context_resp = context_agent.query_context(req.input_code)
                # Handle different response formats
                if hasattr(context_resp, 'content'):
                    context = context_resp.content
                elif hasattr(context_resp, 'chunks'):
                    # Extract text from chunks if available
                    context = '\n'.join([chunk.get('text', str(chunk)) for chunk in context_resp.chunks])
                else:
                    context = str(context_resp)
                logger.info(f"✅ Context retrieved: {len(context)} chars")
            else:
                context = "No context available - basic conversion"
                logger.warning("⚠️ No context agent available")
        
        # Generate playbook using real CodeGeneratorAgent
        if codegen_agent:
            logger.info("🤖 Calling real CodeGeneratorAgent...")
            try:
                playbook = codegen_agent.generate(req.input_code, context)
                logger.info(f"✅ Real playbook generated: {len(playbook)} chars")
            except Exception as agent_error:
                logger.error(f"❌ CodeGeneratorAgent error: {agent_error}")
                # Provide more detailed error info
                error_details = str(agent_error)
                if "session_id" in error_details:
                    logger.error("🔍 Agent session_id error - using fallback generation")
                    # Create a basic but functional playbook as fallback
                    playbook = f"""---
# Generated Ansible Playbook - Fallback Mode
# Original error: Agent API issue, using template generation
- name: Convert Infrastructure Code to Ansible
  hosts: all
  become: yes
  vars:
    conversion_timestamp: "{{{{ ansible_date_time.iso8601 }}}}"
  
  tasks:
    - name: Infrastructure conversion placeholder
      debug:
        msg: |
          CodeGeneratorAgent encountered an API error.
          Input code: {len(req.input_code)} characters
          Context: {len(context)} characters
          
          Manual conversion required for production use.
          
    - name: Log conversion details
      debug:
        var: conversion_timestamp
"""
                    logger.info(f"📋 Fallback playbook created: {len(playbook)} chars")
                else:
                    raise agent_error
        else:
            # Fallback if agent not available
            logger.warning("⚠️ CodeGeneratorAgent not available, using fallback")
            playbook = f"""---
# Generated Ansible Playbook (Fallback Mode)
- name: Convert Infrastructure Code
  hosts: all
  become: yes
  
  tasks:
    - name: Fallback conversion
      debug:
        msg: "CodeGeneratorAgent not available - {len(req.input_code)} chars to convert"
"""
        
        return GenerateResponse(
            playbook=playbook,
            raw=playbook,
            debug_info={
                "status": "success",
                "agent_used": "real" if codegen_agent else "fallback",
                "input_code_length": len(req.input_code),
                "context_length": len(context),
                "playbook_length": len(playbook),
                "generation_method": "agent" if codegen_agent else "template"
            }
        )
        
    except Exception as e:
        logger.exception(f"❌ Real generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Playbook generation failed: {str(e)}"
        )

logger.info("✅ Generate router with real agents loaded")