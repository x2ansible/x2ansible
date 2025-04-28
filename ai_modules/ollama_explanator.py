from .explanator import Explanator
from ollama import Client
from fileio.settings import Settings
import logging
import time

class Ollama(Explanator):
    def __init__(self, model_name=None, host=None, stream=False, timeout=60):
        settings = Settings()
        ollama_settings = settings.read_sections("settings.config", "ollama")
        self.model_name = model_name or settings.getSettingValue(ollama_settings, "model_name")
        self.host = host or settings.getSettingValue(ollama_settings, "host")
        self.stream = stream
        self.timeout = timeout
        self.client = Client(host=f"http://{self.host}")

    def transform(self, code, context):
        prompt = f"""As a software developer, convert this {context} to an Ansible Playbook.
Only provide the YAML code (no explanations, no comments).

[INPUT]
{code}
[OUTPUT]
"""
        logging.info(f"[Ollama] Sending prompt to {self.host} | Model: {self.model_name} | Stream: {self.stream}")

        try:
            start_time = time.time()
            if self.stream:
                chunks = []
                for chunk in self.client.generate(model=self.model_name, prompt=prompt, stream=True):
                    if isinstance(chunk, dict) and 'response' in chunk:
                        chunks.append(chunk["response"])
                output = "".join(chunks)
            else:
                response = self.client.generate(model=self.model_name, prompt=prompt, stream=False)
                output = response["response"]

            duration = time.time() - start_time
            token_estimate = len(output.split())

            logging.info(f"[Ollama] Completed in {duration:.2f}s | ~{token_estimate} tokens")
            return output

        except Exception as e:
            logging.exception("[Ollama] Error during prompt generation")
            return f"Error contacting Ollama: {e}"

    def list_models(self):
        try:
            models = self.client.list().get("models", [])
            entries = []
            for m in models:
                name = m.get("name") or m.get("model")
                size = m.get("size", "?")
                if name:
                    entries.append(f"{name} ({size})")
            entries.sort()
            return entries
        except Exception as e:
            logging.exception("[Ollama] Error fetching model list")
            return [f"Error fetching models: {e}"]

    def greet(self):
        return super().greet()

    def who_am_i(self):
        return super().who_am_i()

    def handle_general_requst(self, request):
        return self.transform(request, "general")
