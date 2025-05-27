# ansible_lint_tool.py

import requests
from typing import Dict

def ansible_lint_tool(playbook: str, profile: str = "production") -> Dict:
    """
    Lints an Ansible playbook using the /v1/lint/{profile} API.

    :param playbook: The content of the Ansible playbook (YAML string)
    :param profile: Lint profile (production, basic, safety, test, minimal)
    :return: Linting result dict with keys: exit_code, stdout, stderr
    """
    url = f"http://localhost:8000/v1/lint/{profile}"
    files = {'file': ('playbook.yml', playbook.encode('utf-8'), 'text/yaml')}
    try:
        response = requests.post(url, files=files, timeout=30)
        response.raise_for_status()
        return response.json()
    except Exception as e:
        return {
            "exit_code": -1,
            "stdout": "",
            "stderr": f"Ansible lint call failed: {str(e)}"
        }
