import requests
import json
import logging
from utils.sanitize import sanitize_yaml, flatten_blocks


class MaasModel:
    def __init__(self, api_key, endpoint_url, model_name, stream=False):
        self.api_key = api_key
        self.model_name = model_name
        self.stream = stream

        # Ensure endpoint ends in /v1/completions
        if not endpoint_url.rstrip("/").endswith("/v1"):
            endpoint_url = endpoint_url.rstrip("/") + "/v1"
        self.endpoint_url = endpoint_url + "/completions"

    def transform(self, code, context="", stream_ui=False, mode="convert"):
        logging.info(f"[MaaS] transform() called with mode={mode}, stream_ui={stream_ui}")

        if mode == "analyze":
            prompt = f"""You are an expert infrastructure automation analyst.

Explain in plain English what the following infrastructure-as-code (Chef or Puppet) script does. 

Be concise and clear. Avoid YAML. Do not reformat the code.

[INPUT]
{code}
[OUTPUT]
"""
        else:
            prompt = f"""You are an expert infrastructure automation assistant.

Your task is to convert the following {context or 'Chef or Puppet'} code into a valid and clean **Ansible Playbook**.

Only output valid Ansible YAML. Do not add explanations or comments.

Use `tasks:` under each play. Avoid nested `block:` sections unless truly needed. Flatten blocks when possible.

Use proper Ansible modules (`apt`, `yum`, `copy`, `service`, etc.). Do not invent modules.

Ensure correct indentation and formatting.

[INPUT]
{code}
[OUTPUT]
"""

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }

        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "max_tokens": 2048,
            "temperature": 0.2,
            "stream": self.stream
        }

        try:
            logging.info(f"[MaaS] POST {self.endpoint_url} | Model: {self.model_name} | Stream: {self.stream}")
            response = requests.post(self.endpoint_url, headers=headers, json=payload, stream=self.stream)
            response.raise_for_status()

            result = ""

            if self.stream:
                for line in response.iter_lines():
                    if line:
                        line_str = line.decode("utf-8").replace("data: ", "")
                        if line_str.strip() == "[DONE]":
                            break
                        try:
                            json_obj = json.loads(line_str)
                            if "choices" in json_obj and json_obj["choices"]:
                                chunk = json_obj["choices"][0]["text"]
                                result += chunk
                                if stream_ui:
                                    yield chunk
                        except json.JSONDecodeError as err:
                            logging.warning(f"[MaaS] JSON decode error: {err}")
                if result and not stream_ui:
                    yield sanitize_yaml(flatten_blocks(result))

            else:
                data = response.json()
                choices = data.get("choices")
                if not choices or not isinstance(choices, list) or not choices[0].get("text"):
                    logging.error(f"[MaaS] Unexpected response structure: {data}")
                    yield "❌ Error: MaaS response missing 'choices'."
                else:
                    raw_output = choices[0]["text"]
                    yield sanitize_yaml(flatten_blocks(raw_output))

        except Exception as e:
            logging.exception("[MaaS] Error during prompt generation")
            yield f"❌ Error contacting MaaS: {e}"
