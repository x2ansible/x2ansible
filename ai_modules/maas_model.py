import logging
import requests
import json
from utils.sanitize import sanitize_yaml, flatten_blocks

class MaasModel:
    def __init__(self, api_key, endpoint_url, model_name, stream=False):
        self.api_key = api_key
        self.model_name = model_name
        self.stream = stream

        # Normalize endpoint URL to /v1/completions
        endpoint_url = endpoint_url.rstrip("/")
        if not endpoint_url.endswith("/v1"):
            endpoint_url += "/v1"
        self.endpoint_url = f"{endpoint_url}/completions"

        logging.info("🔌 Initialized MaasModel")
        logging.info(f"📡 Endpoint: {self.endpoint_url}")
        logging.info(f"🧠 Model: {self.model_name}")
        logging.info(f"🌊 Streaming: {self.stream}")

    def transform(self, code, context="", stream_ui=False, mode="convert"):
        logging.info(f"🚀 transform() called | mode={mode}, stream_ui={stream_ui}")

        # === Smart context-safe prompt construction ===
        if mode == "analyze":
            prompt = f"""You are a DevOps infrastructure code analyst.

Your task is to **explain** what the following Chef or Puppet code does.

Be concise, clear, and do NOT return YAML or reformat the input.

[INPUT]
{code}

[OUTPUT]
"""
        else:  # mode == "convert"
            if context:
                input_block = f"[CONTEXT]\n{context}\n\n[CODE]\n{code}"
            else:
                input_block = f"[CODE]\n{code}"

            prompt = f"""You are an expert DevOps assistant.

Convert the given Chef or Puppet code into a **clean, correct, and minimal** Ansible playbook in YAML format.

Strict rules:
- Output ONLY valid Ansible YAML. No comments, no explanations, no Markdown.
- Start output with `---`
- Use `apt`, `yum`, `service`, `template`, `copy`, etc. — NOT `package`, `execute`, or `command` unless valid.
- Flatten tasks. Use `loop:` not `with_items:`. Avoid `block:` unless truly needed.
- All templates must be `.j2`, not `.erb`.
- Use `become: yes` where needed.

{input_block}

[OUTPUT]
"""

        # === Setup headers and payload ===
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

        logging.info(f"📨 Sending request to MaaS: {self.endpoint_url}")
        logging.debug(f"📝 Prompt:\n{prompt}")

        try:
            response = requests.post(self.endpoint_url, headers=headers, json=payload, stream=self.stream)
            response.raise_for_status()

            result = ""

            if self.stream:
                for line in response.iter_lines():
                    if line:
                        raw = line.decode("utf-8").replace("data: ", "")
                        if raw.strip() == "[DONE]":
                            break
                        try:
                            json_obj = json.loads(raw)
                            chunk = json_obj["choices"][0]["text"]
                            result += chunk
                            if stream_ui:
                                yield chunk
                        except Exception as e:
                            logging.warning(f"⚠️ Stream parse error: {e}")
                if not stream_ui:
                    final = sanitize_yaml(flatten_blocks(result))
                    yield final

            else:
                json_obj = response.json()
                raw_output = json_obj["choices"][0]["text"]
                cleaned = sanitize_yaml(flatten_blocks(raw_output))
                yield cleaned

        except Exception as e:
            logging.exception(f"❌ Error from MaaS model call")
            yield f"❌ Error contacting MaaS: {e}"
