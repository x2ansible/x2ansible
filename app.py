import os
import time
import yaml
import shutil
import logging
import tempfile
import subprocess
from configparser import ConfigParser
import urllib.parse
import logging
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

# === Logging ===
# Setup logging properly before Streamlit starts
if not logging.getLogger().hasHandlers():
    log_dir = Path("logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    logging_path = log_dir / "app.log"
    logging.basicConfig(
        filename=str(logging_path),
        level=logging.DEBUG,
        format="%(asctime)s [%(levelname)s] %(message)s"
    )

# === Page Config ===
st.set_page_config(
    page_title="Convert to Ansible",
    page_icon="🅰️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# === Theme & Styling ===
st.markdown("""
<style>
    /* Global Theme */
    .main {
        background-color: #111827;
        color: #F9FAFB;
    }
    .stApp {
        background-color: #111827;
    }
    h1, h2, h3, h4, h5, h6, p, li, div {
        color: #F9FAFB !important;
    }
    
    /* Sidebar Styling */
    section[data-testid="stSidebar"] {
        background-color: #1F2937;
        border-right: 1px solid #374151;
    }
    section[data-testid="stSidebar"]::before {
        content: "";
        display: block;
        margin: 0 auto 1rem auto;
        background-image: url('https://upload.wikimedia.org/wikipedia/commons/0/05/Ansible_Logo.png');
        background-repeat: no-repeat;
        background-position: center;
        background-size: contain;
        height: 80px;
    }
    
    /* Containers & Cards */
    .content-card {
        background-color: #1F2937;
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        border: 1px solid #374151;
    }
    
    /* File Header */
    .file-header {
        background: #141E33;
        padding: 12px 15px;
        border-radius: 8px;
        margin: 15px 0;
        border-left: 5px solid #FF4B4B;
        display: flex;
        align-items: center;
    }
    .file-header h3 {
        margin: 0;
        font-size: 16px;
    }
    
    /* Code Canvas */
    .code-canvas {
        background-color: #1A1D21;
        border-radius: 6px;
        position: relative;
        margin-top: 40px;
        border: 1px solid #2D3748;
        font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
    }
    .code-header {
        background: #141E33;
        padding: 8px 12px;
        border-radius: 5px 5px 0 0;
        font-size: 14px;
        font-weight: 500;
        color: #A0AEC0;
        border-bottom: 1px solid #2D3748;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }
    .code-copy-btn {
        color: #A0AEC0;
        cursor: pointer;
        font-size: 14px;
    }
       
    /* Progress Bar – eliminate unwanted blue bar effect */
    div[data-testid="stProgress"] {
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        padding: 0 !important;
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
    }
    div.stProgress > div > div {
        background-color: #10B981 !important;
    }

    
    /* Button Styling */
    .stButton > button {
        background-color: #EF4444;
        color: white; 
        border: none;
        border-radius: 6px;
        padding: 10px 24px;
        font-weight: 300;
    }
    .stButton > button:hover {
        background-color: #059669;
    }
    
    /* Radio & Checkbox */
    .stRadio > div {
        background-color: #1F2937;
        padding: 10px;
        border-radius: 6px;
    }
    .stCheckbox > div > label {
        color: #F9FAFB !important;
    }
    
    /* Expander */
    .streamlit-expanderHeader {
        background-color: #1F2937;
        color: #F9FAFB !important;
        border: 1px solid #374151;
        border-radius: 6px;
    }
    
    /* Code Syntax Highlighting */
    pre {
        background-color: #1A1D21 !important;
    }
    code {
        color: #E5E7EB !important;
    }
    .highlight .k { color: #10B981 !important; } /* Keyword */
    .highlight .s { color: #F59E0B !important; } /* String */
    .highlight .c { color: #6B7280 !important; } /* Comment */
    .highlight .n { color: #F9FAFB !important; } /* Name */
    
    /* Input Fields */
    .stTextInput > div > div > input {
        background-color: #1F2937;
        color: #F9FAFB;
        border: 1px solid #374151;
    }
    
    /* Multiselect */
    .stMultiSelect > div > div {
        background-color: #1F2937;
        color: #F9FAFB;
        border: 1px solid #374151;
    }
    
    /* Remove Padding */
    div[data-testid="stVerticalBlock"] > div {
        padding-top: 0.25rem !important;
        padding-bottom: 0.25rem !important;
    }
    
    /* Success Message */
    .success-message {
        background-color: #064E3B;
        color: #F0FDF4;
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid #10B981;
        margin: 12px 0;
    }
    
    /* Error Message */
    .error-message {
        background-color: #7F1D1D;
        color: #FEF2F2;
        padding: 12px;
        border-radius: 6px;
        border-left: 4px solid #EF4444;
        margin: 12px 0;
    }
    
    /* Custom Icons */
    .icon-label {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .icon-label::before {
        content: "";
        display: inline-block;
        width: 18px;
        height: 18px;
    }
    .icon-analysis::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F9FAFB'%3E%3Cpath d='M9.5 3v4.5H5a2 2 0 0 0-2 2v9.5a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9.5a2 2 0 0 0-2-2h-4.5V3h-5zm-1 12a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5h2zm4 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5h2zm4 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1-.5-.5v-2a.5.5 0 0 1 .5-.5h2z'/%3E%3C/svg%3E");
    }
    .icon-code::before {
        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23F9FAFB'%3E%3Cpath d='M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z'/%3E%3C/svg%3E");
    }
            
 /* Flex layout row for canvas */

/* Ensure side-by-side blocks with proper scrollbars */
.canvas-row {
    display: flex;
    gap: 24px;
    width: 100%;
    margin-top: 1rem;
}

/* Each block (analysis/playbook) takes half screen */
.canvas-box {
    flex: 1;
    display: flex;
    flex-direction: column;
}

/* Shared canvas styling */
.code-canvas {
    background-color: #1A1D21;
    border: 1px solid #2D3748;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 600px;
}

/* Sticky top header inside canvas */
.code-header {
    background: #141E33;
    padding: 10px 16px;
    font-size: 15px;
    font-weight: 600;
    color: #F9FAFB;
    border-bottom: 1px solid #2D3748;
    white-space: nowrap;
}

/* Scrollable content for analysis summary */
.analysis-container {
    overflow-y: auto;
    overflow-x: hidden;
    padding: 14px;
    color: #F9FAFB;
    font-size: 15px;
    line-height: 1.6;
    flex: 1;
}

/* Scrollable content for code too (auto by Streamlit's st.code) */
pre {
    overflow-x: auto !important;
}


</style>
""", unsafe_allow_html=True)

# === Config Defaults ===
config = ConfigParser()
config.read("settings.config")
default_upload_path = config.get("files", "file_location", fallback="uploads")
default_output_path = config.get("files", "summary_location", fallback="results")

# === Session State Init ===
st.session_state.setdefault("ai", None)
st.session_state.setdefault("backend_configured", False)
st.session_state.setdefault("show_backend_config", True)
st.session_state.setdefault("file_selected", [])
st.session_state.setdefault("current_input", {})
st.session_state.setdefault("analysis_results", {})
st.session_state.setdefault("playbook_results", {})
st.session_state.setdefault("cloned_repo_path", "")
st.session_state.setdefault("clone_status", "")
st.session_state.setdefault("output_folder", default_output_path)
st.session_state.setdefault("processing_files", False)
st.session_state.setdefault("conversion_complete", False)

# === Main App Title ===
st.markdown("""
<style>
    .app-title-container {
        margin-top: -1.25rem;
        margin-bottom: 0.75rem;
    }
    .app-title-container h3 {
        font-size: 1.4rem;
        margin: 0;
        padding: 0;
        display: inline;
        color: #F9FAFB;
    }
    .app-title-container p {
        font-size: 0.9rem;
        opacity: 0.7;
        margin-top: 0.25rem;
        margin-bottom: 0;
    }
</style>

<div class="app-title-container">
    <h3>🅰️ Ansible Converter</h3>
    <p>Transform IaC into Ansible playbooks with AI</p>
</div>
""", unsafe_allow_html=True)

# === Sidebar Configuration ===
# Sidebar Backend Selection
with st.sidebar:
    st.sidebar.markdown("## ⚙️ Configuration")
    backend = st.radio("Choose Backend", ["simple", "agentic"], index=0)

    if backend == "simple":
        from ai_modules.maas_model import MaasModel
        st.markdown("### 🔐 Simple Backend")
        maas_key = st.text_input("API Key", type="password", key="simple_key")
        maas_url = st.text_input("Endpoint URL", value="https://granite-8b-code-instruct-maas-apicast-production.apps.prod.rhoai.rh-aiservices-bu.com:443", key="simple_url")
        maas_model = st.text_input("Model ID", value="granite-8b-code-instruct-128k", key="simple_model")
        maas_stream = st.checkbox("Enable Streaming", value=True, key="simple_stream")

        if all([maas_key, maas_url, maas_model]):
            st.session_state.ai = MaasModel(
                api_key=maas_key,
                endpoint_url=maas_url,
                model_name=maas_model,
                stream=maas_stream
            )
            st.session_state.backend_configured = True
            st.markdown("<div class='success-message'>✅ Backend configured.</div>", unsafe_allow_html=True)

    elif backend == "agentic":
        from ai_modules.agentic_model import AgenticModel
        st.markdown("### 🧠 Agentic(LLS)")

        # Immediately configure without needing key
        st.session_state.ai = AgenticModel()
        st.session_state.backend_configured = True
        st.markdown("<div class='success-message'>✅ Agentic backend configured. Ready to select files.</div>", unsafe_allow_html=True)

    
    # Output folder hidden in Advanced Settings expander
    with st.expander("Advanced Settings"):
        st.session_state.output_folder = st.text_input("📦 Output Folder", st.session_state.output_folder)

# === File Source Picker (Upload, Browse, Git) ===
if st.session_state.backend_configured:
    st.sidebar.markdown("## 📂 Choose File Source")
    file_source = st.sidebar.radio("Source", ["Upload Files", "Browse Existing", "Git Repo"], key="file_source_radio")

    # Reset on source change
    if "previous_source" not in st.session_state or st.session_state.previous_source != file_source:
        st.session_state.file_selected = []
        st.session_state.current_input = {}
        st.session_state.previous_source = file_source

    if file_source == "Upload Files":
        uploaded_files = st.sidebar.file_uploader(
            "Upload `.pp`, `.rb`, or `.yml` files",
            type=["pp", "rb", "yml"],
            accept_multiple_files=True,
            key="uploaded_files"
        )
        if uploaded_files:
            st.session_state.file_selected = []
            st.session_state.current_input = {}
            for f in uploaded_files:
                st.session_state.current_input[f.name] = f.read().decode("utf-8")
                st.session_state.file_selected.append(f.name)
            st.sidebar.markdown("<div class='success-message'>📥 Uploaded " + str(len(uploaded_files)) + " file(s)</div>", unsafe_allow_html=True)

    elif file_source == "Browse Existing":
        folder = st.sidebar.text_input("📁 Folder to browse", default_upload_path, key="browse_path")
        if os.path.exists(folder):
            all_files = [
                f for f in os.listdir(folder)
                if os.path.isfile(os.path.join(folder, f)) and f.endswith(('.pp', '.rb', '.yml'))
            ]
            selected = st.sidebar.multiselect("📄 Select files", all_files, key="browse_file_select")
            st.session_state.file_selected = []
            st.session_state.current_input = {}
            for fname in selected:
                full_path = os.path.join(folder, fname)
                st.session_state.current_input[fname] = open(full_path).read()
                st.session_state.file_selected.append(fname)
        else:
            st.sidebar.markdown("<div class='error-message'>Folder does not exist.</div>", unsafe_allow_html=True)

    elif file_source == "Git Repo":
        git_url = st.sidebar.text_input("🔗 Git Repository URL", key="git_url")
        branch = st.sidebar.text_input("🌿 Branch (optional)", value="main", key="git_branch")

        if st.sidebar.button("🔄 Clone Repo"):
            try:
                temp_dir = tempfile.mkdtemp(dir="/tmp")
                cmd = ["git", "clone", "--depth", "1"]
                if branch: cmd += ["--branch", branch]
                cmd += [git_url, temp_dir]
                subprocess.check_call(cmd)
                st.session_state.cloned_repo_path = temp_dir
                st.session_state.clone_status = f"✅ Cloned: {git_url}"
            except Exception as e:
                st.session_state.clone_status = f"❌ Clone failed: {e}"

        st.sidebar.markdown("📜 Clone Status")
        st.sidebar.code(st.session_state.clone_status or "No repo cloned yet.")

        if st.session_state.cloned_repo_path and os.path.exists(st.session_state.cloned_repo_path):
            repo_root = st.session_state.cloned_repo_path
            repo_files = []
            for root, _, files in os.walk(repo_root):
                for f in files:
                    if f.endswith(('.pp', '.rb', '.yml')):
                        rel = os.path.relpath(os.path.join(root, f), repo_root)
                        repo_files.append(rel)

            selected = st.sidebar.multiselect("📄 Files in repo", repo_files, key="git_file_select")
            st.session_state.file_selected = []
            st.session_state.current_input = {}
            for rel_path in selected:
                full_path = os.path.join(repo_root, rel_path)
                st.session_state.current_input[rel_path] = open(full_path).read()
                st.session_state.file_selected.append(rel_path)

# === Main content area ===
# === Start conversion logic ===
if st.button("🚀 Start Conversion", type="primary", use_container_width=True):
    st.markdown("""
    <style>
        div[data-testid="stVerticalBlock"] > div {
            margin-top: 0rem !important;
        }
        div[data-testid="stProgress"] {
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            border: none !important;
            box-shadow: none !important;
        }
    </style>
    """, unsafe_allow_html=True)

    st.session_state.conversion_triggered = True
    st.session_state.processing_files = True
    st.session_state.conversion_complete = False
    st.session_state.current_file_index = 0
    st.session_state.analysis_results = {}
    st.session_state.playbook_results = {}

# === Show layout directly under Start Conversion ===
if st.session_state.get("conversion_triggered", False) and st.session_state.file_selected:
    total_files = len(st.session_state.file_selected)
    progress_bar = st.progress(0)

    for idx, filename in enumerate(st.session_state.file_selected):
        code = st.session_state.current_input[filename]
        st.session_state.current_file_index = idx
        progress_bar.progress((idx + 1) / total_files)

        summary_text = ""
        playbook_text = ""

        try:
            for chunk in st.session_state.ai.transform(code, mode="analyze", stream_ui=True):
                summary_text += chunk
            st.session_state.analysis_results[filename] = summary_text
        except Exception as e:
            summary_text = f"❌ Analysis failed: {e}"

        try:
            for chunk in st.session_state.ai.transform(code, mode="convert", stream_ui=True):
                playbook_text += chunk
            st.session_state.playbook_results[filename] = playbook_text
        except Exception as e:
            playbook_text = f"❌ Conversion failed: {e}"

        col1, col2 = st.columns(2, gap="large")

        with col1:
            st.markdown("<div class='code-header'>🔍 Analysis Summary</div>", unsafe_allow_html=True)
            st.markdown(f"<div class='analysis-container'>{summary_text}</div>", unsafe_allow_html=True)

        with col2:
            st.markdown("<div class='code-header'>🧩 Generated Ansible Playbook</div>", unsafe_allow_html=True)
            st.code(playbook_text, language="yaml")

    st.session_state.processing_files = False
    st.session_state.conversion_complete = True


    if st.session_state.conversion_complete:
        if "progress_bar" in locals():
            progress_bar.progress(1.0)
        st.success(f"✅ Conversion complete. Files saved to: {st.session_state.output_folder}")


        with st.expander("📥 Download Generated Files", expanded=True):
            for filename in st.session_state.file_selected:
                col1, col2 = st.columns([1, 1])

                playbook_path = os.path.join(st.session_state.output_folder, f"{filename}.yaml")
                summary_path = os.path.join(st.session_state.output_folder, f"{filename}.summary.md")

                if os.path.exists(playbook_path):
                    with open(playbook_path, 'r') as f:
                        playbook_content = f.read()
                    col1.download_button(
                        f"📥 Playbook: {filename}.yaml",
                        playbook_content,
                        file_name=f"{filename}.yaml",
                        mime="text/yaml"
                    )

                if os.path.exists(summary_path):
                    with open(summary_path, 'r') as f:
                        summary_content = f.read()
                    col2.download_button(
                        f"📥 Analysis: {filename}.summary.md",
                        summary_content,
                        file_name=f"{filename}.summary.md",
                        mime="text/markdown"
                    )
