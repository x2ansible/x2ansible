# routes/admin.py
"""
Admin API routes for managing agent configurations.
Provides endpoints for the admin panel to read/write agent configs.
"""

import logging
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Dict, Any, Optional
import os
from pathlib import Path

# Import the config system
from config.agent_config import get_config

logger = logging.getLogger("routes.admin")
router = APIRouter(prefix="/api/admin", tags=["admin"])

class UpdateInstructionsRequest(BaseModel):
    agent_id: str
    instructions: str

class AgentConfigResponse(BaseModel):
    name: str
    instructions: str
    status: str = "active"
    version: str = "1.0"
    updated_at: Optional[str] = None

@router.get("/agents")
async def get_all_agent_configs():
    """Get all agent configurations"""
    try:
        config = get_config()
        agents_data = config.get_all_agents()
        
        logger.info(f"Retrieved {len(agents_data)} agent configurations")
        
        return {
            "success": True,
            "agents": agents_data,
            "total": len(agents_data)
        }
        
    except Exception as e:
        logger.error(f"Failed to get agent configs: {e}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to retrieve agent configurations: {str(e)}"
        )

@router.get("/agents/{agent_id}")
async def get_agent_config(agent_id: str):
    """Get configuration for a specific agent"""
    try:
        config = get_config()
        agent_data = config.get_agent_config(agent_id)
        
        if not agent_data:
            raise HTTPException(
                status_code=404,
                detail=f"Agent '{agent_id}' not found"
            )
        
        logger.info(f"Retrieved config for agent: {agent_id}")
        
        return {
            "success": True,
            "agent_id": agent_id,
            **agent_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get config for agent {agent_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve agent configuration: {str(e)}"
        )

@router.put("/agents")
async def update_agent_instructions(request: UpdateInstructionsRequest):
    """Update instructions for a specific agent"""
    try:
        config = get_config()
        
        # Validate agent exists
        existing_config = config.get_agent_config(request.agent_id)
        if not existing_config:
            raise HTTPException(
                status_code=404,
                detail=f"Agent '{request.agent_id}' not found"
            )
        
        # Validate instructions
        if not request.instructions or not request.instructions.strip():
            raise HTTPException(
                status_code=400,
                detail="Instructions cannot be empty"
            )
        
        # Update instructions
        success = config.update_agent_instructions(request.agent_id, request.instructions.strip())
        
        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to save configuration changes"
            )
        
        # Get updated config
        updated_config = config.get_agent_config(request.agent_id)
        
        logger.info(f"Updated instructions for agent: {request.agent_id}")
        
        return {
            "success": True,
            "message": f"Instructions updated for agent '{request.agent_id}'",
            "agent_id": request.agent_id,
            **updated_config
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update agent {request.agent_id}: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update agent configuration: {str(e)}"
        )

@router.post("/agents/reload")
async def reload_agent_configs():
    """Reload all agent configurations from file"""
    try:
        config = get_config()
        config.reload_config()
        
        agents_data = config.get_all_agents()
        
        logger.info("Agent configurations reloaded from file")
        
        return {
            "success": True,
            "message": "Configurations reloaded successfully",
            "agents": agents_data,
            "total": len(agents_data)
        }
        
    except Exception as e:
        logger.error(f"Failed to reload configs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to reload configurations: {str(e)}"
        )

@router.get("/agents/export")
async def export_agent_configs():
    """Export agent configurations as YAML file"""
    try:
        config = get_config()
        config_file_path = config.config_file
        
        if not config_file_path.exists():
            raise HTTPException(
                status_code=404,
                detail="Configuration file not found"
            )
        
        logger.info("Exporting agent configurations")
        
        return FileResponse(
            path=str(config_file_path),
            filename=f"agent-config-export.yaml",
            media_type="application/x-yaml"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to export configs: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export configurations: {str(e)}"
        )

@router.get("/health")
async def admin_health_check():
    """Health check for admin API"""
    try:
        config = get_config()
        agents_data = config.get_all_agents()
        
        # Check if config file exists and is writable
        config_status = config.get_config_status()
        
        return {
            "status": "healthy",
            "service": "admin",
            "agents_count": len(agents_data),
            "config_status": config_status,
            "agents": list(agents_data.keys())
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "admin",
            "error": str(e)
        }

logger.info("Admin API routes loaded")