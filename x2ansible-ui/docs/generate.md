
# CodeGeneratorAgent: Production-Grade Ansible Playbook Generation

The **`CodeGeneratorAgent`** is a pivotal component within the `x2Ansible` system. Its primary responsibility is to **automatically translate and generate production-ready Ansible playbooks** from various Infrastructure-as-Code (IaC) snippets. It functions as a "purely agentic" system, relying heavily on the advanced capabilities of a Large Language Model (LLM) to perform the complex code conversion, while its Python code focuses on orchestration, prompt engineering, and crucial output refinement.

---

## Core Mission

The `CodeGeneratorAgent`'s fundamental mission is to:

1.  **Generate Accurate Playbooks**: Produce a functionally equivalent Ansible playbook based on provided input IaC code (e.g., Chef, Terraform, Dockerfile).
2.  **Incorporate Context**: Utilize contextual information (retrieved by agents like the `ContextAgent`) to enhance the quality, accuracy, and best practices of the generated Ansible code.
3.  **Ensure Production Readiness**: Generate Ansible playbooks that are clean, correctly formatted, and adhere to common YAML and Ansible conventions, suitable for direct use or minimal post-generation adjustments.
4.  **Maintain Output Integrity**: Rigorously clean the LLM's raw output to remove any extraneous formatting (like Markdown fences or extra quotes) that might break YAML parsing.

---

## How It Works

The `CodeGeneratorAgent` orchestrates the LLM-driven conversion process through a precise workflow:

1.  **Initialization**:
    * The agent initializes by instantiating a `LlamaStackClient` to connect to the `LlamaStack` service and creates a `llama_stack_client.Agent` instance.
    * Crucially, during initialization, it imbues the LLM (via `instructions`) with a highly specific persona and mission: "You are an expert in Ansible. Given INPUT CODE and CONTEXT, generate a single, production-ready Ansible playbook." These instructions also explicitly forbid Markdown code blocks and demand that the output starts with `'---'` and has no extra blank lines. This meticulous prompt engineering is fundamental to guiding the LLM's output format.

2.  **Generation Request**:
    * When triggered (e.g., via the `/api/generate` endpoint), the `generate` method receives two key inputs: the `input_code` (the original IaC snippet) and `context` (relevant information retrieved from other sources, like the `ContextAgent`).
    * It logs the receipt of these inputs.

3.  **Agentic Query (LLM Interaction via LlamaStack)**:
    * **Session Creation**: The agent begins by creating a new session with `LlamaStack` using `self.agent.create_session("code_generation")`. This provides a conversational context for the LLM, though typically for a single, focused generation turn.
    * **Prompt Construction**: It constructs a comprehensive prompt that combines the `[CONTEXT]` and `[INPUT CODE]` with clear, concise instructions for the LLM to convert the input into an Ansible playbook. The prompt reiterates the desired output format (YAML only, no Markdown, starts with `'---'`).
    * **Turn Creation and LLM Call**: The prepared prompt is then sent to the LlamaStack-hosted LLM by calling `self.agent.create_turn()`, encapsulated within a `UserMessage`.
    * **Raw Output Retrieval**: Upon the LLM completing its task, the agent extracts the raw text output from the `turn` object. The code includes robust logic to handle various ways the LLM's response might be structured (`turn.output_message.content`, `turn.content`, or iterating through `turn.steps`), ensuring the content is captured regardless of the exact response format.

4.  **Output Cleaning (`_clean_playbook_output` function)**:
    * This is a **critical post-processing step** unique to the `CodeGeneratorAgent`. Raw LLM output, even with strong prompting, can sometimes contain unwanted elements. This dedicated function performs several cleaning operations:
        * **Removes Markdown Fences**: Strips ` ``` ` or ` ~~~ ` (and any language labels) from the beginning and end.
        * **Removes Outer Quotes**: Eliminates any surrounding triple or single/double quotes that might erroneously wrap the entire playbook.
        * **Normalizes Newlines/Tabs**: Unescapes `\n` and `\t` characters.
        * **Standardizes YAML Document Markers**: Removes any duplicate or quoted `---` markers and ensures exactly one `---` at the very beginning of the playbook.
        * **Trims Whitespace**: Removes leading/trailing blank lines and ensures a single newline character at the end.
    * This cleaning ensures the generated playbook is a valid, parsable YAML file.

5.  **Validation and Output**:
    * After cleaning, the agent checks if the output is empty, raising an error if so.
    * It logs the size of the generated playbook and provides a preview of its first few lines for quick inspection.
    * Finally, the cleaned Ansible playbook (as a string) is returned to the calling route, completing the generation process.

---

## LlamaStack Specific Implementation Details

The `CodeGeneratorAgent`'s implementation is a prime example of leveraging `LlamaStack` for controlled and high-quality LLM-driven generation:

* **`llama_stack_client.Agent`**: This class is the direct programmatic interface to an agent instance running within LlamaStack. It handles the network communication and session management.
* **Precise `instructions`**: The comprehensive and explicit `instructions` provided during `Agent` initialization are paramount. They dictate the LLM's persona (`expert in Ansible`) and enforce strict formatting rules, which is crucial for generating structured code like Ansible playbooks.
* **Session Management (`create_session`, `create_turn`)**: The `create_session` call initiates a conversational context, and `create_turn` sends the user's prompt (containing input code and context) to the LlamaStack agent, receiving the LLM's generated response. This mechanism allows for tracking the interaction.
* **LLM as the "Engine"**: The Python code *doesn't* contain the logic for converting Chef resources to Ansible tasks. Instead, it relies entirely on the LLM's pre-trained knowledge and its ability to follow instructions to perform this complex translation.
* **Post-Processing Necessity**: While the LLM is guided by instructions, the explicit `_clean_playbook_output` function highlights that even with strong prompting, LLM output often requires deterministic post-processing for integration into production systems, especially for strict formats like YAML. This is a common pattern in robust LLM applications.

---

## Key Capabilities and Features

* **LLM-Powered Code Conversion**: Leverages powerful LLMs to perform sophisticated translations between different IaC languages.
* **Context-Aware Generation**: Integrates external context to provide more relevant and comprehensive generated code.
* **Strict Output Formatting**: Enforces YAML best practices and removes common LLM formatting artifacts, making the output directly usable.
* **Production-Oriented**: Aims to produce "production-ready" code, minimizing manual intervention after generation.
* **Robust Error Handling**: Includes logging and error propagation for issues encountered during the generation process.

---

## Use Case

The `CodeGeneratorAgent` is a central piece of the `x2Ansible` migration utility, primarily used to:

* **Automate IaC Conversions**: Directly convert existing IaC (like Chef recipes) into Ansible playbooks, saving significant manual effort.
* **Accelerate Migration Projects**: Provide a quick starting point for migrating infrastructure automation to an Ansible-centric approach.
* **Rapid Prototyping**: Quickly generate Ansible code for new infrastructure configurations based on natural language descriptions or existing examples.

This agent significantly enhances the speed and efficiency of moving from diverse IaC tools to a standardized Ansible environment.