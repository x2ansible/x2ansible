# agents/classifier_agent.py
"""
Analyze Code
"""

import logging
import time
import re
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

import httpx
from llama_stack_client import Agent
from llama_stack_client.types import UserMessage
from utils.utils import step_printer

from config.agent_config import get_agent_instructions, get_config

logger = logging.getLogger("ClassifierAgent")
logger.setLevel(logging.INFO)

# Performance estimates for manual conversion (in milliseconds)
_MANUAL_ESTIMATES: Dict[str, float] = {
    "terraform": 5 * 60 * 1000,
    "cloudformation": 5 * 60 * 1000,
    "chef": 7 * 60 * 1000,
    "puppet": 6 * 60 * 1000,
    "ansible": 4 * 60 * 1000,
    "bash": 3 * 60 * 1000,
    "powershell": 4 * 60 * 1000,
    "docker": 4 * 60 * 1000,
    "kubernetes": 6 * 60 * 1000,
    "helm": 5 * 60 * 1000,
    "vagrant": 4 * 60 * 1000,
    "packer": 5 * 60 * 1000,
    "unknown": 5 * 60 * 1000,
}

@dataclass
class ClassificationResult:
    classification: str = ""
    summary: str = ""
    detailed_analysis: str = ""
    resources: List[str] = None
    key_operations: List[str] = None
    dependencies: str = ""
    configuration_details: str = ""
    complexity_level: str = ""
    convertible: bool = True
    conversion_notes: str = ""
    confidence_source: str = "ai_semantic"
    
    def __post_init__(self):
        if self.resources is None:
            self.resources = []
        if self.key_operations is None:
            self.key_operations = []

class ClassificationError(Exception):
    pass

class ClassifierAgent:
    def __init__(self, client: Any, model: str, timeout: int = 30):
        self.timeout = timeout
        self.client = client
        self.model = model
        self.config = get_config()
        
        # Initialize agent with SMART semantic instructions
        self._initialize_agent()
        
        self._last_instructions_hash = hash(self._get_current_instructions())
        
        logger.info(f"SMART ClassifierAgent initialized with semantic analysis: {model}")

    def _get_current_instructions(self) -> str:
        """Get current instructions from config system"""
        instructions = get_agent_instructions('classifier')
        if not instructions:
            logger.warning("No instructions found in config, using smart semantic fallback")
            return self._get_smart_semantic_instructions()
        return instructions

    def _get_smart_semantic_instructions(self) -> str:
        """SMART semantic instructions that understand infrastructure automation conceptually"""
        return """You are an expert Infrastructure-as-Code analyst with deep understanding of automation concepts and Ansible capabilities.

MISSION: Analyze infrastructure code semantically and determine Ansible convertibility based on understanding, not rules.

SEMANTIC ANALYSIS APPROACH:
1. UNDERSTAND what the code is trying to accomplish
2. IDENTIFY the infrastructure operations being performed
3. ASSESS whether these operations can be achieved with Ansible

CONVERTIBILITY ASSESSMENT FRAMEWORK:

INFRASTRUCTURE AUTOMATION CONCEPTS TO ANALYZE:
- Package management (installing, updating software)
- Service management (starting, stopping, configuring services)
- File/template management (creating, copying, templating files)
- User/group management (creating users, setting permissions)
- System configuration (setting up environments, configurations)
- Cloud resource provisioning (creating VMs, networks, storage)
- Container management (building, deploying containers)

ANSIBLE CAPABILITY KNOWLEDGE:
- Ansible has extensive modules for package management across platforms
- Service management is core Ansible functionality
- File and template operations are fundamental Ansible features
- User management has dedicated Ansible modules
- Cloud provisioning has comprehensive collections (AWS, Azure, GCP, etc.)
- System administration tasks have broad module coverage
- Windows management is well-supported through ansible.windows collection

CONVERTIBILITY DECISION PROCESS:
✅ CONVERTIBLE when:
- Operations involve standard infrastructure management
- Tasks can be mapped to existing Ansible modules
- Logic follows configuration management patterns
- Even if complex, the operations are within Ansible's scope

❌ NOT CONVERTIBLE when:
- Operations are outside infrastructure automation scope
- Requires capabilities Ansible fundamentally lacks
- Would need extensive custom development beyond reasonable effort

ANALYSIS INSTRUCTIONS:
- Focus on WHAT the code does, not WHICH tool it uses
- Consider the infrastructure operations semantically
- Assess based on Ansible's actual capabilities
- Provide detailed reasoning for your convertibility decision
- Explain the conversion approach if convertible
- Be realistic but not overly restrictive

Remember: Configuration management tools (Chef, Puppet), infrastructure provisioning tools (Terraform, CloudFormation), and system scripts generally perform operations that Ansible is designed to handle."""

    def _initialize_agent(self):
        """Initialize agent with smart semantic instructions"""
        try:
            current_instructions = self._get_current_instructions()
            self.agent = Agent(
                client=self.client,
                model=self.model,
                instructions=current_instructions
            )
            logger.info("SMART ClassifierAgent initialized with semantic understanding")
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            self.agent = Agent(
                client=self.client,
                model=self.model,
                instructions=self._get_smart_semantic_instructions()
            )

    def _check_and_reload_config(self):
        """Check if config has changed and reload agent if needed"""
        try:
            current_instructions = self._get_current_instructions()
            current_hash = hash(current_instructions)
            
            if current_hash != self._last_instructions_hash:
                logger.info("Configuration change detected, reloading agent...")
                self._initialize_agent()
                self._last_instructions_hash = current_hash
        except Exception as e:
            logger.error(f"Failed to check/reload config: {e}")

    def classify_and_summarize(self, code: str) -> Dict[str, Any]:
        """SMART semantic classification without hardcoded rules"""
        if not self._is_valid_input(code):
            raise ClassificationError("Invalid or empty code snippet provided")

        self._check_and_reload_config()
        logger.info("🧠 Starting SMART semantic classification")
        start_time = time.perf_counter()

        try:
            # Single-stage semantic analysis
            raw_result = self._query_agent_semantic(code)
            structured_result = self._format_agent_response(raw_result)
            
            # Build result with semantic confidence
            duration_ms = (time.perf_counter() - start_time) * 1000
            result_dict = self._result_to_dict(structured_result)
            result_dict.update(self._add_performance_metrics(result_dict, duration_ms))
            
            logger.info(f"🧠 SMART semantic classification complete: {result_dict['classification']} "
                       f"(convertible: {result_dict['convertible']}) in {duration_ms:.2f}ms")
            
            return result_dict
            
        except Exception as e:
            logger.error(f"SMART classification failed: {e}", exc_info=True)
            raise ClassificationError(f"Classification failed: {str(e)}") from e

    def _query_agent_semantic(self, code: str) -> str:
        """Query agent with semantic analysis prompt - no hardcoded rules"""
        session_id = self.agent.create_session("semantic_analysis")
        
        prompt = f"""Analyze this infrastructure code with deep semantic understanding:

<CODE>
{code}
</CODE>

Provide comprehensive semantic analysis in this EXACT format:

Tool/Language: [Identify the tool/language]
Summary: [What does this code accomplish?]
Detailed Analysis: [Deep analysis of infrastructure operations]
Resources/Components:
- [Infrastructure component 1]
- [Infrastructure component 2]
Key Operations:
- [Infrastructure operation 1]
- [Infrastructure operation 2]
Dependencies: [External dependencies]
Configuration Details: [Configuration aspects]
Complexity Level: [Low/Medium/High/Very High]
Convertible: [YES/NO - Can these operations be achieved with Ansible?]
Conversion Notes: [Detailed conversion approach and reasoning]

SEMANTIC ANALYSIS GUIDELINES:
1. UNDERSTAND the infrastructure operations conceptually
2. CONSIDER what Ansible modules could achieve these operations
3. THINK about the conversion approach step-by-step
4. ASSESS complexity realistically but don't over-restrict
5. EXPLAIN your reasoning clearly

Focus on the infrastructure automation concepts, not syntax patterns. Consider whether the operations can be achieved with Ansible's extensive module ecosystem."""
        
        turn = self.agent.create_turn(
            session_id=session_id,
            messages=[UserMessage(role="user", content=prompt)],
            stream=False
        )
        step_printer(turn.steps)
        return turn.output_message.content

    def _is_valid_input(self, code: str) -> bool:
        return bool(code and code.strip() and len(code.strip()) > 5)

    def _format_agent_response(self, raw_content: str) -> ClassificationResult:
        """Parse agent response with improved convertible parsing"""
        lines = [line.strip() for line in raw_content.strip().split('\n') if line.strip()]
        result = ClassificationResult()
        current_section = None
        current_content = []

        for line in lines:
            section_type = self._identify_section_type(line)
            if section_type:
                if current_section:
                    self._populate_result_section(result, current_section, current_content)
                current_section = section_type
                current_content = [self._extract_line_value(line)]
            else:
                if current_section and line:
                    current_content.append(line)
        
        if current_section:
            self._populate_result_section(result, current_section, current_content)

        return result

    def _identify_section_type(self, line: str) -> Optional[str]:
        clean_line = line.lstrip('* ').strip().lower()
        section_patterns = {
            'tool/language:': 'classification',
            'summary:': 'summary',
            'detailed analysis:': 'detailed_analysis',
            'resources/components:': 'resources',
            'key operations:': 'key_operations',
            'dependencies:': 'dependencies',
            'configuration details:': 'configuration_details',
            'complexity level:': 'complexity_level',
            'convertible:': 'convertible',
            'conversion notes:': 'conversion_notes'
        }
        for pattern, section in section_patterns.items():
            if clean_line.startswith(pattern):
                return section
        return None

    def _extract_line_value(self, line: str) -> str:
        cleaned = re.sub(r"[*_]+", "", line).strip()
        parts = cleaned.split(':', 1)
        return parts[1].strip() if len(parts) == 2 else ""

    def _populate_result_section(self, result: ClassificationResult, section: str, content: List[str]) -> None:
        if not content:
            return
        if section == "classification":
            result.classification = content[0].strip()
        elif section in ["summary", "detailed_analysis", "dependencies",
                         "configuration_details", "complexity_level", "conversion_notes"]:
            text = ' '.join(content).strip()
            setattr(result, section, text)
        elif section in ["resources", "key_operations"]:
            items = []
            for line in content:
                line = line.strip()
                if line.startswith(('-', '•', '*')):
                    items.append(line[1:].strip())
                elif line and not line.startswith('['):
                    items.append(line)
            clean_items = [item.strip() for item in items if item.strip()]
            setattr(result, section, clean_items)
        elif section == "convertible":
            conv_text = ' '.join(content).lower().strip()
            # SMART parsing that looks for reasoning, not just keywords
            result.convertible = self._parse_convertible_intelligently(conv_text)

    def _parse_convertible_intelligently(self, text: str) -> bool:
        """Intelligent parsing of convertible response based on reasoning"""
        if not text:
            return True  # Default optimistic
        
        text = text.lower().strip()
        
        # Look for clear positive indicators
        positive_patterns = [
            r'\byes\b', r'\bconvertible\b', r'\bcan be converted\b', r'\bpossible\b',
            r'\bansible can\b', r'\bmodules available\b', r'\bdirect mapping\b'
        ]
        
        # Look for clear negative indicators
        negative_patterns = [
            r'\bno\b.*\bconvert', r'\bnot convertible\b', r'\bcannot be converted\b',
            r'\bimpossible\b', r'\bno ansible\b', r'\boutsaide.*scope\b'
        ]
        
        # Count positive vs negative indicators
        positive_count = sum(1 for pattern in positive_patterns if re.search(pattern, text))
        negative_count = sum(1 for pattern in negative_patterns if re.search(pattern, text))
        
        # Decision based on weight of evidence
        if positive_count > negative_count:
            return True
        elif negative_count > positive_count:
            return False
        else:
            # Tie or unclear - look for reasoning quality
            # If text is longer and detailed, likely convertible with explanation
            return len(text) > 20  # Detailed responses usually indicate convertible with approach

    def _result_to_dict(self, result: ClassificationResult) -> Dict[str, Any]:
        """Convert result to dictionary"""
        return {
            "classification": result.classification or "unknown",
            "summary": result.summary or "Analysis completed",
            "detailed_analysis": result.detailed_analysis or "No detailed analysis provided",
            "resources": result.resources or [],
            "key_operations": result.key_operations or [],
            "dependencies": result.dependencies or "None specified",
            "configuration_details": result.configuration_details or "Standard configuration",
            "complexity_level": result.complexity_level or "Medium",
            "convertible": result.convertible,
            "conversion_notes": result.conversion_notes or "Standard conversion approach applicable",
            "confidence_source": result.confidence_source
        }

    def _add_performance_metrics(self, result: Dict[str, Any], duration_ms: float) -> Dict[str, Any]:
        classification = result["classification"].lower()
        manual_estimate_ms = _MANUAL_ESTIMATES.get(classification, _MANUAL_ESTIMATES["unknown"])
        speedup = manual_estimate_ms / duration_ms if duration_ms > 0 else None
        return {
            "duration_ms": round(duration_ms, 2),
            "manual_estimate_ms": manual_estimate_ms,
            "speedup": round(speedup, 2) if speedup else None,
        }

    # Keep all existing API methods
    def get_json_result(self, code: str) -> Dict[str, Any]:
        try:
            result = self.classify_and_summarize(code)
            return {
                "success": True,
                "data": result,
                "error": None,
                "timestamp": time.time(),
                "version": "smart-semantic-1.0"
            }
        except ClassificationError as e:
            logger.error(f"Classification error: {e}")
            return {
                "success": False,
                "data": None,
                "error": str(e),
                "error_type": "ClassificationError",
                "timestamp": time.time(),
                "version": "smart-semantic-1.0"
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            return {
                "success": False,
                "data": None,
                "error": "Unexpected classification failure",
                "error_type": "UnexpectedError",
                "timestamp": time.time(),
                "version": "smart-semantic-1.0"
            }

    def classify(self, code: str) -> Dict[str, Any]:
        result = self.classify_and_summarize(code)
        return {
            "classification": result["classification"],
            "summary": result["summary"],
            "convertible": result["convertible"],
            "complexity_level": result["complexity_level"],
            "confidence_source": result["confidence_source"],
            "duration_ms": result["duration_ms"],
            "speedup": result["speedup"],
        }

    def batch_classify(self, code_snippets: List[str]) -> List[Dict[str, Any]]:
        results = []
        logger.info(f"Starting SMART semantic batch classification of {len(code_snippets)} snippets")
        for i, code in enumerate(code_snippets):
            try:
                result = self.get_json_result(code)
                result["batch_index"] = i
                results.append(result)
                if (i + 1) % 10 == 0:
                    logger.info(f"Processed {i+1}/{len(code_snippets)} snippets")
            except Exception as e:
                logger.error(f"Error processing snippet {i}: {e}")
                results.append({
                    "success": False,
                    "data": None,
                    "error": str(e),
                    "batch_index": i,
                    "timestamp": time.time(),
                    "version": "smart-semantic-1.0"
                })
        logger.info(f"SMART semantic batch classification complete: {len(results)} results")
        return results

    def reload_config(self):
        """Manually reload configuration"""
        logger.info("Manual config reload requested")
        self.config.reload_config()
        self._check_and_reload_config()

    def get_config_info(self) -> Dict[str, Any]:
        """Get information about current configuration"""
        current_instructions = self._get_current_instructions()
        return {
            "instructions_length": len(current_instructions),
            "instructions_hash": hash(current_instructions),
            "config_file_exists": self.config.config_file.exists(),
            "agent_initialized": hasattr(self, 'agent') and self.agent is not None,
            "config_status": self.config.get_config_status(),
            "analysis_approach": "semantic_understanding",
            "hardcoded_rules": False,
            "version": "smart-semantic-1.0"
        }