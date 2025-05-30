import uuid
import logging
from llama_stack_client import LlamaStackClient, Agent

# Import config system
from config.agent_config import get_agent_instructions, get_config

logger = logging.getLogger("ContextAgent")

class ContextAgent:
    def __init__(self, base_url, model, vector_db_id, timeout=30):
        self.client = LlamaStackClient(base_url=base_url)
        self.model = model
        self.vector_db_id = vector_db_id
        self.timeout = timeout
        self.config = get_config()
        self.agent_id = "context"  # Must match key in agents.yaml/config

        # Initialize agent with config-driven instructions
        self._initialize_agent()
        self._last_instructions_hash = hash(self._get_current_instructions())

    def _get_current_instructions(self):
        """Fetch current instructions from config system (or fallback)"""
        instructions = get_agent_instructions(self.agent_id)
        if not instructions:
            logger.warning("No instructions found in config, using fallback.")
            return self._get_fallback_instructions()
        return instructions

    def _get_fallback_instructions(self):
        """Fallback instructions if config system fails or not set yet"""
        return (
            "You are a code analysis assistant whose sole job is to retrieve the most relevant, actionable context from the vector database "
            "using the RAG knowledge_search tool for the given code or user question. "
            "ALWAYS invoke the knowledge_search tool to look up matching patterns, best practices, or documentation for this input. "
            "Do NOT answer or convert the code—just return retrieved context. "
            "Deduplicate, remove boilerplate, and ensure only high-relevance content is returned. "
            "If no relevant documents are found, reply: 'No relevant patterns found for this input.'"
        )

    def _initialize_agent(self):
        """Initialize the LlamaStack agent with current config instructions"""
        try:
            current_instructions = self._get_current_instructions()
            self.agent = Agent(
                client=self.client,
                model=self.model,
                instructions=current_instructions,
                sampling_params={"strategy": {"type": "greedy"}, "max_tokens": 4096},
                tools=[{
                    "name": "builtin::rag",
                    "args": {"vector_db_ids": [self.vector_db_id]},
                }],
            )
            logger.info("ContextAgent initialized with config-driven instructions")
        except Exception as e:
            logger.error(f"Failed to initialize agent: {e}")
            # fallback agent, just in case
            self.agent = Agent(
                client=self.client,
                model=self.model,
                instructions=self._get_fallback_instructions(),
                sampling_params={"strategy": {"type": "greedy"}, "max_tokens": 4096},
                tools=[{
                    "name": "builtin::rag",
                    "args": {"vector_db_ids": [self.vector_db_id]},
                }],
            )

    def _check_and_reload_config(self):
        """Check if config changed and reload agent if needed (optional but robust)"""
        try:
            current_instructions = self._get_current_instructions()
            current_hash = hash(current_instructions)
            if current_hash != self._last_instructions_hash:
                logger.info("ContextAgent instructions changed, reloading agent.")
                self._initialize_agent()
                self._last_instructions_hash = current_hash
        except Exception as e:
            logger.error(f"Failed to check/reload config: {e}")

    def query_context(self, code, top_k=5):
        # Ensure latest config on every query (hot reload)
        self._check_and_reload_config()
        logger.info(f"📬 Sending query to ContextAgent: {repr(code)[:200]}")
        session_id = self.agent.create_session(f"context_session_{uuid.uuid4()}")
        response = self.agent.create_turn(
            messages=[{"role": "user", "content": code}],
            session_id=session_id,
            stream=False,
        )
        steps = getattr(response, 'steps', [])
        # Parse out only meaningful chunks from all tool responses
        context_chunks = []
        for step in steps:
            for tool_response in getattr(step, "tool_responses", []):
                content = getattr(tool_response, "content", None)
                if isinstance(content, list):
                    for item in content:
                        if hasattr(item, "text"):
                            text = item.text.strip()
                            if (
                                text
                                and not text.startswith(("knowledge_search tool found", "BEGIN", "END", "The above results"))
                            ):
                                context_chunks.append(text)
                elif isinstance(content, str):
                    text = content.strip()
                    if text:
                        context_chunks.append(text)
        # As a last resort, append the top-level LLM output if nothing else
        top_content = getattr(response, "content", "").strip()
        if top_content and not context_chunks:
            context_chunks.append(top_content)
        # Output as a list of dicts for UI compatibility
        context_list = [{"text": chunk} for chunk in context_chunks if chunk]
        logger.info(f" ContextAgent returned {len(context_list)} chunks")
        return {
            "context": context_list,
            "steps": steps
        }
