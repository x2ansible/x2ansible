import logging
import requests
from typing import Dict
from llama_stack_client.lib.agents.client_tool import client_tool

# Setup logger for this tool
logger = logging.getLogger("AnsibleLintTool")
logging.basicConfig(level=logging.INFO)

@client_tool
def ansible_lint_tool(playbook: str, profile: str = "production") -> Dict:
    """
    Lints an Ansible playbook using the /v1/lint/{profile} API.

    :param playbook: The content of the Ansible playbook (YAML string)
    :param profile: Lint profile (production, basic, safety, test, minimal)
    :return: Linting result dict with keys: exit_code, stdout, stderr
    """
    url = f"http://localhost:8098/v1/lint/{profile}"
    files = {'file': ('playbook.yml', playbook.encode('utf-8'), 'text/yaml')}
    logger.info(f"🔍 Calling lint API at {url} (playbook length: {len(playbook)} chars, profile: {profile})")
    try:
        response = requests.post(url, files=files, timeout=30)
        response.raise_for_status()
        logger.info(f"✅ Lint API returned status {response.status_code}")
        result = response.json()
        logger.info(f"✅ Lint result: exit_code={result.get('exit_code')}, stdout_len={len(result.get('stdout', ''))}, stderr_len={len(result.get('stderr', ''))}")
        return result
    except Exception as e:
        logger.error(f"❌ Ansible lint call failed: {e}")
        return {
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Ansible lint call failed: {str(e)}"
        }
