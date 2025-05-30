# agents/classifier_agent.py
"""
Complete ClassifierAgent with config system integration.
Instructions are loaded from config/agents.yaml and can be updated via admin panel.
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

# Import our config system
from config.agent_config import get_agent_instructions, get_config

# Configure logging
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
class PatternAnalysis:
    likely_iac: bool = False
    detected_tool: str = "unknown"
    confidence_score: float = 0.0
    pattern_matches: Dict[str, int] = None
    strongest_indicators: List[str] = None
    
    def __post_init__(self):
        if self.pattern_matches is None:
            self.pattern_matches = {}
        if self.strongest_indicators is None:
            self.strongest_indicators = []

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
    # New fields for transparency
    pattern_analysis: PatternAnalysis = None
    confidence_source: str = "ai_only"
    override_applied: bool = False
    override_reason: str = ""
    original_ai_decision: Optional[bool] = None
    
    def __post_init__(self):
        if self.resources is None:
            self.resources = []
        if self.key_operations is None:
            self.key_operations = []
        if self.pattern_analysis is None:
            self.pattern_analysis = PatternAnalysis()

class ClassificationError(Exception):
    pass

class ClassifierAgent:
    def __init__(self, client: Any, model: str, timeout: int = 30):
        self.timeout = timeout
        self.client = client
        self.model = model
        self.config = get_config()
        
        # Initialize agent with config-driven instructions
        self._initialize_agent()
        
        # Keep track of last config version to detect changes
        self._last_instructions_hash = hash(self._get_current_instructions())
        
        # Pattern definitions for pre-screening
        self.iac_patterns = {
            'terraform': {
                'patterns': [
                    r'resource\s+"[\w_-]+"',
                    r'provider\s+"[\w_-]+"',
                    r'variable\s+"[\w_-]+"',
                    r'data\s+"[\w_-]+"',
                    r'output\s+"[\w_-]+"',
                    r'module\s+"[\w_-]+"'
                ],
                'keywords': ['terraform', '.tf', 'hcl']
            },
            'chef': {
                'patterns': [
                    r'cookbook\s+["\'][\w_-]+["\']',
                    r'recipe\s+["\'][\w_-]+["\']',
                    r'package\s+["\'][\w_-]+["\'].*do',
                    r'service\s+["\'][\w_-]+["\'].*do',
                    r'file\s+["\'][\w/_.-]+["\'].*do',
                    r'action\s+:(install|enable|start|stop|restart)'
                ],
                'keywords': ['chef', 'cookbook', 'recipe', 'do\s+action']
            },
            'puppet': {
                'patterns': [
                    r'class\s+[\w:_-]+',
                    r'define\s+[\w:_-]+',
                    r'package\s*\{[^}]*\}',
                    r'service\s*\{[^}]*\}',
                    r'file\s*\{[^}]*\}',
                    r'ensure\s*=>\s*(present|installed|running|stopped)',
                    r'notify\s*=>\s*Service\['
                ],
                'keywords': ['puppet', 'manifests', 'ensure =>', 'notify =>']
            },
            'ansible': {
                'patterns': [
                    r'^hosts:\s*\w+',
                    r'^tasks:\s*$',
                    r'^\s*-\s+name:\s*',
                    r'playbook',
                    r'roles:\s*$',
                    r'vars:\s*$'
                ],
                'keywords': ['ansible', 'playbook', 'hosts:', 'tasks:']
            },
            'cloudformation': {
                'patterns': [
                    r'AWSTemplateFormatVersion',
                    r'Resources:\s*$',
                    r'Parameters:\s*$',
                    r'Outputs:\s*$',
                    r'Type:\s*AWS::'
                ],
                'keywords': ['cloudformation', 'aws template', 'resources:']
            },
            'docker': {
                'patterns': [
                    r'^FROM\s+[\w/:.-]+',
                    r'^RUN\s+',
                    r'^COPY\s+',
                    r'^ADD\s+',
                    r'^WORKDIR\s+',
                    r'^EXPOSE\s+\d+',
                    r'^CMD\s+',
                    r'^ENTRYPOINT\s+'
                ],
                'keywords': ['dockerfile', 'docker', 'container']
            },
            'kubernetes': {
                'patterns': [
                    r'apiVersion:\s*[\w/]+',
                    r'kind:\s*\w+',
                    r'metadata:\s*$',
                    r'spec:\s*$',
                    r'selector:\s*$'
                ],
                'keywords': ['kubernetes', 'kubectl', 'k8s', 'apiversion']
            },
            'bash': {
                'patterns': [
                    r'#!/bin/bash',
                    r'#!/bin/sh',
                    r'systemctl\s+(start|stop|enable|disable)',
                    r'apt-get\s+(install|update|upgrade)',
                    r'yum\s+(install|update)',
                    r'service\s+\w+\s+(start|stop|restart)'
                ],
                'keywords': ['bash', 'shell', 'systemctl', 'service']
            },
            'powershell': {
                'patterns': [
                    r'Install-WindowsFeature',
                    r'New-Item\s+.*-ItemType',
                    r'Set-Service',
                    r'Start-Service',
                    r'Get-Service',
                    r'\$\w+\s*=\s*'
                ],
                'keywords': ['powershell', 'install-windowsfeature', 'set-service']
            }
        }
        
        logger.info(f"ClassifierAgent initialized with model: {model}")

    def _get_current_instructions(self) -> str:
        """Get current instructions from config system"""
        instructions = get_agent_instructions('classifier')
        if not instructions:
            # Fallback to default if config system fails
            logger.warning("No instructions found in config, using fallback")
            return self._get_fallback_instructions()
        return instructions

    def _get_fallback_instructions(self) -> str:
        """Fallback instructions if config system fails"""
        return """You are an expert Infrastructure-as-Code analyst with deep knowledge of infrastructure automation tools.

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

Provide balanced analysis based on what you actually observe in the code."""

    def _initialize_agent(self):
        """Initialize the LlamaStack agent with current config instructions"""
        try:
            current_instructions = self._get_current_instructions()
            self.agent = Agent(
                client=self.client,
                model=self.model,
                instructions=current_instructions
            )
            logger.info("ClassifierAgent initialized with config-driven instructions")
        except Exception as e:
            logger.error(f"Failed to initialize agent with config: {e}")
            # Create agent with fallback instructions
            self.agent = Agent(
                client=self.client,
                model=self.model,
                instructions=self._get_fallback_instructions()
            )
            logger.warning("ClassifierAgent initialized with fallback instructions")

    def _check_and_reload_config(self):
        """Check if config has changed and reload agent if needed"""
        try:
            current_instructions = self._get_current_instructions()
            current_hash = hash(current_instructions)
            
            if current_hash != self._last_instructions_hash:
                logger.info("Configuration change detected, reloading agent...")
                self._initialize_agent()
                self._last_instructions_hash = current_hash
                logger.info("Agent successfully reloaded with new configuration")
        except Exception as e:
            logger.error(f"Failed to check/reload config: {e}")

    def _pattern_based_screening(self, code: str) -> PatternAnalysis:
        """Lightweight pattern matching to identify obvious IaC with confidence scoring"""
        code_lower = code.lower()
        matches = {}
        found_indicators = []
        
        for tool, config in self.iac_patterns.items():
            tool_score = 0
            
            # Check regex patterns
            for pattern in config['patterns']:
                pattern_matches = len(re.findall(pattern, code, re.MULTILINE | re.IGNORECASE))
                if pattern_matches > 0:
                    tool_score += pattern_matches
                    found_indicators.append(f"{tool}:{pattern}")
            
            # Check keyword presence
            for keyword in config['keywords']:
                if re.search(r'\b' + re.escape(keyword.lower()) + r'\b', code_lower):
                    tool_score += 1
                    found_indicators.append(f"{tool}:keyword:{keyword}")
            
            matches[tool] = tool_score
        
        best_match = max(matches.items(), key=lambda x: x[1])
        total_matches = sum(matches.values())
        
        # Calculate confidence based on match strength and exclusivity
        if best_match[1] == 0:
            confidence = 0.0
        else:
            # Higher confidence if one tool dominates
            dominance = best_match[1] / max(total_matches, 1)
            # Confidence increases with number of matches
            match_strength = min(best_match[1] / 5.0, 1.0)
            confidence = dominance * match_strength
        
        return PatternAnalysis(
            likely_iac=best_match[1] > 0,
            detected_tool=best_match[0] if best_match[1] > 0 else "unknown",
            confidence_score=round(confidence, 3),
            pattern_matches=matches,
            strongest_indicators=found_indicators[:5]  # Top 5 indicators
        )

    def _build_enhanced_prompt(self, code: str, pattern_analysis: PatternAnalysis) -> str:
        """Build context-enhanced prompt for small models"""
        detected_tool = pattern_analysis.detected_tool
        
        # Tool-specific examples to help small models
        tool_examples = {
            'chef': """
CHEF CODE PATTERNS TO RECOGNIZE:
- cookbook 'apache2'
- package 'httpd' do action :install end
- service 'apache2' do action [:enable, :start] end
- file '/etc/config' do content 'data' end
            """,
            'puppet': """
PUPPET CODE PATTERNS TO RECOGNIZE:
- class apache::install { package { 'apache2': ensure => installed } }
- service { 'apache2': ensure => running, enable => true }
- file { '/etc/apache2/apache2.conf': ensure => present }
            """,
            'terraform': """
TERRAFORM CODE PATTERNS TO RECOGNIZE:
- resource "aws_instance" "web" { ami = "ami-12345" }
- provider "aws" { region = "us-east-1" }
- variable "instance_type" { default = "t2.micro" }
            """
        }
        
        context = ""
        if detected_tool in tool_examples:
            context = f"""
DETECTED TOOL: {detected_tool.upper()} (confidence: {pattern_analysis.confidence_score:.2f})
Pattern indicators found: {', '.join(pattern_analysis.strongest_indicators[:3])}

{tool_examples[detected_tool]}
"""
        
        return f"""{context}

Analyze this code for Ansible conversion potential:

<CODE>
{code}
</CODE>

Provide your analysis in this EXACT format:

Tool/Language: [The actual tool/language you identify from the code syntax]
Summary: [Concise summary of what this code does]
Detailed Analysis: [Technical analysis of the infrastructure automation]
Resources/Components:
- [Infrastructure resource 1]
- [Infrastructure resource 2]
Key Operations:
- [Key operation 1]
- [Key operation 2]
Dependencies: [External dependencies and requirements]
Configuration Details: [Important configuration aspects]
Complexity Level: [Low/Medium/High/Very High]
Convertible: [YES/NO - can this be converted to Ansible?]
Conversion Notes: [How to convert or why not convertible]"""

    def _make_intelligent_decision(self, pattern_analysis: PatternAnalysis, ai_result: ClassificationResult) -> ClassificationResult:
        """Combine pattern analysis and AI decision intelligently"""
        
        # High confidence pattern analysis can override false negatives
        if (pattern_analysis.confidence_score >= 0.7 and 
            pattern_analysis.likely_iac and 
            not ai_result.convertible and
            pattern_analysis.detected_tool in ['chef', 'puppet', 'terraform', 'ansible', 'cloudformation']):
            
            # Apply transparent override
            ai_result.convertible = True
            ai_result.override_applied = True
            ai_result.override_reason = f"High-confidence {pattern_analysis.detected_tool} patterns detected (score: {pattern_analysis.confidence_score:.2f})"
            ai_result.original_ai_decision = False
            ai_result.conversion_notes += f" [Override Applied: {ai_result.override_reason}]"
            ai_result.confidence_source = "pattern_override"
            
            logger.info(f"Applied intelligent override: {ai_result.override_reason}")
            
        # Medium confidence - add context but trust AI
        elif pattern_analysis.confidence_score >= 0.4:
            ai_result.confidence_source = "ai_with_pattern_context"
            
        # Low confidence - pure AI decision
        else:
            ai_result.confidence_source = "ai_only"
        
        # Always add pattern analysis for transparency
        ai_result.pattern_analysis = pattern_analysis
        
        return ai_result

    def classify_and_summarize(self, code: str) -> Dict[str, Any]:
        """Enhanced classification with two-stage analysis and config checking"""
        if not self._is_valid_input(code):
            raise ClassificationError("Invalid or empty code snippet provided")

        # Check for config changes before processing
        self._check_and_reload_config()

        logger.info("🤖 Starting config-driven two-stage IaC analysis")
        start_time = time.perf_counter()

        try:
            # Stage 1: Pattern-based pre-screening
            pattern_analysis = self._pattern_based_screening(code)
            logger.info(f"📊 Pattern analysis: {pattern_analysis.detected_tool} "
                       f"(confidence: {pattern_analysis.confidence_score:.2f})")

            # Stage 2: AI analysis with context
            if pattern_analysis.confidence_score >= 0.3:
                enhanced_prompt = self._build_enhanced_prompt(code, pattern_analysis)
                raw_result = self._query_agent_with_enhanced_prompt(enhanced_prompt)
            else:
                raw_result = self._query_agent(code)

            # Parse and structure the result
            structured_result = self._format_agent_response(raw_result)
            
            # Stage 3: Intelligent decision making
            final_result = self._make_intelligent_decision(pattern_analysis, structured_result)
            
            # Add performance metrics
            duration_ms = (time.perf_counter() - start_time) * 1000
            result_dict = self._result_to_dict(final_result)
            result_dict.update(self._add_performance_metrics(result_dict, duration_ms))
            
            # Add config metadata
            result_dict['config_source'] = 'dynamic_config'
            result_dict['instructions_hash'] = self._last_instructions_hash
            
            logger.info(f"✅ Config-driven analysis complete: {result_dict['classification']} "
                       f"(convertible: {result_dict['convertible']}, "
                       f"source: {result_dict['confidence_source']}) in {duration_ms:.2f}ms")
            
            return result_dict
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during classification: {e}", exc_info=True)
            raise ClassificationError(f"Network error during classification: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error during classification: {e}", exc_info=True)
            raise ClassificationError(f"Classification failed: {str(e)}") from e

    def _query_agent_with_enhanced_prompt(self, enhanced_prompt: str) -> str:
        """Query agent with enhanced context"""
        session_id = self.agent.create_session("enhanced_analysis")
        turn = self.agent.create_turn(
            session_id=session_id,
            messages=[UserMessage(role="user", content=enhanced_prompt)],
            stream=False
        )
        step_printer(turn.steps)
        return turn.output_message.content

    def _is_valid_input(self, code: str) -> bool:
        return bool(code and code.strip() and len(code.strip()) > 5)

    def _query_agent(self, code: str) -> str:
        """Standard agent query - maintains original behavior"""
        session_id = self.agent.create_session("pure_agentic_analysis")
        prompt = self._build_standard_prompt(code)
        turn = self.agent.create_turn(
            session_id=session_id,
            messages=[UserMessage(role="user", content=prompt)],
            stream=False
        )
        step_printer(turn.steps)
        return turn.output_message.content

    def _build_standard_prompt(self, code: str) -> str:
        """Standard prompt without pattern context"""
        return f"""Analyze this code for Ansible conversion potential:

<CODE>
{code}
</CODE>

Provide your analysis in this EXACT format:

Tool/Language: [The actual tool/language you identify]
Summary: [Concise summary]
Detailed Analysis: [Technical analysis]
Resources/Components:
- [Resource 1]
- [Resource 2]
Key Operations:
- [Operation 1]
- [Operation 2]
Dependencies: [Dependencies]
Configuration Details: [Configuration aspects]
Complexity Level: [Low/Medium/High/Very High]
Convertible: [YES/NO]
Conversion Notes: [Conversion approach or reasoning]"""

    def _format_agent_response(self, raw_content: str) -> ClassificationResult:
        """Parse agent response into structured result"""
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
            result.convertible = self._parse_yes_no(conv_text)

    def _parse_yes_no(self, text: str) -> bool:
        if not text:
            return False
        return bool(re.search(r"\byes\b", text, re.I))

    def _result_to_dict(self, result: ClassificationResult) -> Dict[str, Any]:
        """Convert result to dictionary with transparency fields"""
        base_dict = {
            "classification": result.classification or "unknown",
            "summary": result.summary or "Analysis completed",
            "detailed_analysis": result.detailed_analysis or "No detailed analysis provided",
            "resources": result.resources or [],
            "key_operations": result.key_operations or [],
            "dependencies": result.dependencies or "None specified",
            "configuration_details": result.configuration_details or "Standard configuration",
            "complexity_level": result.complexity_level or "Medium",
            "convertible": result.convertible,
            "conversion_notes": result.conversion_notes or "Standard conversion approach applicable"
        }
        
        # Add transparency fields
        if hasattr(result, 'confidence_source'):
            transparency_fields = {
                "confidence_source": result.confidence_source,
                "override_applied": result.override_applied,
                "pattern_analysis": {
                    "detected_tool": result.pattern_analysis.detected_tool,
                    "confidence_score": result.pattern_analysis.confidence_score,
                    "likely_iac": result.pattern_analysis.likely_iac,
                    "strongest_indicators": result.pattern_analysis.strongest_indicators
                }
            }
            
            if result.override_applied:
                transparency_fields.update({
                    "override_reason": result.override_reason,
                    "original_ai_decision": result.original_ai_decision
                })
            
            base_dict.update(transparency_fields)
        return base_dict

    def _add_performance_metrics(self, result: Dict[str, Any], duration_ms: float) -> Dict[str, Any]:
        classification = result["classification"].lower()
        manual_estimate_ms = _MANUAL_ESTIMATES.get(classification, _MANUAL_ESTIMATES["unknown"])
        speedup = manual_estimate_ms / duration_ms if duration_ms > 0 else None
        return {
            "duration_ms": round(duration_ms, 2),
            "manual_estimate_ms": manual_estimate_ms,
            "speedup": round(speedup, 2) if speedup else None,
        }

    # Backward compatibility methods
    def get_json_result(self, code: str) -> Dict[str, Any]:
        try:
            result = self.classify_and_summarize(code)
            return {
                "success": True,
                "data": result,
                "error": None,
                "timestamp": time.time(),
                "version": "4.0-config-enhanced"
            }
        except ClassificationError as e:
            logger.error(f"Classification error: {e}")
            return {
                "success": False,
                "data": None,
                "error": str(e),
                "error_type": "ClassificationError",
                "timestamp": time.time(),
                "version": "4.0-config-enhanced"
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            return {
                "success": False,
                "data": None,
                "error": "Unexpected classification failure",
                "error_type": "UnexpectedError",
                "timestamp": time.time(),
                "version": "4.0-config-enhanced"
            }

    def classify(self, code: str) -> Dict[str, Any]:
        result = self.classify_and_summarize(code)
        return {
            "classification": result["classification"],
            "summary": result["summary"],
            "convertible": result["convertible"],
            "complexity_level": result["complexity_level"],
            "confidence_source": result["confidence_source"],
            "override_applied": result["override_applied"],
            "duration_ms": result["duration_ms"],
            "manual_estimate_ms": result["manual_estimate_ms"],
            "speedup": result["speedup"],
        }

    def batch_classify(self, code_snippets: List[str]) -> List[Dict[str, Any]]:
        results = []
        logger.info(f"Starting config-driven batch classification of {len(code_snippets)} snippets")
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
                    "version": "4.0-config-enhanced"
                })
        logger.info(f"Config-driven batch classification complete: {len(results)} results")
        return results

    def reload_config(self):
        """Manually reload configuration - useful for testing"""
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
            "config_status": self.config.get_config_status()
        }