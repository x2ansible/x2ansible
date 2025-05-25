from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from typing import List, Dict, Union
import os
import subprocess

router = APIRouter()
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/files/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    saved = []
    for file in files:
        dest_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(dest_path, "wb") as f:
            content = await file.read()
            f.write(content)
        saved.append(file.filename)
    return {"saved_files": saved}

@router.get("/files/list")
async def list_folders():
    entries = os.listdir(UPLOAD_DIR)
    folders = [entry for entry in entries if os.path.isdir(os.path.join(UPLOAD_DIR, entry))]
    has_root_files = any(os.path.isfile(os.path.join(UPLOAD_DIR, f)) for f in entries)
    if has_root_files:
        folders.insert(0, "__ROOT__")
    return {"folders": folders}

@router.get("/files/{folder}/list")
async def list_files_in_folder(folder: str):
    target_dir = UPLOAD_DIR if folder == "__ROOT__" else os.path.join(UPLOAD_DIR, folder)
    if not os.path.exists(target_dir):
        return JSONResponse(status_code=404, content={"error": "Folder not found"})
    files = [f for f in os.listdir(target_dir) if os.path.isfile(os.path.join(target_dir, f))]
    return {"files": files}

@router.get("/files/tree")
def get_file_tree(path: str = "") -> Dict[str, Union[str, list]]:
    root_path = os.path.join(UPLOAD_DIR, path)
    if not os.path.exists(root_path):
        return JSONResponse(status_code=404, content={"error": "Path not found"})

    tree = []
    for entry in os.listdir(root_path):
        full_path = os.path.join(root_path, entry)
        if os.path.isdir(full_path):
            tree.append({"type": "folder", "name": entry})
        elif os.path.isfile(full_path):
            tree.append({"type": "file", "name": entry})
    return {"path": path, "items": tree}

@router.post("/files/clone")
async def clone_repo(url: str = Form(...)):
    repo_name = url.split("/")[-1].replace(".git", "")
    target_dir = os.path.join(UPLOAD_DIR, repo_name)

    # Return existing contents if already cloned
    if os.path.exists(target_dir):
        files = os.listdir(target_dir)
        return {"cloned": repo_name, "files": files}

    try:
        subprocess.run(["git", "clone", url, target_dir], check=True)
        files = os.listdir(target_dir)
        return {"cloned": repo_name, "files": files}
    except subprocess.CalledProcessError as e:
        return JSONResponse(status_code=500, content={"error": f"Clone failed: {str(e)}"})
