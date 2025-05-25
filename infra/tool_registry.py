import logging
from llama_stack_client import LlamaStackClient

logger = logging.getLogger("ToolRegistry")


def register_toolgroups(client: LlamaStackClient):
    logger.info("🔧 Registering toolgroups")

    # Registering MCP toolgroup for ansible lint
    client.toolgroups.register(
        toolgroup_id="mcp::ansible_lint",
        provider_id="model-context-protocol",
        provider_resource_id="mcp::ansible_lint",
        mcp_endpoint={"uri": "https://lint-mcp-route-convert2ansible.apps.prod.rhoai.rh-aiservices-bu.com/sse"},
        args={}
    )

    logger.info("✅ Registered toolgroup: mcp::ansible_lint")


def register_tools(client: LlamaStackClient):
    # This function is optional and can be a placeholder until you use `client.tools.register(...)`
    logger.info("ℹ️ register_tools is currently a placeholder.")
