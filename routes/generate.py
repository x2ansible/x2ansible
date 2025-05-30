import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from agents.code_generator_agent import CodeGeneratorAgent
from agents.context_agent import ContextAgent

logger = logging.getLogger("routes.generate")
router = APIRouter()

# Global agent handles
codegen_agent = None
context_agent = None

def set_codegen_agent(agent: CodeGeneratorAgent):
    global codegen_agent
    codegen_agent = agent
    logger.info("CodeGeneratorAgent set in generate route")

def set_context_agent(agent: ContextAgent):
    global context_agent
    context_agent = agent
    logger.info("ContextAgent set in generate route")

class GenerateRequest(BaseModel):
    input_code: str
    context: Optional[str] = None

class GenerateResponse(BaseModel):
    playbook: str
    raw: Optional[str] = None
    debug_info: Optional[dict] = None

@router.get("/generate/health")
async def health_check():
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
    logger.info(f"Code generation called with {len(req.input_code)} chars of code")
    try:
        # 1. Use provided context, else fetch it agentically
        if req.context and req.context.strip():
            context = req.context
            logger.info(f"Using provided context: {len(context)} chars")
        else:
            if context_agent:
                logger.info("Fetching context via ContextAgent...")
                context_resp = context_agent.query_context(req.input_code)
                context = context_resp.get("context", "")

                # Flatten context: handle list-of-dicts, string, etc
                if isinstance(context, list):
                    context = "\n".join(
                        chunk["text"] if isinstance(chunk, dict) and "text" in chunk else str(chunk)
                        for chunk in context
                    )
                elif not isinstance(context, str):
                    context = str(context)
                logger.info(f"Context retrieved: {len(context)} chars")
            else:
                context = ""
                logger.warning("No context agent available; proceeding without RAG context")

        # 2. Generate playbook
        if codegen_agent:
            logger.info("Calling CodeGeneratorAgent...")
            try:
                playbook = codegen_agent.generate(req.input_code, context)
                logger.info(f"Playbook generated: {len(playbook)} chars")
            except Exception as agent_error:
                logger.error(f"CodeGeneratorAgent error: {agent_error}")
                error_details = str(agent_error)
                # Fallback template if agent fails due to session/turn error
                if "session_id" in error_details:
                    logger.error("Agent session_id error - fallback mode")
                    playbook = (
                        "---\n"
                        "# Generated Ansible Playbook - Fallback\n"
                        f"# Agent API error: {error_details}\n"
                        "- name: Fallback Conversion\n"
                        "  hosts: all\n"
                        "  become: yes\n"
                        "  tasks:\n"
                        f"    - name: Manual conversion required for {len(req.input_code)} chars of input\n"
                        "      debug:\n"
                        "        msg: 'CodeGeneratorAgent encountered an error.'\n"
                    )
                else:
                    raise agent_error
        else:
            logger.warning("CodeGeneratorAgent not available, using fallback playbook")
            playbook = (
                "---\n"
                "# Generated Ansible Playbook (Fallback)\n"
                "- name: Fallback Conversion\n"
                "  hosts: all\n"
                "  become: yes\n"
                "  tasks:\n"
                "    - name: Fallback conversion (agent unavailable)\n"
                "      debug:\n"
                "        msg: 'No agent available for code conversion.'\n"
            )

        # 3. Return production-grade response
        return GenerateResponse(
            playbook=playbook,
            raw=playbook,
            debug_info={
                "status": "success",
                "agent_used": "codegen_agent" if codegen_agent else "fallback",
                "input_code_length": len(req.input_code),
                "context_length": len(context),
                "playbook_length": len(playbook),
                "generation_method": "agent" if codegen_agent else "template"
            }
        )

    except Exception as e:
        logger.exception(f"Code generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Playbook generation failed: {str(e)}"
        )

logger.info("Code generation router loaded")
