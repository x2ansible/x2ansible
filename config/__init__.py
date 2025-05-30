# config/__init__.py
"""
Configuration management package for x2Ansible.
Provides centralized agent configuration with file-based persistence.
"""

from .agent_config import (
    AgentConfigManager,
    get_config,
    get_agent_instructions,
    update_agent_instructions
)

__all__ = [
    'AgentConfigManager',
    'get_config', 
    'get_agent_instructions',
    'update_agent_instructions'
]