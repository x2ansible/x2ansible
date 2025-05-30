from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from typing import List, Dict, Union
import os
import subprocess

router = APIRouter()
UPLOAD_DIR = "uploads"  # Default fallback

def set_upload_dir(upload_dir: str):
    global UPLOAD_DIR
    UPLOAD_DIR = upload_dir
    os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/files/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    saved: List[str] = []
    for file in files:
        dest_path = os.path.join(UPLOAD_DIR, file.filename)
        content = await file.read()
        with open(dest_path, "wb") as f:
            f.write(content)
        saved.append(file.filename)
    return {"saved_files": saved}

@router.get("/files/list")
async def list_folders():
    entries = os.listdir(UPLOAD_DIR)
    dirs = [
        e for e in entries
        if os.path.isdir(os.path.join(UPLOAD_DIR, e))
        and not os.path.isdir(os.path.join(UPLOAD_DIR, e, ".git"))
    ]
    folders = ["__ROOT__"] + dirs
    return {"folders": folders}

@router.get("/files/{folder}/list")
async def list_files_in_folder(folder: str):
    target = UPLOAD_DIR if folder == "__ROOT__" else os.path.join(UPLOAD_DIR, folder)
    if not os.path.exists(target):
        return JSONResponse(status_code=404, content={"error": "Folder not found"})
    files = [
        f for f in os.listdir(target)
        if os.path.isfile(os.path.join(target, f))
    ]
    return {"files": files}

@router.get("/files/tree")
async def get_file_tree(path: str = "") -> Dict[str, Union[str, list]]:
    root = os.path.join(UPLOAD_DIR, path)
    if not os.path.exists(root):
        return JSONResponse(status_code=404, content={"error": "Path not found"})

    def list_dir(folder):
        items = []
        for entry in os.listdir(folder):
            full = os.path.join(folder, entry)
            rel  = os.path.relpath(full, UPLOAD_DIR)
            if os.path.isdir(full):
                items.append({"type": "folder", "name": entry, "path": rel})
            elif os.path.isfile(full) and entry.lower().endswith(
                (".yml", ".yaml", ".rb", ".pp", ".json", ".tf")
            ):
                items.append({"type": "file", "name": entry, "path": rel})
        return items

    return {"path": path, "items": list_dir(root)}

@router.post("/files/clone")
async def clone_repo(url: str = Form(...)):
    repo_name = url.rstrip("/").split("/")[-1].removesuffix(".git")
    target_dir = os.path.join(UPLOAD_DIR, repo_name)

    if os.path.isdir(target_dir):
        return {"cloned": repo_name}

    try:
        subprocess.run(["git", "clone", url, target_dir], check=True)
        return {"cloned": repo_name}
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=500, detail=f"Clone failed: {e}")
