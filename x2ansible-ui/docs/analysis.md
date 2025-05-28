
# ClassifierAgent: Infrastructure-as-Code Classification and Ansible Conversion Assessment

The **`ClassifierAgent`** is a core component of the `x2Ansible` API. It's designed to intelligently analyze Infrastructure-as-Code (IaC) snippets and assess their potential for conversion into Ansible playbooks. It operates as a "**purely agentic**" system, meaning it primarily relies on the reasoning capabilities of a **Large Language Model (LLM)** to make its decisions. The Python code handles the input/output (I/O), data formatting, and orchestration, rather than complex business logic.

---

## Core Mission

The `ClassifierAgent`'s fundamental mission is to:

1.  **Accurately Identify IaC Tool/Language**: Determine which infrastructure automation tool (e.g., Terraform, Chef, Puppet, Docker, Bash, CloudFormation) was used to write a given code snippet.
2.  **Assess Convertibility to Ansible**: Crucially, it's configured as an "**optimistic conversion advocate**." Its default stance is that *any* infrastructure automation code is convertible to Ansible. Its role is to identify *how* the conversion can be achieved, rather than whether it's possible. It will only deem code "Not Convertible" if it contains absolutely no infrastructure automation elements.
3.  **Provide Detailed Analysis and Conversion Guidance**: For each analyzed snippet, it produces a comprehensive breakdown, including a summary, detailed analysis, identified resources and operations, dependencies, complexity level, and explicit notes on the conversion approach.

---

## How It Works

The `ClassifierAgent` follows a streamlined process:

1.  **Initialization**:
    * Upon startup, the agent initializes itself by creating an `Agent` object from the **`llama_stack_client`** library.
    * It establishes a connection to a **`LlamaStack` instance** (e.g., `http://localhost:8321` and a specific model like `llama3.2:3b`).
    * A crucial step here is providing a set of "**comprehensive agent instructions**" to the `Agent` object. These instructions are vital as they embed *all* the business logic, guiding the LLM on its classification principles, rules for determining convertibility (always favoring "YES" for IaC), expected output format, and detailed guidance on various IaC tools.

2.  **Input Validation**:
    * When a code snippet is submitted for analysis, the agent performs a basic check to ensure the input isn't empty or too short.

3.  **Agentic Query (LLM Interaction via LlamaStack)**:
    * **Session Creation**: The `ClassifierAgent` initiates a new session with LlamaStack using `self.agent.create_session("pure_agentic_analysis")`. LlamaStack sessions are important for maintaining context and state during interactions with the LLM.
    * **Prompt Construction**: The agent constructs a detailed prompt that includes the user's code snippet and a strict output format. This prompt is carefully crafted within the `_build_agentic_prompt` method.
    * **Turn Creation and LLM Call**: The constructed prompt is then sent to the configured LLM by calling `self.agent.create_turn()`. This method sends the `UserMessage` to the LlamaStack instance, which then forwards it to the underlying LLM (e.g., `llama3.2:3b`).
    * **Raw Response Retrieval**: The `turn.output_message.content` provides the raw, unparsed text response directly from the LLM.

4.  **Response Formatting and Post-Processing**:
    * The raw text response from the LLM is parsed and structured into a `ClassificationResult` data object. This involves identifying specific sections like "Tool/Language," "Summary," and "Convertible," and extracting their content based on predefined patterns.
    * The parsing is purely data processing; it does not override or reinterpret the LLM's core decisions regarding classification or convertibility. For example, the `_parse_yes_no` method simply interprets the LLM's text output (`"YES"` or `"NO"`) into a boolean.
    * Performance metrics (duration of analysis, estimated manual conversion time, and speedup ratio) are calculated and added to the result.

5.  **Output**:
    * The agent returns a structured JSON object containing the complete analysis, indicating success or failure, and providing the detailed breakdown of the IaC snippet, its classification, and its Ansible conversion potential.

---

## LlamaStack Specific Implementation Details

The `ClassifierAgent`'s interaction with `LlamaStack` is central to its "purely agentic" design:

* **`llama_stack_client.Agent`**: The `ClassifierAgent` class wraps the `llama_stack_client.Agent` instance. This abstraction simplifies communication with the LlamaStack API, handling HTTP requests (using `httpx` internally) and managing session lifecycles.
* **Instruction Encoding**: The core intelligence and business logic aren't hardcoded into the Python processing functions. Instead, they are entirely encoded within the `_get_comprehensive_agent_instructions()` method, which provides a detailed set of rules, principles, and expected output formats directly to the LLM via `LlamaStack`. This design allows the LLM to make all "decisions."
* **Minimal Python Logic**: The Python code primarily acts as an orchestrator:
    * It initializes the `Agent` with instructions.
    * It prepares the user prompt.
    * It sends the prompt to `LlamaStack` and receives the raw text response.
    * It parses the *expected* structured output from the LLM into a Python data structure.
    * It adds non-LLM derived metadata (like performance metrics).
* **`create_session` and `create_turn`**: These `llama_stack_client` methods are the direct interaction points. `create_session` establishes a conversational context (even for single-turn requests), and `create_turn` sends a message (the user's code and prompt) and retrieves the LLM's response.
* **`step_printer(turn.steps)`**: This line in the code is crucial for debugging and understanding the LLM's internal thought process. If the LLM has been configured with tools or specific reasoning steps within LlamaStack, this would print those intermediate steps, providing transparency into *how* the LLM arrived at its classification.

---

## Key Capabilities and Features

* **LLM-Driven Intelligence**: The primary decision-making engine is the LLM, making the agent highly adaptable to new patterns and subtle nuances in IaC code without requiring frequent code updates.
* **Comprehensive Instructions**: The agent's behavior is dictated by detailed instructions given to the LLM via LlamaStack, ensuring consistent and opinionated analysis aligned with the project's goal of favoring Ansible conversion.
* **Broad IaC Tool Recognition**: It's instructed to recognize a wide array of IaC tools, from traditional configuration management (Chef, Puppet, SaltStack) and orchestration (Terraform, CloudFormation) to containerization (Docker, Kubernetes) and various shell scripts.
* **Optimistic Convertibility Assessment**: A core principle is that most infrastructure-related code *can* be converted to Ansible. The agent's role is to identify the path forward, even for complex or legacy systems.
* **Detailed Output**: The structured output provides actionable insights for developers and operations teams, guiding them through the conversion process.
* **Performance Metrics**: Provides insights into the efficiency of the automated classification versus estimated manual effort.
* **Error Handling**: Includes mechanisms to catch and report network errors or unexpected issues during the classification process.

---

## Use Case

The `ClassifierAgent` is primarily used within the `x2Ansible` API to automatically:

* **Categorize incoming IaC code snippets.**
* **Assess their readiness and approachability for conversion to Ansible.**
* **Provide initial guidance for engineers planning Ansible migrations.**

This automation significantly speeds up the initial analysis phase of IaC migration projects.