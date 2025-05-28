
# `ansible_lint_tool`: Remote Ansible Playbook Validation

The `ansible_lint_tool` is a standalone Python function designed to provide **robust and reliable validation** of Ansible playbooks. It acts as the bridge between the `ValidationAgent` (and by extension, the larger `x2Ansible` system) and an external, dedicated `ansible-lint` FastAPI service. This tool ensures that any generated or provided Ansible code adheres to best practices, syntax rules, and defined standards, playing a crucial role in maintaining code quality.

---

## Core Mission

The `ansible_lint_tool`'s fundamental mission is to:

1.  **Execute Remote Linting**: Send Ansible playbook content to an external `ansible-lint` service for comprehensive validation.
2.  **Clean Input**: Pre-process the playbook content to remove any unwanted formatting (like extra quotes or Markdown fences) that might have been introduced by an LLM or other sources.
3.  **Parse and Structure Results**: Convert the raw output from the `ansible-lint` service into a structured, easily consumable format (JSON).
4.  **Provide Detailed Feedback**: Deliver a rich set of information about the validation outcome, including success/failure status, exit codes, detailed issues, and actionable recommendations.

---

## How It Works

The `ansible_lint_tool` functions as a precise interface to the remote linting service:

1.  **Input Reception**:
    * The tool receives the `playbook` content (as a string) and a `profile` (e.g., "basic", "production") from the calling agent (like the `ValidationAgent`).
    * It immediately logs the size and a preview of the raw input for debugging.

2.  **Robust Playbook Cleaning**:
    * This is a **critical pre-processing step**. LLMs or other processes might introduce extra formatting that invalidates YAML. The tool employs a series of regular expressions and string manipulations to:
        * Remove any wrapping triple quotes (`'''` or `"""`) or single/double quotes (`'` or `"`) from the entire playbook.
        * Fix escaped newline (`\n`) and tab (`\t`) characters.
        * Ensure there is exactly one `---` (YAML document start marker) at the very beginning of the playbook, removing any duplicates or quoted versions.
    * This cleaning ensures the playbook is presented to the `ansible-lint` service in a pure, valid YAML format.

3.  **Optional Pre-validation (Currently Disabled)**:
    * The code includes a section for optional Python-based YAML parsing and basic playbook structure validation using `PyYAML`.
    * **Note**: This feature is currently disabled (`ENABLE_PREVALIDATION = False`) to allow the raw LLM output to be directly tested against the `ansible-lint` service, prioritizing the full `ansible-lint` check. If re-enabled, it could catch very basic YAML syntax errors locally before a remote call.

4.  **Remote Service Call**:
    * The cleaned playbook is then prepared as a `files` payload for an HTTP `POST` request.
    * The tool constructs the target URL, appending the specified `profile` (e.g., `/v1/lint/production`).
    * It sends the playbook content to the remote `ansible-lint` FastAPI service (e.g., `https://lint-api-route-convert2ansible.apps.prod.rhoai.rh-aiservices-bu.com/v1/lint/basic`) using the `requests` library.

5.  **Response Processing and Structuring**:
    * Upon receiving a response from the `ansible-lint` service, the tool checks its HTTP status.
    * It parses the JSON response, extracting the `exit_code`, `stdout`, and `stderr` from the linting process.
    * Based on the `exit_code` (0 typically indicates success), it determines `validation_passed`.
    * If validation fails, it intelligently **parses the raw `stdout` and `stderr`** from `ansible-lint` to:
        * **Extract specific issues**: Identifies rules like `yaml[truthy]` or `yaml[new-line-at-end-of-file]`, their categories, descriptions, and inferred severity (e.g., "fatal").
        * **Calculate summary statistics**: Counts violations, warnings, and total issues.
        * **Generate recommendations**: Provides high-level advice for fixing common issues (e.g., "Review and fix yaml issue", "Install missing collection").

6.  **Error Handling**:
    * The tool includes robust error handling for common network issues (timeouts, connection errors) and unexpected validation failures, returning standardized error messages and exit codes.

---

## LlamaStack Specific Implementation Details

The `ansible_lint_tool` itself is a standard Python function, but its "LlamaStack-specific flow" comes from how it's integrated with and called by a LlamaStack agent:

* **Registered as a Tool**: As seen in the `ValidationAgent`'s code, this `ansible_lint_tool` function is passed directly into the `Agent` constructor via `tools=[ansible_lint_tool]`. This tells LlamaStack that the LLM associated with this agent can "call" this function.
* **LLM Invocation**: When the `ValidationAgent`'s LLM determines it needs to perform validation (based on its instructions and the user's prompt), it generates a "tool call" payload that includes the `playbook` and `profile` arguments. LlamaStack intercepts this tool call and executes the `ansible_lint_tool` Python function.
* **Structured Output for LLM**: The `ansible_lint_tool` is designed to return a structured Python dictionary. This is crucial because LlamaStack and the LLM can easily parse this structured data, allowing the LLM to then reason over the validation results, provide natural language explanations, and extract specific issues as demonstrated in the `ValidationAgent`'s processing logic. The `tool_execution>` logs clearly show this structured JSON being passed back to the LLM.

---

## Key Capabilities and Features

* **External Linting Integration**: Provides a clean interface to a powerful external `ansible-lint` service.
* **Intelligent Input Cleaning**: Automatically prepares playbook content for linting, increasing robustness against LLM-generated formatting quirks.
* **Detailed & Structured Output**: Delivers comprehensive validation results, including severity, specific rules, and actionable recommendations.
* **Error Resilience**: Handles common network and processing errors gracefully.
* **Profile Support**: Allows validation against different `ansible-lint` profiles (e.g., "production" vs. "basic").

---

## Use Case

The `ansible_lint_tool` is indispensable in the `x2Ansible` validation pipeline for:

* **Automated Quality Checks**: Performing automated static analysis on Ansible playbooks to enforce coding standards and identify potential issues early.
* **Integration with LLM Agents**: Serving as the backend for the `ValidationAgent`, allowing the LLM to leverage a specialized, non-hallucinatory tool for accurate validation.
* **Ensuring Playbook Correctness**: Helping developers and automation engineers ensure their Ansible code is syntactically sound and follows best practices before deployment.

---