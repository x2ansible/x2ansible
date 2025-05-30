# config/agent_config.py - Fixed version
"""
Production-grade configuration system for AI agents.
Manages agent instructions and settings with file-based persistence.
"""

import os
import yaml
import logging
from typing import Dict, Any, Optional
from pathlib import Path
from datetime import datetime
import fcntl
import tempfile

logger = logging.getLogger(__name__)

class AgentConfigManager:
    """Production configuration manager for AI agents"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
            
        self.config_file = Path("config/agents.yaml")
        self.backup_dir = Path("config/backups")
        self.config_data = {}
        
        # Ensure directories exist
        self.config_file.parent.mkdir(parents=True, exist_ok=True)
        self.backup_dir.mkdir(parents=True, exist_ok=True)
        
        self._load_config()
        self._initialized = True
        
        logger.info(f"AgentConfigManager initialized: {self.config_file}")
        
    def _load_config(self):
        """Load configuration from YAML file with error handling"""
        try:
            if self.config_file.exists():
                with open(self.config_file, 'r', encoding='utf-8') as f:
                    self.config_data = yaml.safe_load(f) or {}
                logger.info(f"Configuration loaded: {len(self.config_data.get('agents', {}))} agents")
            else:
                logger.warning(f"Config file not found: {self.config_file}")
                self._create_default_config()
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            self._create_default_config()
    
    def _create_default_config(self):
        """Create default configuration file with all 5 agents"""
        self.config_data = {
            'version': '1.0',
            'created_at': datetime.utcnow().isoformat(),
            'agents': {
                'classifier': {
                    'name': 'Classification Agent',
                    'description': 'Analyzes code to determine if it\'s infrastructure-as-code',
                    'instructions': '''You are an expert Infrastructure-as-Code analyst with deep knowledge of infrastructure automation tools.

MISSION:
Analyze code to determine if it's infrastructure automation that can be converted to Ansible playbooks.

INFRASTRUCTURE-AS-CODE INDICATORS:
Look for these patterns that indicate infrastructure automation:

TERRAFORM: resource, provider, variable blocks; HCL syntax; AWS/Azure/GCP resources
CHEF: cookbook, recipe keywords; package/service/file resources; Ruby syntax with do/end
PUPPET: class, define keywords; package/service/file resources; ensure => syntax
ANSIBLE: hosts:, tasks:, playbook structure; YAML format
CLOUDFORMATION: AWSTemplateFormatVersion, Resources, AWS:: types
DOCKER: FROM, RUN, COPY instructions; container definitions
KUBERNETES: apiVersion, kind, metadata; YAML manifests
BASH/SHELL: systemctl, apt-get, yum, service commands for system management
POWERSHELL: Install-WindowsFeature, Set-Service, system administration cmdlets

WHAT IS INFRASTRUCTURE-AS-CODE:
- Server/VM provisioning and configuration
- Cloud resource management (databases, networks, storage)
- Container orchestration and deployment
- System configuration (users, services, packages)
- Application deployment automation
- Network and security configuration
- Infrastructure provisioning and management

Provide balanced analysis based on what you actually observe in the code.''',
                    'status': 'active',
                    'version': '4.0-enhanced',
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                },
                'context': {
                    'name': 'Context Agent',
                    'description': 'Retrieves relevant context from vector database using RAG',
                    'instructions': '''You are a specialized context retrieval assistant focused on finding the most relevant, actionable information from the knowledge base.

MISSION:
Retrieve high-quality context from the vector database using RAG knowledge_search tool for infrastructure automation queries.

CORE RESPONSIBILITIES:
1. ALWAYS invoke the knowledge_search tool to find relevant patterns, documentation, and best practices
2. Focus on retrieving context that directly relates to the input code or question
3. Prioritize actionable information over theoretical concepts
4. Deduplicate and filter results to ensure only high-relevance content

SEARCH STRATEGY:
- Use specific keywords from the input code (tool names, resource types, operations)
- Look for similar patterns and configurations in the knowledge base
- Find best practices and common pitfalls for the detected technology
- Retrieve examples of successful conversions to Ansible

QUALITY FILTERING:
- Remove boilerplate text and generic documentation
- Exclude redundant or duplicate information
- Focus on practical implementation details
- Ensure context is directly applicable to the conversion task

OUTPUT FORMAT:
Return only the retrieved context chunks. Do NOT provide your own analysis or conversion suggestions.
If no relevant documents are found, reply: "No relevant patterns found for this input."''',
                    'status': 'active',
                    'version': '2.1.0',
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                },
                'codegen': {
                    'name': 'Code Generator Agent',
                    'description': 'Converts infrastructure code to Ansible playbooks',
                    'instructions': '''You are an expert in Ansible playbook generation.

MISSION:
Given INPUT CODE and CONTEXT, generate a single, production-ready Ansible playbook.

CONVERSION PRINCIPLES:
1. Maintain the original intent and functionality of the source code
2. Follow Ansible best practices and idempotency principles
3. Use appropriate Ansible modules for each resource type
4. Include proper error handling and validation
5. Add meaningful variable names and documentation

OUTPUT REQUIREMENTS:
- Generate complete, runnable Ansible playbook
- Follow Ansible best practices and conventions
- Use YAML comments for essential explanations
- Output only the playbook YAML content
- Do NOT use Markdown code blocks or code fences
- Your response must start with '---' and contain no extra blank lines at start or end

BEST PRACTICES:
- Use handlers for service restarts
- Implement proper variable usage for flexibility
- Add tags for selective execution
- Include check mode compatibility
- Use block/rescue for error handling
- Follow YAML formatting standards''',
                    'status': 'active',
                    'version': '3.0.0',
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                },
                'validation': {
                    'name': 'Validation Agent',
                    'description': 'Validates Ansible playbooks using custom linting tools',
                    'instructions': '''You are an expert Ansible playbook validation agent.

MISSION:
Validate Ansible playbooks for syntax correctness, best practices compliance, security issues, and operational readiness.

YOUR ROLE:
1. Always use the ansible_lint_tool when asked to validate a playbook (never answer directly, never guess)
2. Analyze and explain the lint results for users (status, errors, fixes, why it matters)
3. Be thorough, clear, and educational in your response

VALIDATION CATEGORIES:
1. SYNTAX VALIDATION: YAML syntax, Ansible-specific syntax, variable and template syntax
2. BEST PRACTICES: Task naming conventions, proper use of handlers, idempotency principles
3. SECURITY ANALYSIS: Hardcoded secrets, unsafe permissions, privilege escalation patterns
4. PERFORMANCE: Efficient task ordering, proper conditionals, loop optimization
5. OPERATIONAL READINESS: Error handling, proper logging, check mode compatibility

ISSUE SEVERITY LEVELS:
- CRITICAL: Security vulnerabilities, syntax errors that prevent execution
- HIGH: Best practice violations that could cause failures
- MEDIUM: Suboptimal patterns that reduce maintainability
- LOW: Style and consistency improvements
- INFO: Suggestions for enhancement

Always call the tool first, then provide comprehensive analysis of the results.''',
                    'status': 'active',
                    'version': '2.0.5',
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                },
                'spec': {
                    'name': 'Specification Agent',
                    'description': 'Generates technical specifications for infrastructure conversion',
                    'instructions': '''You are a technical specification expert for infrastructure-as-code conversion to Ansible.

MISSION:
Analyze input code and context to generate a comprehensive technical specification that will guide Ansible playbook generation.

OUTPUT FORMAT: Provide a structured specification with these sections:

## Requirements
- List specific functional requirements extracted from the code
- Include deployment, configuration, and operational requirements

## Goals  
- Primary objectives of the infrastructure setup
- Expected outcomes and deliverables

## Constraints
- Technical limitations or requirements
- Platform-specific considerations
- Security or compliance requirements

## Infrastructure Components
- Key resources, services, or components identified
- Dependencies and relationships

## Conversion Strategy
- Recommended approach for Ansible conversion
- Suggested task organization and structure

## Complexity Assessment
- Overall complexity level (Low/Medium/High/Expert)
- Key challenges or considerations

## Estimated Tasks
- Approximate number of Ansible tasks needed

Be concise but comprehensive. Focus on actionable technical details that will enable effective Ansible playbook generation.''',
                    'status': 'active',
                    'version': '1.5.0',
                    'created_at': datetime.utcnow().isoformat(),
                    'updated_at': datetime.utcnow().isoformat()
                }
            }
        }
        
        self._save_config()
        logger.info("Default agent configuration created with all 5 agents")
    
    def _create_backup(self) -> Optional[str]:
        """Create backup of current config before making changes"""
        if not self.config_file.exists():
            return None
            
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_path = self.backup_dir / f"agents_{timestamp}.yaml"
            
            import shutil
            shutil.copy2(self.config_file, backup_path)
            
            logger.info(f"Config backed up to: {backup_path}")
            return str(backup_path)
        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            return None
    
    def _save_config(self) -> bool:
        """Save configuration with atomic write and file locking"""
        try:
            # Create backup before saving
            self._create_backup()
            
            # Add metadata
            self.config_data['updated_at'] = datetime.utcnow().isoformat()
            
            # Atomic write using temporary file
            temp_path = self.config_file.with_suffix('.tmp')
            
            with open(temp_path, 'w', encoding='utf-8') as f:
                # Acquire exclusive lock
                fcntl.flock(f.fileno(), fcntl.LOCK_EX)
                
                # Write YAML with nice formatting
                yaml.dump(
                    self.config_data, 
                    f, 
                    default_flow_style=False, 
                    indent=2,
                    sort_keys=False
                )
                
                # Ensure data is written to disk
                f.flush()
                os.fsync(f.fileno())
            
            # Atomic rename (POSIX systems)
            temp_path.replace(self.config_file)
            
            logger.info(f"Configuration saved successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save config: {e}")
            return False
    
    def get_agent_instructions(self, agent_id: str) -> str:
        """Get instructions for specific agent"""
        try:
            return self.config_data.get('agents', {}).get(agent_id, {}).get('instructions', '')
        except Exception as e:
            logger.error(f"Failed to get instructions for {agent_id}: {e}")
            return ''
    
    def get_agent_config(self, agent_id: str) -> Dict[str, Any]:
        """Get full config for specific agent"""
        try:
            return self.config_data.get('agents', {}).get(agent_id, {})
        except Exception as e:
            logger.error(f"Failed to get config for {agent_id}: {e}")
            return {}
    
    def update_agent_instructions(self, agent_id: str, instructions: str) -> bool:
        """Update instructions for specific agent with validation"""
        try:
            if not instructions or not instructions.strip():
                raise ValueError("Instructions cannot be empty")
            
            if 'agents' not in self.config_data:
                self.config_data['agents'] = {}
            
            # Auto-create agent if it doesn't exist (for admin panel)
            if agent_id not in self.config_data['agents']:
                logger.info(f"Creating new agent configuration: {agent_id}")
                self.config_data['agents'][agent_id] = {
                    'name': f'{agent_id.title()} Agent',
                    'description': f'AI agent for {agent_id}',
                    'status': 'active',
                    'version': '1.0',
                    'created_at': datetime.utcnow().isoformat()
                }
            
            # Update instructions and metadata
            self.config_data['agents'][agent_id]['instructions'] = instructions.strip()
            self.config_data['agents'][agent_id]['updated_at'] = datetime.utcnow().isoformat()
            
            success = self._save_config()
            if success:
                logger.info(f"Instructions updated for agent: {agent_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to update instructions for {agent_id}: {e}")
            return False
    
    def get_all_agents(self) -> Dict[str, Dict[str, Any]]:
        """Get all agent configurations"""
        return self.config_data.get('agents', {})
    
    def reload_config(self):
        """Reload configuration from file"""
        try:
            self._load_config()
            logger.info("Configuration reloaded successfully")
        except Exception as e:
            logger.error(f"Failed to reload config: {e}")
    
    def get_config_status(self) -> Dict[str, Any]:
        """Get configuration system status"""
        return {
            'config_file': str(self.config_file),
            'config_exists': self.config_file.exists(),
            'config_readable': self.config_file.exists() and os.access(self.config_file, os.R_OK),
            'config_writable': self.config_file.exists() and os.access(self.config_file, os.W_OK),
            'agents_count': len(self.config_data.get('agents', {})),
            'last_updated': self.config_data.get('updated_at'),
            'backup_dir': str(self.backup_dir),
            'backup_dir_exists': self.backup_dir.exists()
        }

# Global instance
_config_instance = None

def get_config() -> AgentConfigManager:
    """Get the global configuration instance"""
    global _config_instance
    if _config_instance is None:
        _config_instance = AgentConfigManager()
    return _config_instance

# Convenience functions for agents
def get_agent_instructions(agent_id: str) -> str:
    """Get agent instructions"""
    return get_config().get_agent_instructions(agent_id)

def update_agent_instructions(agent_id: str, instructions: str) -> bool:
    """Update agent instructions"""
    return get_config().update_agent_instructions(agent_id, instructions)