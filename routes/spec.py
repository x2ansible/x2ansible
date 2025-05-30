import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any

from agents.spec_agent import SpecAgent

logger = logging.getLogger("routes.spec")
router = APIRouter(prefix="/api/spec", tags=["specification"])

# Global agent handle
spec_agent: Optional[SpecAgent] = None
MODEL_ID = None
BASE_URL = None
VECTOR_DB_ID = None

def set_spec_agent(agent: SpecAgent, model_id: str = None, base_url: str = None, vector_db_id: str = None):
    global spec_agent, MODEL_ID, BASE_URL, VECTOR_DB_ID
    spec_agent = agent
    if model_id:
        MODEL_ID = model_id
    if base_url:
        BASE_URL = base_url
    if vector_db_id:
        VECTOR_DB_ID = vector_db_id
    logger.info("SpecAgent set in spec route")

# Request/Response Models
class SpecRequest(BaseModel):
    code: str = Field(..., description="Infrastructure code to analyze")
    context: Optional[str] = Field(None, description="Retrieved context from vector database")
    code_summary: Optional[str] = Field(None, description="Summary of the code structure")
    
    class Config:
        schema_extra = {
            "example": {
                "code": "resource \"aws_instance\" \"web\" {\n  ami = \"ami-12345\"\n  instance_type = \"t2.micro\"\n}",
                "context": "AWS infrastructure deployment context...",
                "code_summary": "Terraform configuration for AWS EC2 instance"
            }
        }

class SpecResponse(BaseModel):
    spec_text: str = Field(..., description="Generated specification text")
    requirements: List[str] = Field(..., description="Extracted requirements")
    goals: List[str] = Field(..., description="Conversion goals")
    constraints: List[str] = Field(..., description="Technical constraints")
    infrastructure_components: List[str] = Field(..., description="Key infrastructure components")
    conversion_strategy: str = Field(..., description="Recommended conversion approach")
    complexity_assessment: str = Field(..., description="Complexity level assessment")
    estimated_tasks: int = Field(..., description="Estimated number of Ansible tasks")
    
    class Config:
        schema_extra = {
            "example": {
                "spec_text": "## Requirements\n- Deploy AWS EC2 instance...",
                "requirements": ["Deploy AWS EC2 instance with specified AMI"],
                "goals": ["Automate EC2 deployment using Ansible"],
                "constraints": ["Must use existing AMI", "T2.micro instance type"],
                "infrastructure_components": ["EC2 Instance", "Security Groups"],
                "conversion_strategy": "Use ansible.builtin.ec2_instance module",
                "complexity_assessment": "Low",
                "estimated_tasks": 3
            }
        }

class HealthResponse(BaseModel):
    status: str
    model_id: str
    details: Dict[str, Any]

# Routes
@router.post("/generate", response_model=SpecResponse)
async def generate_spec(req: SpecRequest):
    if not spec_agent:
        logger.error("SpecAgent not available for request")
        raise HTTPException(
            status_code=503, 
            detail="Specification service unavailable - SpecAgent failed to initialize"
        )
    try:
        logger.info(f"Generating spec for {len(req.code)} chars of code")
        spec_output = spec_agent.generate_spec(
            code=req.code,
            context=req.context,
            code_summary=req.code_summary
        )
        response = SpecResponse(
            spec_text=spec_output.raw_spec,
            requirements=spec_output.requirements,
            goals=spec_output.goals,
            constraints=spec_output.constraints,
            infrastructure_components=spec_output.infrastructure_components,
            conversion_strategy=spec_output.conversion_strategy,
            complexity_assessment=spec_output.complexity_assessment,
            estimated_tasks=spec_output.estimated_tasks
        )
        logger.info(f"Spec generated successfully: {spec_output.complexity_assessment} complexity, {spec_output.estimated_tasks} tasks")
        return response
    except Exception as e:
        logger.exception(f"Spec generation failed: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to generate specification: {str(e)}"
        )

@router.get("/health", response_model=HealthResponse)
async def health_check():
    if not spec_agent:
        return HealthResponse(
            status="unhealthy",
            model_id="unknown",
            details={"error": "SpecAgent not initialized"}
        )
    try:
        health_result = spec_agent.health_check()
        return HealthResponse(
            status=health_result["status"],
            model_id=health_result["model_id"],
            details=health_result
        )
    except Exception as e:
        logger.exception(f"Health check failed: {e}")
        return HealthResponse(
            status="unhealthy",
            model_id=MODEL_ID if MODEL_ID else "unknown",
            details={"error": str(e)}
        )

@router.get("/models")
async def get_model_info():
    return {
        "model_id": MODEL_ID,
        "base_url": BASE_URL,
        "vector_db_id": VECTOR_DB_ID,
        "agent_available": spec_agent is not None
    }
