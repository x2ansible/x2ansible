from llama_stack_agents import (
    get_vanilla_agent,
    get_routing_agent,
    get_orchestrator_agent,
    get_rag_agent,
    ingest_docs_for_rag,
    routing_map,
    worker_agent,
    generator_agent,
    evaluator_agent,
)
from rich.pretty import pprint
from termcolor import cprint

print("✅ Running LlamaStack agent tests...\n")

# === Test 1: vanilla_agent
cprint("🔹 Testing vanilla_agent:", "cyan")
agent = get_vanilla_agent()
session = agent.create_session("vanilla")
output = agent.create_turn(
    session_id=session,
    messages=[{"role": "user", "content": "What is Ansible used for?"}],
    stream=False
)
pprint(output.output_message.content)

# === Test 2: routing_agent + billing
cprint("\n🔹 Testing routing_agent + billing:", "cyan")
billing_agent = get_routing_agent(agent_type="billing")
session = billing_agent.create_session("billing_support")
response = billing_agent.create_turn(
    session_id=session,
    messages=[{"role": "user", "content": "I was overcharged. Can you help?"}],
    stream=False
)
pprint(response.output_message.content)

# === Test 3: orchestrator_agent
cprint("\n🔹 Testing orchestrator_agent:", "cyan")
orchestrator_agent = get_orchestrator_agent()
session = orchestrator_agent.create_session("orchestrator")
response = orchestrator_agent.create_turn(
    session_id=session,
    messages=[{"role": "user", "content": "Create an Ansible playbook to install nginx on Ubuntu"}],
    stream=False
)
pprint(response.output_message.content)

# === Test 4: RAG agent with ingest
vector_db_id = "rag_test_docs"
rag_docs = ["docs/convert.md"]
embedding_model = "all-MiniLM-L6-v2"
embedding_dim = 384

cprint("\n🔹 Ingesting docs & testing rag_agent:", "cyan")
ingest_docs_for_rag(vector_db_id, rag_docs, embedding_model, embedding_dim)

rag_agent = get_rag_agent(vector_db_id)
session = rag_agent.create_session("rag_test")
response = rag_agent.create_turn(
    session_id=session,
    messages=[{"role": "user", "content": "Explain how to convert Chef to Ansible using automation"}],
    stream=False
)
pprint(response.output_message.content)

# === Test 5: All routing_map agents
for dept in ["technical", "account", "product"]:
    cprint(f"\n🔹 Testing routing_map → {dept}_agent", "cyan")
    if dept not in routing_map:
        print(f"❌ No agent found for {dept}")
        continue

    session = routing_map[dept].create_session(f"{dept}_test")
    sample_query = {
        "technical": "I'm unable to connect to the server using SSH.",
        "account": "How do I reset my password?",
        "product": "Can you tell me the roadmap for the next release?",
    }.get(dept, "General question")

    response = routing_map[dept].create_turn(
        session_id=session,
        messages=[{"role": "user", "content": sample_query}],
        stream=False
    )
    pprint(response.output_message.content)

# === Test 6: Full orchestrator chain
cprint("\n🔹 Simulating full orchestrator chain", "cyan")

# Step 1: Orchestrator receives task
orch_session = orchestrator_agent.create_session("orchestration_demo")
user_task = "Generate an Ansible playbook to install MySQL and validate it."
orch_turn = orchestrator_agent.create_turn(
    session_id=orch_session,
    messages=[{"role": "user", "content": user_task}],
    stream=False
)
pprint(orch_turn.output_message.content)

# Step 2: Worker refines the task
worker_session = worker_agent.create_session("worker_refine")
worker_turn = worker_agent.create_turn(
    session_id=worker_session,
    messages=[{"role": "user", "content": f"Refine this task: {user_task}"}],
    stream=False
)
refined_task = worker_turn.output_message.content
print("\n🧠 Refined task:")
pprint(refined_task)

# Step 3: Generator creates the playbook (streaming)
cprint("\n⚙️ Generating playbook (streaming from generator_agent):", "cyan")
gen_session = generator_agent.create_session("generator_task")
stream = generator_agent.create_turn(
    session_id=gen_session,
    messages=[{"role": "user", "content": refined_task}],
    stream=True
)

streamed_output = ""
for chunk in stream:
    text = str(chunk)  # ✅ correct for modern versions of llama_stack_client
    print(text, end="", flush=True)
    streamed_output += text

# Step 4: Evaluator reviews the output
eval_session = evaluator_agent.create_session("evaluate_generated")
eval_input = f"Please review the following playbook:\n\n{streamed_output}"
eval_turn = evaluator_agent.create_turn(
    session_id=eval_session,
    messages=[{"role": "user", "content": eval_input}],
    stream=False
)

print("\n\n🧪 Evaluation of generated playbook:")
pprint(eval_turn.output_message.content)
