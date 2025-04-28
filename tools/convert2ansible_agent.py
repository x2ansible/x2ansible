# tools/convert2ansible_agent.py

import argparse
import yaml
import os
from llama_stack_client import LlamaStackClient
from llama_stack_client.lib.agents.agent import Agent
from llama_stack_client.lib.agents.event_logger import EventLogger

# ------------------------------
# CLI Arguments
# ------------------------------
parser = argparse.ArgumentParser()
parser.add_argument("--input-file", required=True, help="Path to input DSL code (Chef or Puppet)")
parser.add_argument("--remote", action="store_true", help="Use remote MaaS backend for conversion")
args = parser.parse_args()

# ------------------------------
# Load DSL Code
# ------------------------------
with open(args.input_file, "r") as f:
    input_code = f.read().strip()

# ------------------------------
# Load Config
# ------------------------------
with open("config.yaml", "r") as f:
    config = yaml.safe_load(f)

# ------------------------------
# Choose Backend
# ------------------------------
env = config.get("default", "local")
ollama_cfg = config["llama_stack"]["local"]
maas_cfg = config["llama_stack"]["maas"]

if args.remote:
    model_id = maas_cfg["model"]
    base_url = maas_cfg["base_url"]
    api_key = maas_cfg["api_key"]
    client = LlamaStackClient(
        base_url=base_url,
        provider_data={"together_api_key": api_key}  # ✅ FIXED: use provider_data
    )
else:
    model_id = ollama_cfg["model"]
    base_url = ollama_cfg["base_url"]
    client = LlamaStackClient(base_url=base_url)

print(f"✅ Connected to Llama Stack server @ {base_url}")
print("🛠️ Converting to Ansible using builtin::rag...")

# ------------------------------
# Agent Definition
# ------------------------------
agent = Agent(
    client=client,
    model=model_id,
    instructions="""
You are a DevOps expert. Convert the given Chef or Puppet infrastructure code into a valid Ansible playbook.
Use the builtin::rag tool to enrich your context with real-world infrastructure knowledge before responding.
Reply with ONLY clean Ansible YAML — no markdown, comments, or explanations.
    """,
    tools=[{
        "name": "builtin::rag",
        "args": {
            "vector_db_ids": ["puppet_docs", "chef_docs"],
            "top_k": 3,
            "compile": True
        }
    }],
    tool_config={"tool_choice": "auto"},
    max_infer_iters=4,
    sampling_params={
        "strategy": {"type": "top_p", "temperature": 0.3, "top_p": 0.9},
        "max_tokens": 2048
    }
)

# ------------------------------
# Run Agent Session
# ------------------------------
session_id = agent.create_session("puppet-chef-to-ansible")
turn = agent.create_turn(
    session_id=session_id,
    messages=[{"role": "user", "content": input_code}],
    stream=True
)

final_output = ""
for log in EventLogger().log(turn):
    if hasattr(log, "content") and isinstance(log.content, str):
        final_output += log.content

final_output = final_output.strip()

# ------------------------------
# Display Final Output
# ------------------------------
if final_output:
    print("\n✅ Final Ansible Playbook:\n")
    print(final_output)
else:
    print("⚠️ No assistant output detected. Check agent or RAG behavior.")
