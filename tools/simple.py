# simple.py
# Now upgraded to CONVERSION MODE: Chef/Puppet → Ansible Playbook using LlamaStack Agent

from llama_stack_client.lib.agents.agent import Agent
from llama_stack_client.lib.agents.event_logger import EventLogger
from llama_stack_client.types import Document

from llama_stack_client import LlamaStackClient
from termcolor import cprint
import argparse
import logging
import os
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
stream_handler = logging.StreamHandler()
stream_handler.setLevel(logging.INFO)
formatter = logging.Formatter('%(message)s')
stream_handler.setFormatter(formatter)
logger.addHandler(stream_handler)

parser = argparse.ArgumentParser()
parser.add_argument("-r", "--remote", help="Uses the remote_url", action="store_true")
parser.add_argument("-s", "--session-info-on-exit", help="Prints agent session info on exit", action="store_true")
parser.add_argument("-a", "--auto", help="Automatically runs examples, and does not start a chat session", action="store_true")
args = parser.parse_args()

# ✅ Correct model name
model = "llama3.2:3b"

# Connect to a llama stack server
if args.remote:
    base_url = os.getenv("REMOTE_BASE_URL")
    vdb_provider = os.getenv("REMOTE_VDB_PROVIDER")
else:
    base_url = "http://localhost:8321"
    vdb_provider = "faiss"

client = LlamaStackClient(base_url=base_url)
logger.info(f"Connected to Llama Stack server @ {base_url} \n")

# Register or verify vector database
vector_db_ids = [vector_db.provider_resource_id for vector_db in client.vector_dbs.list()]
if "ansible_rules" not in vector_db_ids:
    response = client.vector_dbs.register(
        vector_db_id="ansible_rules",
        embedding_model="all-MiniLM-L6-v2",
        embedding_dimension=384,
        provider_id=vdb_provider,
    )
    logger.info("Vector DB 'ansible_rules' registered.")
else:
    logger.info("Vector DB 'ansible_rules' already exists.")

# ✅ Create an agent focused on Chef/Puppet → Ansible conversion
agent = Agent(
    client,
    model=model,
    instructions="""You are a DevOps automation expert specializing in converting Chef recipes and Puppet manifests into Ansible playbooks.

When given infrastructure-as-code input in Chef or Puppet format, you must:

- Carefully interpret the code.
- Translate it into a correct, clean, and working Ansible playbook in YAML format.
- Follow Ansible best practices.
- Minimize unnecessary tasks or handlers.
- Ensure module names, parameters, and structures are valid.
- Use retrieval tools (RAG) if you need to check best practices or mappings.

Respond ONLY with a valid Ansible playbook YAML. 
Do not explain, introduce, or wrap your output in additional commentary.""",
    tools=[
        {
            "name": "builtin::rag",
            "args": {
                "vector_db_ids": ["ansible_rules"],
                "top_k": 3,
            }
        }
    ],
    tool_config={"tool_choice": "auto"}
)

if args.auto:
    user_prompts = [
        """Convert the following Chef code to an Ansible playbook:\n\npackage 'nginx' do\n  action :install\nend""",
        """Convert the following Puppet code to an Ansible playbook:\n\npackage { 'httpd':\n  ensure => installed,\n}"""
    ]
    session_id = agent.create_session(session_name="Auto_conversion_demo")
    for prompt in user_prompts:
        turn_response = agent.create_turn(
            messages=[{"role": "user", "content": prompt}],
            session_id=session_id,
            stream=True,
        )
        for log in EventLogger().log(turn_response):
            log.print()

else:
    # Create a chat session
    session_id = agent.create_session(session_name="Conversion_demo")
    while True:
        user_input = input("Paste Chef/Puppet code to CONVERT to Ansible (or /bye to exit)\n>>> ")
        if "/bye" in user_input:
            if args.session_info_on_exit:
                agent_session = client.agents.session.retrieve(session_id=session_id, agent_id=agent.agent_id)
                print(agent_session.to_dict())
            break
        turn_response = agent.create_turn(
            session_id=session_id,
            messages=[{"role": "user", "content": user_input}],
            stream=True,
        )
        for log in EventLogger().log(turn_response):
            log.print()
