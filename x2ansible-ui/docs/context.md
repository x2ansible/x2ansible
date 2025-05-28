
# ContextAgent: Retrieval Augmented Generation (RAG) for IaC Analysis

The **`ContextAgent`** is a specialized component within the `x2Ansible` system focused on **Retrieval Augmented Generation (RAG)**. Its primary role is to enhance the intelligence of other agents (or user interactions) by providing relevant contextual information retrieved from a knowledge base. This agent acts as a smart lookup mechanism, feeding pertinent data to downstream processes or directly to the user.

---

## Core Mission

The `ContextAgent`'s fundamental mission is to:

1.  **Retrieve Relevant Context**: Based on a given code snippet or user query, identify and retrieve the most relevant code patterns, best practices, documentation, or other helpful information from a structured knowledge base.
2.  **Filter and Deduplicate**: Process the retrieved information to ensure only highly relevant, actionable, and non-redundant content is returned, removing boilerplate or irrelevant data.
3.  **Support Downstream Processes**: Provide this enriched context to other agents (e.g., for conversion assistance) or directly to the user interface to aid in understanding or problem-solving.

---

## How It Works

The `ContextAgent` follows a precise workflow to retrieve and process contextual information:

1.  **Initialization**:
    * The `ContextAgent` initializes by instantiating a `LlamaStackClient` to connect to the central `LlamaStack` service.
    * It then creates a `llama_stack_client.Agent` instance, configuring it with specific instructions. These instructions are critical: they define the agent's purpose as a code analysis assistant whose *sole job* is to invoke a knowledge search and return context, *not* to answer questions or convert code directly.
    * Crucially, it's equipped with a **`builtin::rag` tool**. This tool is configured with a list of `vector_db_ids` (e.g., `'iac'`, `'rag_test_docs'`, or dynamically generated IDs like `'chris_...'`) that it is permitted to query. This link to specific vector databases within LlamaStack is how it accesses the pre-indexed knowledge.

2.  **Context Query Request**:
    * When an external component (e.g., the `routes.context` API handler) calls the `ContextAgent`'s `query_context` method, it provides the code snippet or user question as input.
    * The agent logs the incoming query, indicating it's about to send it to the `ContextAgent`.

3.  **Agentic Query (LLM Interaction via LlamaStack)**:
    * **Session Creation**: A new, unique session is created with `LlamaStack` using `self.agent.create_session()`. This ensures each context query is handled independently.
    * **Turn Creation and Tool Invocation**: The input code/query is encapsulated in a `UserMessage` and sent to the `LlamaStack` agent via `self.agent.create_turn()`.
    * The LLM, adhering to its instructions, recognizes the need for knowledge retrieval. It then **invokes the `builtin::rag` tool**, passing the user's query to it. This tool internally performs a vector similarity search against the specified `vector_db_ids` within `LlamaStack`.
    * `LlamaStack` then returns the most relevant "chunks" or documents found in the vector database.

4.  **Response Processing and Filtering**:
    * The `ContextAgent` receives the `turn` response from `LlamaStack`, which contains the results of the `builtin::rag` tool's execution.
    * It iterates through the `tool_responses` (specifically looking at the `content` of these responses).
    * It extracts the `text` content of each retrieved chunk.
    * A filtering mechanism is applied to:
        * Remove empty or purely whitespace chunks.
        * Eliminate boilerplate phrases that the tool itself might include (e.g., "knowledge\_search tool found", "BEGIN", "END").
    * The extracted, cleaned, and deduplicated chunks are assembled into a list.

5.  **Output**:
    * The `ContextAgent` logs the number of context chunks successfully returned.
    * It formats the retrieved chunks as a list of dictionaries (e.g., `[{"text": "chunk content"}]`), which is suitable for consumption by frontends or other services. It also includes the raw `steps` for debugging and transparency into the LLM's tool usage.

---

## LlamaStack Specific Implementation Details

The `ContextAgent`'s design is deeply integrated with `LlamaStack` to leverage its RAG capabilities:

* **`llama_stack_client.Agent`**: This class is the primary interface for the `ContextAgent` to communicate with the `LlamaStack` backend. It abstracts away the direct HTTP calls and manages session state.
* **Declarative Tooling (`builtin::rag`)**: Instead of the Python code explicitly performing database lookups, the `ContextAgent` *declares* to `LlamaStack` that it has access to the `builtin::rag` tool. It provides the `vector_db_ids` as arguments to this tool. This allows the LLM itself to decide *when* and *how* to use the RAG capability based on its instructions and the user's query.
* **LLM Orchestration**: The `instructions` provided to the `Agent` during initialization are crucial. They constrain the LLM to *only* perform knowledge search and *not* generate creative responses. This ensures the agent remains focused on its RAG mission.
* **Session Management**: `self.agent.create_session()` is used to create unique sessions for each context query. While the `ContextAgent` typically handles single-turn RAG requests, sessions are a fundamental part of the `LlamaStack` conversational framework and can be extended for multi-turn interactions if needed.
* **Structured Tool Response Parsing**: The `ContextAgent` explicitly anticipates the structure of the `builtin::rag` tool's output within the `turn.steps` and `tool_responses` attributes. This ensures it can correctly extract the relevant textual context provided by the RAG system.

---

## Key Capabilities and Features

* **RAG-Powered Context Retrieval**: Leverages `LlamaStack`'s built-in RAG capabilities for efficient and relevant information retrieval from vector databases.
* **LLM-Driven Relevance**: The underlying LLM determines the most relevant chunks based on the query and its trained knowledge, guided by agent instructions.
* **Configurable Knowledge Bases**: Can be configured to search specific vector databases (e.g., `iac` for IaC patterns, `rag_test_docs` for general documentation).
* **Minimalistic Purpose**: Designed with a single, clear objective: context retrieval, preventing it from deviating into other tasks like code generation or validation.
* **Clean Context Output**: Filters out unnecessary boilerplate to provide concise and actionable context.
* **Scalability**: By offloading the complex search and retrieval logic to `LlamaStack` and its vector database backend, the `ContextAgent` remains lightweight and scalable.

---

## Use Case

The `ContextAgent` plays a vital role in `x2Ansible` by:

* **Providing Conversion Guidance**: When a user is trying to convert a piece of IaC (especially if the `ClassifierAgent` marked it as "Not Convertible" for direct automated conversion), the `ContextAgent` can fetch relevant Ansible patterns, Chef-to-Ansible migration guides, or equivalent resource definitions from its vector database.
* **Enriching UI Experience**: The retrieved context chunks can be displayed in the application's user interface, giving users immediate access to helpful information relevant to their current code.
* **Supporting LLM Reasoning**: In more complex multi-agent workflows, the context retrieved by this agent can be fed as additional input to other LLMs (like the `ValidationAgent` or a potential `ConversionAgent`) to improve their performance and accuracy.

---