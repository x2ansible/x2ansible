# config/url_config.py - Simple URL configuration helper
"""
URL configuration helper that works with config.yaml
Uses the active_profile system you already have.
"""

import os
import yaml
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from copy import deepcopy

logger = logging.getLogger(__name__)

class URLConfig:
    """Simple URL configuration using your existing config.yaml structure"""
    
    _instance = None
    _config = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(URLConfig, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        if self._config is None:
            self.load_config()
    
    def load_config(self):
        """Load configuration from your existing config.yaml"""
        config_file = Path("config.yaml")
        
        if not config_file.exists():
            logger.error("config.yaml not found!")
            self._config = {}
            return
        
        try:
            with open(config_file, 'r') as file:
                raw_config = yaml.safe_load(file)
            
            # Get active profile (same as your existing system)
            active_profile = os.environ.get("X2ANSIBLE_PROFILE", raw_config.get("active_profile", "local"))
            
            if active_profile not in raw_config.get("profiles", {}):
                logger.warning(f"Profile '{active_profile}' not found, using 'local'")
                active_profile = "local"
            
            # Merge defaults with active profile (same logic as your existing code)
            defaults = raw_config.get('defaults', {})
            profile_config = raw_config.get('profiles', {}).get(active_profile, {})
            self._config = self._deep_merge(deepcopy(defaults), profile_config)
            
            logger.info(f"URL configuration loaded with profile: {active_profile}")
            
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            self._config = {}
    
    def _deep_merge(self, base_dict: Dict, override_dict: Dict) -> Dict:
        """Deep merge two dictionaries"""
        for key, value in override_dict.items():
            if key in base_dict and isinstance(base_dict[key], dict) and isinstance(value, dict):
                self._deep_merge(base_dict[key], value)
            else:
                base_dict[key] = value
        return base_dict
    
    def get_llama_stack_url(self) -> str:
        """Get Llama Stack base URL"""
        return self._config.get('llama_stack', {}).get('base_url', 'http://localhost:8321')
    
    def get_frontend_url(self) -> str:
        """Get frontend URL from CORS origins"""
        origins = self._config.get('cors', {}).get('allow_origins', [])
        if origins:
            return origins[0]  # Return first origin
        return 'http://localhost:3000'
    
    def get_agent_endpoint(self, agent_name: str) -> str:
        """Get specific agent endpoint URL"""
        endpoints = self._config.get('agent_endpoints', {})
        return endpoints.get(agent_name, f'http://x2ansible-api:8000/api/{agent_name}')
    
    def get_api_base_url(self) -> str:
        """Extract base API URL from agent endpoints"""
        # Get any agent endpoint and extract the base URL
        endpoints = self._config.get('agent_endpoints', {})
        if endpoints:
            # Take first endpoint and extract base (e.g., "http://x2ansible-api:8000")
            first_endpoint = list(endpoints.values())[0]
            if '/api/' in first_endpoint:
                return first_endpoint.split('/api/')[0]
        return 'http://x2ansible-api:8000'
    
    def get_all_agent_endpoints(self) -> Dict[str, str]:
        """Get all agent endpoints"""
        return self._config.get('agent_endpoints', {})
    
    # Generic URL getter
    def get_url(self, path: str, default: str = None) -> str:
        """Get any URL from config using dot notation"""
        keys = path.split('.')
        current = self._config
        
        try:
            for key in keys:
                current = current[key]
            return current
        except (KeyError, TypeError):
            return default

# Global instance
_url_config = None

def get_url_config() -> URLConfig:
    """Get the global URL configuration instance"""
    global _url_config
    if _url_config is None:
        _url_config = URLConfig()
    return _url_config

# Convenience functions to replace hardcoded URLs
def get_llama_stack_url() -> str:
    """Get Llama Stack URL"""
    return get_url_config().get_llama_stack_url()

def get_frontend_url() -> str:
    """Get frontend URL"""
    return get_url_config().get_frontend_url()

def get_api_base_url() -> str:
    """Get API base URL"""
    return get_url_config().get_api_base_url()

def get_agent_endpoint(agent_name: str) -> str:
    """Get agent endpoint URL"""
    return get_url_config().get_agent_endpoint(agent_name)

def get_all_agent_endpoints() -> Dict[str, str]:
    """Get all agent endpoints"""
    return get_url_config().get_all_agent_endpoints()

# Generic function for any config value
def get_config_url(path: str, default: str = None) -> str:
    """Get any URL from config using dot notation"""
    return get_url_config().get_url(path, default)