# x2ansible - Convert Chef/Puppet to Ansible Playbooks using LlamaStack Agents (RAG-powered) [WIP]

Welcome to **x2ansible** — an agentic approach to **analyze** and **convert** Chef recipes or Puppet manifests into clean, production-ready **Ansible Playbooks**,  
built using **LlamaStack** .

## Workflow & Agent Architecture

### 🔹 Workflow

The x2ansible solution implements a clearly defined workflow for modernizing infrastructure-as-code by converting Chef recipes and Puppet manifests into Ansible Playbooks. This workflow consists of several structured phases:

1. **Input Processing**: The workflow begins with accepting Chef/Puppet code through multiple channels (upload, browse, or Git-clone).

2. **Context Enrichment**: The system retrieves relevant best practices and documentation from a vector database.

3. **Code Analysis/Conversion**: Based on the retrieved context and input code, the system either explains the code in plain English or converts it to Ansible format.

4. **Output Generation**: The workflow delivers the final results in real-time through a split-view interface for immediate feedback.

This workflow is explicitly structured to guide the decision-making process from legacy infrastructure code to modern, production-ready Ansible Playbooks.

### 🔹 Agents

x2ansible utilizes a dual-agent architecture where each agent has specialized capabilities and clear objectives:

1. **RAG Agent (Retrieval Agent)**
   * **Goal-directed**: Specifically tasked with searching the vector database for relevant infrastructure-as-code documentation.
   * **Specialized capability**: Utilizes the `builtin::rag/knowledge_search` tool to fetch context from a vector database.
   * **Autonomous operation**: Independently creates a session, formulates a query, and retrieves the top 5 most relevant document chunks.
   * **Auditable**: Results are extracted from the tool response and can be traced back to their source.

2. **Generator Agent (Output Agent)**
   * **Goal-directed**: Focused on producing either explanations or conversion outputs based on input code and context.
   * **Specialized capability**: Processes complex infrastructure code and generates human-readable explanations or syntactically correct Ansible Playbooks.
   * **Composable**: Works seamlessly with the RAG agent by incorporating the retrieved context into its generation process.
   * **Autonomous operation**: Creates dynamic sessions based on the selected mode and processes detailed prompts without human intervention.
   * **Auditable**: Streams output in real-time, allowing for immediate verification and tracing of its reasoning.

## Implementation Benefits

This agentic workflow approach delivers several key advantages:

1. **Separation of Concerns**: By dividing responsibilities between knowledge retrieval and content generation, each agent can excel at its specific task.

2. **Context-Aware Conversion**: The RAG agent ensures that generated Ansible code follows best practices by providing relevant documentation.

3. **Flexibility**: The system can switch between explanation and conversion modes while using the same underlying agent architecture.

4. **Scalability**: The modular design allows for processing multiple files and handling different infrastructure code formats.

5. **Transparency**: Real-time streaming output provides visibility into the conversion process, building trust with users.

By leveraging this structured workflow with specialized agents, x2ansible demonstrates how complex infrastructure modernization tasks can be automated effectively while maintaining high quality and adherence to best practices.



This project uses a **Llama-stack server**, **Ollama/vllm served LLM**, and a **Streamlit UI** to streamline Infrastructure-as-Code modernization.

The AgenticModel code uses two specialized agents that work together in sequence. 

1. RAG Agent (Retrieval Agent)
This agent's job is to search the vector database for relevant documentation about infrastructure-as-code:
```
pythonrag_agent = Agent(
    self.client,
    model=self.model,
    instructions="Use the RAG tool to fetch IaC-related context.",
    tools=[{
        "name": "builtin::rag/knowledge_search",
        "args": {
            "vector_db_ids": [self.vector_db],
            "top_k": 5
        }
    }],
)
```
How it works:

It's initialized with the LlamaStack client and the configured model
It's given specific instructions to fetch IaC-related context
It's equipped with the builtin::rag/knowledge_search tool
This tool is configured to:

* Search the vector database specified in the config
* Return the top 5 most relevant document chunks

The agent then:

* Creates a session named "enrich"
* Sends a query "Infrastructure-as-code resource definition"
* The query is processed by the LLM, which uses the RAG tool
* The tool searches the vector database using semantic similarity
* The results are extracted from the tool response

This agent essentially acts as the "memory" of the system, retrieving contextual information that helps with accurate code conversion.

2. Generator Agent (Output Agent)
This agent takes the context from the RAG agent plus the input code and produces the final output:
```
pythongenerator_agent = Agent(
    self.client,
    model=self.model,
    instructions="You generate playbooks or explain IaC code using helpful context.",
)
```
How it works:

Uses the same client and model as the RAG agent
Has simpler instructions focused on generation
Doesn't use any tools - it just generates content
Receives a detailed prompt based on the selected mode:

In "analyze" mode:

The prompt asks for a plain English explanation of the code
No context from the RAG agent is included (simpler task)

In "convert" mode:

The prompt includes the original code
It incorporates the context retrieved by the RAG agent
It provides detailed formatting rules for the Ansible output
These rules ensure the output follows best practices

The generator agent:

Creates a session with a dynamic ID based on the mode
Processes the detailed prompt with the LLM
Can stream the output in real-time if requested
Returns the final generated content

This two-agent architecture separates the knowledge retrieval from the generation, allowing each part to focus on its specific task while working together to produce high-quality results.

---

## 🚀 What This Solution Does ?

- **Chef/Puppet → Ansible Playbook Conversion**
  - Upload, browse, or Git-clone Chef/Puppet code.
  - An agent analyzes the code, retrieves best practices via RAG, and generates clean Ansible Playbooks.

- **Code Analysis (Explain Mode)**
  - Alternatively, the agent can **explain** what your Chef/Puppet scripts do in plain, professional English.

- **Live Streaming UI**
  - See results update in real-time inside a split-view Streamlit app.

- **Built-in RAG Retrieval**
  - Uses a vector DB of best practices (`ansible_rules`) for accurate, context-aware conversion.

- **Agentic Execution**
  - Modular and extensible: no direct LLM prompts, only LlamaStack Agents and tools.

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/rrbanda/x2ansible.git
cd x2ansible
````

### 2. Set Up Python Environment

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Start Ollama and Load Granite Model

```bash
ollama run llama3.2:3b
```

### 5. Build and Run LlamaStack

```bash
INFERENCE_MODEL=llama3.2:3b uv run --with llama-stack llama stack build --template ollama --image-type venv --run
```

### 6. 📄 Configure and verify models using `llama-stack-client models list`
```
| Model Type | Identifier              | Provider Resource ID      | Metadata                               | Provider ID |
|------------|--------------------------|----------------------------|----------------------------------------|-------------|
| embedding  | all-MiniLM-L6-v2        | all-minilm:latest          | {'embedding_dimension': 384.0}         | ollama      |
| llm        | llama3.2:3b             | llama3.2:3b                |                                        | ollama      |

```
**Total Models:** 2
---

### 7. Launch the App


streamlit run app.py
```

---

## 📚 How to Use the App

| Step | Action                                           |
| ---- | ------------------------------------------------ |
| 1    | Select **Agentic** backend in the sidebar.       |
| 2    | Choose file source (Upload, Browse, Git Repo).   |
| 3    | Upload or select Puppet/Chef files.              |
| 4    | Click **🚀 Start Conversion**.                   |
| 5    | View **Analysis** and **Playbook** side-by-side. |
| 6    | Download final output if needed.                 |

---

## 🧠 Agent Flow Diagram

```plaintext
1. Load Input (Puppet or Chef)
2. Agent A: RAG lookup via builtin::rag/knowledge_search
3. Retrieve context from vector DB (e.g., ansible_rules)
4. Build prompt with both code and context
5. Agent B: Generate output via LLM
   └─ If analyze → explanation
   └─ If convert → Ansible YAML
6. Stream results back to UI
```

---

## 📦 Project Structure

```plaintext
├── app.py                      # Streamlit frontend
├── ai_modules/
│   └── agentic_model.py        # Core agent logic
├── tools/                      # Optional external prompt templates
├── uploads/                    # Uploaded code samples
├── results/                    # Converted YAML and summaries
├── logs/                       # Log files (defaults to /tmp in OpenShift)
├── config.yaml                 # Agentic runtime config
└── settings.config             # UI config (folder paths)
```

---

## 🛡️ Features

* True agentic architecture (no manual LLM prompt injection)
* RAG-powered Ansible best-practice enrichment
* Inline YAML validation rules
* Hardened to run in Podman, Docker, OpenShift (USER 1001 safe)
* Live streaming output in Streamlit

---

## 🔧 OpenShift Deployment

Deploy with:

```bash
oc apply -f configmap.yaml
oc apply -f deployment.yaml
oc apply -f service.yaml
oc apply -f route.yaml
```

Then access via the OpenShift route URL to start using the tool.

---

## 📌 Notes

* Generated playbooks assume RHEL-based systems (uses `yum`)
* `.erb` templates are renamed to `.j2` but manual conversion of syntax may be needed
* The output adheres to `ansible-lint` rules for cleanliness and safety
* Streaming output may be rate-limited by your backend model — adjust accordingly

---

## 📜 License

MIT License – open for reuse, extension, and improvement.

---

## 🤝 Contributing

PRs, issues, and ideas are welcome! Help us improve x2ansible.

---
