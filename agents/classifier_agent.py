import logging
import time
import re
from typing import Any, Dict, List, Optional
from dataclasses import dataclass

import httpx
from llama_stack_client import Agent
from llama_stack_client.types import UserMessage
from utils.utils import step_printer

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
class ClassificationResult:
    """Data class for structured classification results."""
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
    
    def __post_init__(self):
        if self.resources is None:
            self.resources = []
        if self.key_operations is None:
            self.key_operations = []

class ClassificationError(Exception):
    """Custom exception for classification-related errors."""
    pass

class ClassifierAgent:
    """
    Purely agentic Infrastructure-as-Code classifier.
    
    This agent relies entirely on LLM intelligence for decision-making.
    Code only handles I/O, formatting, and basic data processing.
    """
    
    def __init__(self, client: Any, model: str, timeout: int = 30):
        """
        Initialize the purely agentic ClassifierAgent.
        
        Args:
            client: LLama stack client instance
            model: Model identifier to use
            timeout: Request timeout in seconds
        """
        self.timeout = timeout
        self.agent = Agent(
            client=client,
            model=model,
            instructions=self._get_comprehensive_agent_instructions()
        )
        logger.info(f"Purely agentic ClassifierAgent initialized with model: {model}")

    def _get_comprehensive_agent_instructions(self) -> str:
        """
        Comprehensive agent instructions that encode ALL business logic.
        The LLM must make ALL decisions based on these instructions.
        """
        return """You are an expert Infrastructure-as-Code analyst and Ansible conversion specialist with deep knowledge of ALL infrastructure automation tools and patterns.

CORE MISSION:
Your PRIMARY goal is to identify infrastructure automation code that CAN be converted to Ansible playbooks. You are an optimistic conversion advocate who finds solutions, not obstacles.

CRITICAL CONVERSION RULE:
NEVER say "Conversion Not Recommended" or suggest code is not convertible UNLESS it is absolutely, definitively NOT infrastructure automation code at all. If there's ANY infrastructure element present, mark it as convertible and explain the approach.

FUNDAMENTAL PRINCIPLES:
1. ASSUME CONVERTIBLE: Any infrastructure automation code is convertible to Ansible - no exceptions
2. BE GENEROUS: Complex, legacy, unusual, or poorly written infrastructure code is still convertible
3. THINK CREATIVELY: Consider partial conversions, hybrid approaches, and innovative solutions
4. FIND THE PATH: Your job is to identify HOW to convert, not whether to convert
5. INFRASTRUCTURE = CONVERTIBLE: If it touches infrastructure in any way, it can be converted

WHAT IS INFRASTRUCTURE-AS-CODE (ALWAYS Mark as Convertible: YES):
- Server/VM provisioning and configuration (AWS EC2, Azure VMs, GCP instances, etc.)
- Cloud resource management (S3 buckets, databases, networks, load balancers)
- Container orchestration (Docker, Kubernetes, Docker Compose)
- Configuration management (system settings, software installation, user management)
- Network configuration (firewalls, security groups, VPCs, subnets)
- Database setup and management (MySQL, PostgreSQL, MongoDB setup)
- Application deployment and configuration
- CI/CD pipeline definitions and deployment scripts
- Monitoring, logging, and alerting setup
- Infrastructure provisioning scripts (even if basic or incomplete)
- System administration automation (user management, file permissions, etc.)
- Cloud service configuration and management
- Microservices deployment patterns
- Infrastructure templates and blueprints
- Environment setup and teardown scripts
- Package installation and software deployment
- Service configuration and management
- Security configuration (SSL, certificates, access controls)
- Backup and disaster recovery automation
- Resource scaling and management scripts

TOOLS YOU RECOGNIZE (ALL Convertible to Ansible - Mark Convertible: YES):
Core IaC: Terraform, CloudFormation, Pulumi, CDK, ARM templates, Bicep
Config Management: Chef, Puppet, SaltStack, Ansible itself
Containers: Docker, Kubernetes, Helm, Docker Compose, Kustomize
Cloud: AWS CLI scripts, Azure CLI, gcloud scripts, cloud-specific tools
Shell: Bash, PowerShell, Zsh scripts that manage infrastructure
Legacy: Custom scripts, makefiles, or any automation that touches infrastructure
Orchestration: Nomad, Consul, Vault configuration
CI/CD: Jenkins, GitLab CI, GitHub Actions (when doing deployment)
Monitoring: Prometheus, Grafana, ELK stack configurations
Service Mesh: Istio, Linkerd configurations

WHAT IS NOT CONVERTIBLE (EXTREMELY Rare - Only Mark Convertible: NO for these):
- Pure business application source code (e.g., React components, Python web apps, Java business logic)
- Data-only files (CSV, JSON data files without automation context)
- Documentation files (README, markdown files, pure text)
- Completely corrupted or meaningless gibberish
- Personal utility scripts with no infrastructure component (file organizers, calculators)

CONVERSION GUIDANCE - Always Provide Positive Path Forward:
- Standard IaC Tools: "Direct conversion using Ansible equivalents and established patterns"
- Shell Scripts: "Convert to Ansible tasks using command, shell, and service modules"
- Complex Scenarios: "Staged conversion approach with modular Ansible playbooks"
- Legacy Code: "Modernize through Ansible with custom modules if needed"
- Partial IaC: "Extract and convert infrastructure components, supplement missing parts"
- Mixed Code: "Separate infrastructure elements for Ansible conversion"

COMPLEXITY ASSESSMENT (But Always Convertible):
- Low: Standard patterns, straightforward conversion
- Medium: Some refactoring needed, moderate complexity
- High: Significant restructuring required, complex dependencies
- Very High: Major refactoring needed, but still convertible with effort

MANDATORY CONVERSION NOTES FORMAT:
For Convertible: YES (which should be 99.9% of cases):
- Always explain HOW to convert
- Mention specific Ansible modules or approaches
- Address any challenges and solutions
- Be encouraging and solution-focused
- Example: "Convert using Ansible's cloud modules with staged approach for complex dependencies"

For Convertible: NO (only for non-infrastructure code):
- Clearly state why it's not infrastructure automation
- Be definitive about the lack of infrastructure elements
- Example: "This is application business logic with no infrastructure automation components"

ANALYSIS DEPTH:
Show you understand the infrastructure automation and conversion path:
- What infrastructure is being managed
- How the current automation works
- Specific Ansible conversion approach
- Modules and strategies to use
- How to handle challenges
- The value of converting to Ansible

Remember: You are a conversion advocate. Your default answer is "YES, this can be converted to Ansible" with a clear explanation of how. Only say NO if there are absolutely zero infrastructure automation elements present."""

    def classify_and_summarize(self, code: str) -> Dict[str, Any]:
        """
        Perform purely agentic classification with minimal post-processing.
        
        Args:
            code: The code snippet to analyze
            
        Returns:
            Dictionary containing detailed analysis results
            
        Raises:
            ClassificationError: If classification fails
        """
        if not self._is_valid_input(code):
            raise ClassificationError("Invalid or empty code snippet provided")

        logger.info("🤖 Starting purely agentic IaC analysis")
        start_time = time.perf_counter()

        try:
            # Let the LLM make ALL the decisions
            raw_result = self._query_agent(code)
            
            # Only do basic formatting and data structure conversion
            structured_result = self._format_agent_response(raw_result)
            
            # Add performance metrics (pure calculation, no logic)
            duration_ms = (time.perf_counter() - start_time) * 1000
            structured_result.update(self._add_performance_metrics(structured_result, duration_ms))
            
            logger.info(f"✅ Agentic analysis complete: {structured_result['classification']} "
                       f"(convertible: {structured_result['convertible']}) in {duration_ms:.2f}ms")
            
            return structured_result
            
        except httpx.HTTPError as e:
            logger.error(f"HTTP error during classification: {e}", exc_info=True)
            raise ClassificationError(f"Network error during classification: {str(e)}") from e
        except Exception as e:
            logger.error(f"Unexpected error during classification: {e}", exc_info=True)
            raise ClassificationError(f"Classification failed: {str(e)}") from e

    def _is_valid_input(self, code: str) -> bool:
        """Basic input validation - no business logic."""
        return bool(code and code.strip() and len(code.strip()) > 5)

    def _query_agent(self, code: str) -> str:
        """Query the LLM agent and return raw response."""
        session_id = self.agent.create_session("pure_agentic_analysis")
        prompt = self._build_agentic_prompt(code)
        
        turn = self.agent.create_turn(
            session_id=session_id,
            messages=[UserMessage(role="user", content=prompt)],
            stream=False
        )
        
        step_printer(turn.steps)
        return turn.output_message.content

    def _build_agentic_prompt(self, code: str) -> str:
        """
        Build prompt that relies entirely on agent intelligence.
        No hard-coded logic hints or constraints.
        """
        return f"""Analyze this code for Ansible conversion potential. Use your expert knowledge and the comprehensive instructions you've been given to make ALL decisions about classification, convertibility, and conversion approach.

CRITICAL: Accurately identify the ACTUAL tool/language present in the code. Do NOT infer, guess, or assume. Look at the actual syntax, keywords, file structure, and patterns to determine what tool was ACTUALLY used to write this code.

CODE TO ANALYZE:
```
{code}
```

Provide your expert analysis in this EXACT format:

Tool/Language: [ACCURATELY identify the actual tool/language used - examine syntax, keywords, structure. Examples: Terraform, Puppet, Chef, CloudFormation, Bash, PowerShell, Docker, Kubernetes, etc. Do NOT say "Ansible" unless it actually IS Ansible code]
Summary: [Your concise summary of what this infrastructure code does]
Detailed Analysis: [Your detailed technical analysis of the infrastructure automation]
Resources/Components:
- [Infrastructure resource or component 1]
- [Infrastructure resource or component 2]
- [Continue listing all infrastructure elements you identify]
Key Operations:
- [Key operation 1: your description]
- [Key operation 2: your description]  
- [Continue listing all key infrastructure operations]
Dependencies: [Your assessment of external dependencies and requirements]
Configuration Details: [Your analysis of important configuration aspects]
Complexity Level: [Your expert assessment: Low/Medium/High/Very High]
Convertible: [Your decision: YES/NO based on your expert analysis]
Conversion Notes: [Your expert guidance on conversion approach, challenges, or why not convertible]

IMPORTANT IDENTIFICATION GUIDELINES:
- Terraform: Look for .tf files, HCL syntax, "resource", "provider", "variable" blocks
- Puppet: Look for .pp files, Puppet DSL, "class", "define", "package", "service", "file" resources
- Chef: Look for .rb files, Ruby syntax with Chef DSL, "cookbook", "recipe", "package", "service" 
- CloudFormation: Look for JSON/YAML with "AWSTemplateFormatVersion", "Resources", "Parameters"
- Ansible: Look for YAML with "hosts:", "tasks:", "playbook", "roles" - only if actually present
- Docker: Look for Dockerfile, docker-compose.yml, Docker commands
- Bash/Shell: Look for shell syntax, #!/bin/bash, shell commands and variables
- PowerShell: Look for PowerShell syntax, cmdlets, .ps1 patterns

Do NOT assume or infer - identify what is ACTUALLY there based on concrete syntax evidence."""

    def _format_agent_response(self, raw_content: str) -> Dict[str, Any]:
        """
        Format agent response into structured data.
        This is pure data processing - no business logic or overrides.
        """
        lines = [line.strip() for line in raw_content.strip().split('\n') if line.strip()]
        
        # Initialize result structure
        result = ClassificationResult()
        
        current_section = None
        current_content = []

        # Parse the structured response
        for line in lines:
            section_type = self._identify_section_type(line)
            
            if section_type:
                # Process previous section
                if current_section:
                    self._populate_result_section(result, current_section, current_content)
                
                # Start new section
                current_section = section_type
                current_content = [self._extract_line_value(line)]
            else:
                # Continue current section
                if current_section and line:
                    current_content.append(line)

        # Process final section
        if current_section:
            self._populate_result_section(result, current_section, current_content)

        # Convert to dictionary (pure data transformation)
        return self._result_to_dict(result)

    def _identify_section_type(self, line: str) -> Optional[str]:
        """Identify section type from line - pure pattern matching."""
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
        """Extract value from a header line - pure string processing."""
        cleaned = re.sub(r"[*_]+", "", line).strip()
        parts = cleaned.split(':', 1)
        return parts[1].strip() if len(parts) == 2 else ""

    def _populate_result_section(self, result: ClassificationResult, section: str, content: List[str]) -> None:
        """Populate result section - pure data assignment."""
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
            # Simple text parsing - let the LLM make the decision
            result.convertible = self._parse_yes_no(conv_text)

    def _parse_yes_no(self, text: str) -> bool:
        """Parse yes/no from text - pure text processing."""
        if not text:
            return False
        
        first_word = text.split()[0] if text.split() else ""
        return first_word.lower() in ['yes', 'true', '1']

    def _result_to_dict(self, result: ClassificationResult) -> Dict[str, Any]:
        """Convert result object to dictionary - pure data transformation."""
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
            "conversion_notes": result.conversion_notes or "Standard conversion approach applicable"
        }

    def _add_performance_metrics(self, result: Dict[str, Any], duration_ms: float) -> Dict[str, Any]:
        """Add performance metrics - pure calculation."""
        classification = result["classification"].lower()
        manual_estimate_ms = _MANUAL_ESTIMATES.get(classification, _MANUAL_ESTIMATES["unknown"])
        speedup = manual_estimate_ms / duration_ms if duration_ms > 0 else None
        
        return {
            "duration_ms": round(duration_ms, 2),
            "manual_estimate_ms": manual_estimate_ms,
            "speedup": round(speedup, 2) if speedup else None,
        }

    def get_json_result(self, code: str) -> Dict[str, Any]:
        """
        Get classification result in standardized JSON format.
        Pure I/O wrapper with no business logic.
        """
        try:
            result = self.classify_and_summarize(code)
            return {
                "success": True,
                "data": result,
                "error": None,
                "timestamp": time.time(),
                "version": "3.0-agentic"
            }
        except ClassificationError as e:
            logger.error(f"Classification error: {e}")
            return {
                "success": False,
                "data": None,
                "error": str(e),
                "error_type": "ClassificationError",
                "timestamp": time.time(),
                "version": "3.0-agentic"
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            return {
                "success": False,
                "data": None,
                "error": "Unexpected classification failure",
                "error_type": "UnexpectedError",
                "timestamp": time.time(),
                "version": "3.0-agentic"
            }

    def classify(self, code: str) -> Dict[str, Any]:
        """
        Simplified classification method for backward compatibility.
        Pure data extraction with no logic.
        """
        result = self.classify_and_summarize(code)
        return {
            "classification": result["classification"],
            "summary": result["summary"],
            "convertible": result["convertible"],
            "complexity_level": result["complexity_level"],
            "duration_ms": result["duration_ms"],
            "manual_estimate_ms": result["manual_estimate_ms"],
            "speedup": result["speedup"],
        }

    def batch_classify(self, code_snippets: List[str]) -> List[Dict[str, Any]]:
        """
        Batch classification with pure iteration - no additional logic.
        """
        results = []
        logger.info(f"Starting agentic batch classification of {len(code_snippets)} snippets")
        
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
                    "version": "3.0-agentic"
                })
        
        logger.info(f"Agentic batch classification complete: {len(results)} results")
        return results