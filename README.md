# x2ansible - convert chef/puppet to ansible playbooks using LlamaStack Agents (RAG-powered)

Welcome to **x2ansible** —  
an AI-powered tool to **analyze** and **convert** Chef recipes or Puppet manifests into clean, production-ready **Ansible Playbooks**,  
powered by **LlamaStack Agents** and **Retrieval-Augmented Generation (RAG)**.

This project combines a **local LlamaStack server**, **Ollama model serving**, and a **Streamlit UI** to streamline Infrastructure-as-Code modernization.

---



## 🚀 What This Solution Does

- **Chef/Puppet → Ansible Playbook Conversion:**
  - Upload, browse, or Git-clone Chef/Puppet code.
  - An agent analyzes the code, retrieves best practices via RAG, and generates clean Ansible Playbooks.

- **Code Analysis (Explain Mode):**
  - Alternatively, you can ask the agent to **analyze** your code —  
    it explains what the Chef/Puppet scripts are doing, in professional plain English.

- **Streaming UI:**
  - Results stream live into the Streamlit interface: side-by-side Analysis and Playbook views.

- **Built-in RAG Retrieval:**
  - The agent uses a custom `ansible_rules` vector database to fetch Ansible best practices during playbook generation.

- **Agentic Execution:**
  - Everything is done by LlamaStack Agents — no direct LLM calls — making it modular, explainable, and extendable.

---

## Solution Design 
Start
  |
  v
+---------------------------+
| 1️⃣ Load Puppet/Chef Code |
+---------------------------+
  |
  v
+------------------------------------+
| 2️⃣ Create Agent A (RAG Agent)     |
|  • Tool: builtin::rag/knowledge_search |
+------------------------------------+
  |
  v
+------------------------+
| 🔁 Turn 1 (Agent A)    |
| Input: "puppet file resource"      |
| Output: RAG context chunks         |
+------------------------+
  |
  v
+---------------------------------------+
| 3️⃣ Combine:                          |
|  • Puppet Code                        |
|  • Retrieved RAG Context              |
|  → Build single combined LLM prompt   |
+---------------------------------------+
  |
  v
+------------------------------+
| 4️⃣ Create Agent B (LLM Agent) |
|  • No tools                   |
|  • Instructions depend on mode|
+------------------------------+
  |
  v
+------------------------+
| 🔁 Turn 2 (Agent B)    |
| Input: Combined prompt |
| Output:                |
|  • If mode == analyze: English summary |
|  • If mode == convert: Ansible YAML    |
+------------------------+
  |
  v
Done 🎉


# ⚙️ Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/rrbanda/x2ansible.git
cd x2ansible

```

---

### 2. Set Up Python Environment

**Create and activate a virtual environment:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

---

### 3. Install Required Python Packages

**Install dependencies from `requirements.txt`:**

```bash
pip install -r requirements.txt
```

---

### 4. Start Ollama and Load Granite Model

**In a new terminal:**

```bash
ollama run granite-code:8b
```

- This starts the `granite-code:8b` model locally for inference.

---

### 5. Build and Run the LlamaStack Server

**In another new terminal:**

```bash
INFERENCE_MODEL=granite-code:8b uv run --with llama-stack llama stack build --template ollama --image-type venv --run
```

- This builds and starts your local LlamaStack server, connected to your Ollama model.

---

### 6. Configure and Register Your Model

**In your project virtual environment:**

- Configure the LlamaStack client:

```bash
llama-stack-client configure --endpoint http://localhost:8321 --api-key none
```

- Register your granite model:

```bash
llama-stack-client models register granite-code:8b
```

- Confirm that the model is registered:

```bash
llama-stack-client models list
```

You should see `granite-code:8b` and `llama3.2:3b` listed.

---

### 7. Launch the Streamlit App

**Still in your project root with the virtual environment activated:**

```bash
streamlit run app.py
```

The Streamlit UI will open at [http://localhost:8501](http://localhost:8501).

---

## 📚 How to Use the App

| Step | Action |
|:---|:---|
| 1 | Select **Agentic** backend in the sidebar. |
| 2 | Choose your **file source**: Upload, Browse local files, or Git Clone. |
| 3 | Upload or select Chef/Puppet files for analysis or conversion. |
| 4 | Click **🚀 Start Conversion**. |
| 5 | Watch live **Analysis** and **Ansible Playbook** generation side-by-side! |
| 6 | Download final playbooks and summaries from the interface if needed. |

---

## 🧠 Internal Agent Architecture

```plaintext
User Input (Chef/Puppet Code)
          ↓
AgenticModel.transform(mode="analyze" or "convert")
          ↓
Creates LlamaStack Agent dynamically
          ↓
    ┌───────────────────────────────────────┐
    │ builtin::rag Tool (Vector DB: ansible_rules) │
    └───────────────────────────────────────┘
          ↓ (retrieved best practices)
Agent enriches context
          ↓
LLM Inference (via LlamaStack Model: llama3.2:3b)
          ↓
Streaming Output
          ↓
Frontend Display (Streamlit)
          ↓
Optional Post-processing (sanitize YAML, flatten blocks)
          ↓
Final Analysis / Playbook Output
```

---

# 📦 Project Structure

```plaintext
├── app.py                    # Streamlit UI application
├── ai_modules/
│   └── agentic_model.py       # Agent wrapper handling inference
├── tools/
│   ├── analyze_instructions.txt  # Text prompt for analysis mode
│   └── convert_instructions.txt  # Text prompt for convert mode
├── uploads/                  # Uploaded input files
├── results/                   # Generated playbooks and summaries
├── settings.config            # Settings (e.g., default folders)
├── logs/
│   └── app.log                 # Logging output
└── README.md                  # This file!
```

---

# 🛡️ Key Features

- True agentic execution (no direct LLM prompt hacking).
- Best-practice Ansible playbook generation via RAG enrichment.
- Automatic creation of `ansible_rules` vector database.
- Externalized instruction prompts (easy to customize).
- Full logging (`logs/app.log`).
- Streaming live output for smooth UI experience.

---

# 📢 Notes

- Playbooks generated assume a **RHEL-based** system (preferring `yum` over `apt`).
- `when: true` conditions are automatically removed if unnecessary.
- `.erb` templates should be replaced by `.j2` templates manually after conversion (or post-processing improvements can be added).

---

#  Contributing

We welcome PRs, issues, suggestions, and ideas to improve this project!

---

# 📜 License

MIT License

---
