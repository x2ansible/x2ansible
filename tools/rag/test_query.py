# tools/test_query.py
import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

import logging
from ai_modules.agentic_model import AgenticModel
from llama_stack_client import LlamaStackClient

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

def test_rag_generation_and_score():
    model = AgenticModel(base_url="http://localhost:8321", vector_db="ansible_rules")
    client = LlamaStackClient(base_url="http://localhost:8321")

    puppet_code = """
package { 'httpd':
  ensure => installed,
}
"""

    print("\n🔎 Testing Manual RAG Retrieval + Ansible Playbook Generation...\n")

    # Run the agent
    generated = ""
    results = model.transform(puppet_code, mode="convert", stream_ui=False)
    for chunk in results:
        generated += chunk

    print("\n=== Final Ansible Playbook ===\n")
    print(generated.strip())

    # Prepare scoring input
    eval_rows = [
        {
            "input_query": puppet_code.strip(),
            "generated_answer": generated.strip(),
            "expected_answer": "---"  # just checking if YAML starts properly
        }
    ]

    scoring_params = {
        "basic::starts_with": None,
    }

    scoring_response = client.scoring.score(
        input_rows=eval_rows,
        scoring_functions=scoring_params,
    )

    print("\n=== Scoring Result ===\n")
    print(scoring_response)

if __name__ == "__main__":
    test_rag_generation_and_score()
