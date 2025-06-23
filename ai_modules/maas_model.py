import logging
import requests
import json

class MaasModel:
    def __init__(self, api_key, endpoint_url, model_name, stream=False):
        self.api_key = api_key
        self.model_name = model_name
        self.stream = stream

        endpoint_url = endpoint_url.rstrip("/")
        if not endpoint_url.endswith("/v1"):
            endpoint_url += "/v1"
        self.endpoint_url = f"{endpoint_url}/completions"

        logging.info("🔌 Initialized MaasModel")
        logging.info(f"📡 Endpoint: {self.endpoint_url}")
        logging.info(f"🧠 Model: {self.model_name}")
        logging.info(f"🌊 Streaming: {self.stream}")

    def transform(self, code, context="", stream_ui=False, mode="convert"):
        logging.info(f"🚀 transform() called | mode={mode} | stream_ui={stream_ui}")

        prompt = self._build_prompt(code, context, mode)

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

        logging.debug(f"📝 Prompt Sent:\n{prompt}")

        try:
            response = requests.post(self.endpoint_url, headers=headers, json=payload, stream=self.stream)
            response.raise_for_status()

            if self.stream:
                yield from self._stream_response(response, stream_ui)  # ✅ fix: yield from
            else:
                yield from self._full_response(response)  # ✅ fix: yield from

        except Exception as e:
            logging.exception("💥 Error in MaaSModel transform")
            yield f"❌ Error contacting MaaS: {e}"

    def _build_prompt(self, code, context, mode):
        if mode == "analyze":
            return (
                "You are a DevOps infrastructure code analyst.\n\n"
                "Your task is to **explain** what the following Chef, Puppet or Salt code does.\n\n"
                "Be concise, clear, and do NOT return YAML or reformat the input.\n\n"
                "[INPUT]\n"
                f"{code}\n\n"
                "[OUTPUT]"
            )
        else:  # mode == "convert"
            context_block = f"[CONTEXT]\n{context}\n\n" if context else ""
            return (
                "You are an expert DevOps assistant.\n\n"
                "Convert the given Chef, Puppet, or Salt code into a **clean, correct, minimal** Ansible playbook in YAML format.\n\n"
                "**Strict rules:**\n"
                "- Output ONLY valid Ansible YAML. No comments, no explanations, no Markdown.\n"
                "- Start output with `---`\n"
                "- Use `apt`, `yum`, `service`, `template`, `copy` modules appropriately.\n"
                "- Flatten tasks; use `loop:`, avoid `block:` unless absolutely needed.\n"
                "- Templates must be `.j2`, not `.erb`.\n"
                "- Use `become: yes` where required.\n\n"
                f"{context_block}[CODE]\n{code}\n\n"
                "[OUTPUT]"
            )

    def _stream_response(self, response, stream_ui):
        buffer = ""

        for line in response.iter_lines():
            if line:
                line = line.decode('utf-8').replace("data: ", "").strip()
                if line == "[DONE]":
                    break
                try:
                    payload = json.loads(line)
                    chunk = payload["choices"][0]["text"]

                    if stream_ui:
                        yield chunk
                    else:
                        buffer += chunk

                except Exception as e:
                    logging.warning(f"⚠️ Stream parsing error: {e}")

        if not stream_ui and buffer:
            yield buffer

    def _full_response(self, response):
        try:
            payload = response.json()
            text_output = payload["choices"][0]["text"]
            yield text_output
        except Exception as e:
            logging.exception("💥 Error parsing full response")
            yield f"Error parsing response: {e}"
