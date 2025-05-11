# ADR 001: Two-Agent RAG → Generate Pipeline for IaC Conversion

## Status
Accepted

## Context
We need a reliable, maintainable way to take arbitrary infrastructure-as-code snippets (Puppet or Chef) and either:
- **Explain** them in plain English, _or_
- **Convert** them into a valid Ansible playbook

Our environment includes:
- A FAISS vector database (`iac`) pre-populated with Markdown, text, AsciiDoc, and JSONL docs.
- The Llama Stack client library with built-in RAG tools (`builtin::rag/knowledge_search`) and an `Agent` abstraction for sessions and turn tracking.

## Decision Drivers
- **Determinism**: Retrieval of related context must happen exactly once, with a fixed top-k.
- **Clarity**: Prompts for retrieval vs. generation should remain focused and easy to tune.
- **Observability**: We must be able to log and inspect retrieval outputs separately from generation outputs.
- **Modularity**: We should be able to swap or reconfigure retrieval (e.g. `top_k`, embedding model) without touching generation logic.

## Considered Options

### Option A: Single Agent with Mixed Responsibilities
- **How**: Define one `Agent` that includes both a RAG tool and a final-playbook prompt in its instructions.
- **Pros**:
  - Fewer lines of code (only one session, one agent instance).
- **Cons**:
  - Model may skip or repeat RAG calls unpredictably.
  - Harder to separate “did retrieval fail?” vs. “did generation hallucinate?” in logs.
  - Prompt engineering becomes fragile when mixing retrieval + conversion instructions.

### Option B: Two-Agent Retrieve → Generate Pipeline
- **How**:  
  1. **RAG Agent**  
     - Instructions: “Use the RAG tool to fetch IaC-related context.”  
     - Runs exactly one `builtin::rag/knowledge_search(vector_db_ids=[...], top_k=5)` per transform.
  2. **Generator Agent**  
     - Instructions: “Generate an Ansible playbook (or explanation) using the provided code + RAG context.”
     - Consumes the user’s code snippet and the 5 retrieved doc chunks.
- **Pros**:
  - Strict separation of concerns and responsibilities.
  - Full control over retrieval parameters and clear logging of tool steps.
  - Simplified prompt maintenance and easier debugging.
- **Cons**:
  - Slightly more boilerplate (two agents, two sessions).

## Decision
We adopt **Option B**: the Two-Agent Retrieve → Generate pipeline. The benefits in determinism, observability, and modularity outweigh the minimal extra code.

## Consequences
- **Implementation**:  
  - The `AgenticModel.transform()` method will instantiate two `Agent` objects per call:  
    1. `rag_agent` to fetch docs.  
    2. `generator_agent` to produce the final output.
- **Logging**:  
  - Retrieval outputs and final generation prompts/results are logged separately.
- **Future Evolution**:  
  - We can tweak retrieval parameters (e.g. `top_k`, embedding models) without touching generation code.
  - We can extend the pipeline (e.g. add a caching layer or alternative retriever) by swapping out the RAG agent only.

---

*Recorded: May 10, 2025*  
