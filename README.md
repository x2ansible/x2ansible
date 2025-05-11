# x2ansible - Convert Chef/Puppet to Ansible Playbooks using LlamaStack Agents (RAG-powered)

Welcome to **x2ansible** — an AI-powered tool to **analyze** and **convert** Chef recipes or Puppet manifests into clean, production-ready **Ansible Playbooks**,  
built using **LlamaStack** .

This project uses a **Llama-stack server**, **Ollama/vllm served LLM**, and a **Streamlit UI** to streamline Infrastructure-as-Code modernization.

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