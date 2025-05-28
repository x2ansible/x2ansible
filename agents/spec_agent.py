# agents/spec_agent.py

import logging
import json
from typing import Optional, Dict, Any, List
from dataclasses import dataclass
from llama_stack_client.types import UserMessage

logger = logging.getLogger(__name__)

@dataclass
class SpecificationOutput:
    """Structured output from the spec agent"""
    requirements: List[str]
    goals: List[str] 
    constraints: List[str]
    infrastructure_components: List[str]
    conversion_strategy: str
    complexity_assessment: str
    estimated_tasks: int
    raw_spec: str

class SpecAgent:
    def __init__(self, base_url: str, model_id: str, vector_db_id: str):
        try:
            from llama_stack_client import LlamaStackClient, Agent
            self.client = LlamaStackClient(base_url=base_url)
            self.model_id = model_id
            self.vector_db_id = vector_db_id
            
            # Enhanced instructions for better spec generation
            self.agent = Agent(
                client=self.client,
                model=self.model_id,
                instructions=self._get_agent_instructions()
            )
            logger.info(f"✅ SpecAgent initialized with model: {model_id}")
            
        except Exception as e:
            logger.error(f"❌ Failed to initialize SpecAgent: {e}")
            raise

    def _get_agent_instructions(self) -> str:
        return """
You are a technical specification expert for infrastructure-as-code conversion to Ansible.

Your role is to analyze input code and context to generate a comprehensive technical specification that will guide Ansible playbook generation.

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

Be concise but comprehensive. Focus on actionable technical details that will enable effective Ansible playbook generation.
"""

    def generate_spec(self, code: str, context: Optional[str] = None, 
                     code_summary: Optional[str] = None) -> SpecificationOutput:
        """
        Generate a comprehensive technical specification from code and context
        
        Args:
            code: The input infrastructure code
            context: Retrieved context from vector database
            code_summary: Optional summary of the code structure
            
        Returns:
            SpecificationOutput: Structured specification object
        """
        try:
            prompt = self._build_prompt(code, context, code_summary)
            
            logger.info("🔄 Generating specification...")
            logger.debug(f"Prompt length: {len(prompt)} chars")
            
            # Create session and generate spec
            session_id = self.agent.create_session("spec_generation")
            turn = self.agent.create_turn(
                session_id=session_id,
                messages=[UserMessage(role="user", content=prompt)],
                stream=False
            )
            
            # Extract content from response
            raw_spec = self._extract_content(turn)
            
            if not raw_spec:
                raise RuntimeError("SpecAgent returned empty output")
                
            # Parse the structured output
            spec_output = self._parse_spec_output(raw_spec)
            
            logger.info(f"✅ Specification generated: {len(raw_spec)} chars, {spec_output.estimated_tasks} estimated tasks")
            return spec_output
            
        except Exception as e:
            logger.error(f"❌ Spec generation failed: {e}")
            raise RuntimeError(f"Failed to generate specification: {str(e)}")

    def _build_prompt(self, code: str, context: Optional[str], 
                     code_summary: Optional[str]) -> str:
        """Build the prompt for spec generation"""
        
        prompt_parts = []
        
        if context:
            prompt_parts.append(f"## RETRIEVED CONTEXT\n{context}\n")
            
        if code_summary:
            prompt_parts.append(f"## CODE SUMMARY\n{code_summary}\n")
            
        # Truncate code if too long (keep first and last parts)
        if len(code) > 8000:
            code_preview = code[:4000] + "\n\n... [TRUNCATED] ...\n\n" + code[-2000:]
            prompt_parts.append(f"## INPUT CODE\n{code_preview}\n")
        else:
            prompt_parts.append(f"## INPUT CODE\n{code}\n")
            
        prompt_parts.append("""
## TASK
Generate a comprehensive technical specification for converting this infrastructure code to Ansible.
Focus on practical, actionable requirements that will enable effective playbook generation.

Analyze the code structure, identify key components, and provide clear conversion guidance.
""")
        
        return "\n".join(prompt_parts)

    def _extract_content(self, turn) -> str:
        """Extract content from the LLM response"""
        # Try multiple ways to extract content
        output = getattr(turn, "output_message", None)
        if output and hasattr(output, "content"):
            return output.content.strip()
        elif hasattr(turn, "content"):
            return turn.content.strip()
        else:
            return str(turn).strip()

    def _parse_spec_output(self, raw_spec: str) -> SpecificationOutput:
        """Parse the raw specification into structured output"""
        
        # Initialize default values
        requirements = []
        goals = []
        constraints = []
        infrastructure_components = []
        conversion_strategy = "Standard Ansible conversion approach"
        complexity_assessment = "Medium"
        estimated_tasks = 10
        
        try:
            # Simple parsing logic - look for sections
            lines = raw_spec.split('\n')
            current_section = None
            
            for line in lines:
                line = line.strip()
                if not line:
                    continue
                    
                # Detect section headers
                if line.startswith('## Requirements'):
                    current_section = 'requirements'
                elif line.startswith('## Goals'):
                    current_section = 'goals'  
                elif line.startswith('## Constraints'):
                    current_section = 'constraints'
                elif line.startswith('## Infrastructure Components'):
                    current_section = 'components'
                elif line.startswith('## Conversion Strategy'):
                    current_section = 'strategy'
                elif line.startswith('## Complexity Assessment'):
                    current_section = 'complexity'
                elif line.startswith('## Estimated Tasks'):
                    current_section = 'tasks'
                elif line.startswith('- ') and current_section:
                    # Parse bullet points
                    item = line[2:].strip()
                    if current_section == 'requirements':
                        requirements.append(item)
                    elif current_section == 'goals':
                        goals.append(item)
                    elif current_section == 'constraints':
                        constraints.append(item)
                    elif current_section == 'components':
                        infrastructure_components.append(item)
                elif current_section and not line.startswith('#'):
                    # Parse paragraph content
                    if current_section == 'strategy':
                        conversion_strategy = line
                    elif current_section == 'complexity':
                        complexity_assessment = line
                    elif current_section == 'tasks':
                        # Try to extract number
                        import re
                        match = re.search(r'\d+', line)
                        if match:
                            estimated_tasks = int(match.group())
                            
        except Exception as e:
            logger.warning(f"Failed to parse spec structure: {e}")
            # Use defaults if parsing fails
            
        # Ensure we have at least some content
        if not requirements:
            requirements = ["Convert infrastructure code to Ansible playbook format"]
        if not goals:
            goals = ["Automate infrastructure deployment using Ansible"]
            
        return SpecificationOutput(
            requirements=requirements,
            goals=goals,
            constraints=constraints,
            infrastructure_components=infrastructure_components,
            conversion_strategy=conversion_strategy,
            complexity_assessment=complexity_assessment,
            estimated_tasks=estimated_tasks,
            raw_spec=raw_spec
        )

    def health_check(self) -> Dict[str, Any]:
        """Health check for the spec agent"""
        try:
            # Simple test generation
            test_spec = self.generate_spec(
                code="resource \"aws_instance\" \"test\" { ami = \"ami-12345\" }",
                context="Test context",
                code_summary="Simple AWS instance"
            )
            
            return {
                "status": "healthy",
                "model_id": self.model_id,
                "test_spec_length": len(test_spec.raw_spec),
                "estimated_tasks": test_spec.estimated_tasks
            }
        except Exception as e:
            return {
                "status": "unhealthy", 
                "error": str(e),
                "model_id": self.model_id
            }