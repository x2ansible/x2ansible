// src/hooks/useFileOperations.ts
import { useCallback, ChangeEvent } from "react";
import { FileUploadResponse, FileListResponse } from "@/types/api";

interface UseFileOperationsProps {
  BACKEND_URL: string;
  setFolderList: (folders: string[]) => void;
  setFileList: (files: string[]) => void;
  setCode: (code: string) => void;
  setSelectedFile: (file: string) => void;
  setUploadKey: (key: number) => void;
  addLogMessage: (msg: string) => void;
  addSidebarMessage: (msg: string) => void;
  gitRepoName: string;
  setLoading: (loading: boolean) => void;
}

export const useFileOperations = ({
  BACKEND_URL,
  setFolderList,
  setFileList,
  setCode,
  setSelectedFile,
  setUploadKey,
  addLogMessage,
  addSidebarMessage,
  gitRepoName,
  setLoading,
}: UseFileOperationsProps) => {
  const apiCall = async (url: string, opts: RequestInit = {}) => {
    const resp = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts.headers },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  };

  const readFileAsText = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e =>
        typeof e.target?.result === "string"
          ? resolve(e.target.result)
          : reject(new Error("Result not string"));
      reader.onerror = () => reject(new Error(reader.error?.message || "FileReader error"));
      reader.onabort = () => reject(new Error("File reading aborted"));

      if (file.size === 0) return reject(new Error("File is empty"));
      if (file.size > 10 * 1024 * 1024) return reject(new Error("File too large (>10MB)"));

      reader.readAsText(file, "UTF-8");
    });

  const fetchFolders = useCallback(async () => {
    try {
      addLogMessage("📂 Fetching available folders...");

      const data: FileListResponse = await apiCall(
        "/api/files/list"
      );
      if (data.error) throw new Error(data.error);

      const unique = Array.from(
        new Set(
          data.folders!.filter(folder => folder !== gitRepoName)
        )
      );

      setFolderList(unique);
      addLogMessage(`📂 Found ${unique.length} folders`);
    } catch (error) {
      addLogMessage(` ${(error as Error).message}`);
    }
  }, [BACKEND_URL, gitRepoName]); // Removed addLogMessage and setFolderList from dependencies

  const fetchFilesInFolder = useCallback(async (folder: string) => {
    try {
      addLogMessage(`📄 Fetching files in folder: ${folder}`);
      const data: FileListResponse = await apiCall(
        `${BACKEND_URL}/api/files/${encodeURIComponent(folder)}/list`
      );
      if (data.error) throw new Error(data.error);
      setFileList(data.files || []);
      addLogMessage(`📄 Found ${data.files?.length || 0} files`);
    } catch (error) {
      addLogMessage(` ${(error as Error).message}`);
    }
  }, [BACKEND_URL]); // Removed function dependencies

  const fetchFileContent = useCallback(async (folder: string, file: string) => {
    try {
      setLoading(true);
      const rawPath = folder === "__ROOT__" ? file : `${folder}/${file}`;
      const safePath = rawPath.split("/").map(encodeURIComponent).join("/");
      addLogMessage(`📖 Loading file: ${rawPath}`);

      const resp = await fetch(`${BACKEND_URL}/uploads/${safePath}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();

      setCode(text);
      setSelectedFile(file);
      addLogMessage(` File loaded: ${text.length} characters`);
    } catch (error) {
      addLogMessage(` ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL]); 

  const handleUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addLogMessage(`📁 Processing file: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`);
    try {
      addLogMessage("📖 Reading file content...");
      const content = await readFileAsText(file);
      setCode(content);
      setSelectedFile(file.name);

      addLogMessage("⬆️ Uploading file to server...");
      const formData = new FormData();
      formData.append("files", file);

      // ✅ Use your existing environment variable
      const resp = await fetch(
        "/api/files/upload",
        {
          method: "POST",
          body: formData,
        }
      );
      if (!resp.ok) throw new Error(`Server upload failed: ${resp.status}`);

      const data: FileUploadResponse = await resp.json();
      if (data.error) throw new Error(`Server error: ${data.error}`);

      addSidebarMessage(` File uploaded successfully: ${data.saved_files.join(", ")}`);
    } catch (error) {
      addLogMessage(` File processing failed: ${(error as Error).message}`);
      setCode("");
      setSelectedFile("");
    } finally {
      setUploadKey(Date.now());
    }
  }, [BACKEND_URL]); 

  return {
    fetchFolders,
    fetchFilesInFolder,
    fetchFileContent,
    handleUpload,
  };
};