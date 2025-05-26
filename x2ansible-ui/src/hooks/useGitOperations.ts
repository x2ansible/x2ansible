// src/hooks/useGitOperations.ts
import { useCallback, FormEvent } from "react";
import { CloneResponse } from "@/types/api";

interface UseGitOperationsProps {
  BACKEND_URL: string;
  gitUrl: string;
  setGitRepoName: (name: string) => void;
  setGitFolderList: (folders: string[]) => void;
  setGitFileList: (files: string[]) => void;
  setCode: (code: string) => void;
  setSelectedGitFile: (file: string) => void;
  addLogMessage: (msg: string) => void;
  addSidebarMessage: (msg: string) => void;
  setLoading: (loading: boolean) => void;
}

export const useGitOperations = ({
  BACKEND_URL,
  gitUrl,
  setGitRepoName,
  setGitFolderList,
  setGitFileList,
  setCode,
  setSelectedGitFile,
  addLogMessage,
  addSidebarMessage,
  setLoading,
}: UseGitOperationsProps) => {
  const apiCall = async (url: string, opts: RequestInit = {}) => {
    const resp = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts.headers },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  };

  const handleCloneRepo = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!gitUrl.trim()) {
      addSidebarMessage("⚠️ Please enter a Git URL");
      return;
    }

    try {
      addSidebarMessage(`🔄 Cloning repository: ${gitUrl}`);
      const formData = new FormData();
      formData.append("url", gitUrl);

      const resp = await fetch(`${BACKEND_URL}/api/files/clone`, {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error(`Clone failed: ${resp.statusText}`);

      const data: CloneResponse = await resp.json();
      if (data.error) throw new Error(data.error);

      setGitRepoName(data.cloned!);
      addSidebarMessage(`✅ Repository cloned: ${data.cloned}`);
      await fetchGitFolders(data.cloned!);
    } catch (error) {
      addSidebarMessage(`❌ ${(error as Error).message}`);
    }
  }, [gitUrl, BACKEND_URL, addSidebarMessage, setGitRepoName]);

  const fetchGitFolders = useCallback(async (repo: string) => {
    try {
      addLogMessage(`📂 Fetching folders in repository: ${repo}`);
      const result = await apiCall(
        `${BACKEND_URL}/api/files/tree?path=${encodeURIComponent(repo)}`
      );
      const items: { type: string; name: string }[] = result.items;
      const folders = items.filter(i => i.type === "folder").map(i => i.name);
      setGitFolderList(folders);
      addLogMessage(`📂 Found ${folders.length} folders in repository`);
    } catch (error) {
      addLogMessage(`❌ ${(error as Error).message}`);
    }
  }, [BACKEND_URL, addLogMessage, setGitFolderList, apiCall]);

  const fetchGitFiles = useCallback(async (repo: string, folder: string) => {
    try {
      addLogMessage(`📄 Fetching files in ${repo}/${folder}`);
      const fullPath = `${repo}/${folder}`;
      const result = await apiCall(
        `${BACKEND_URL}/api/files/tree?path=${encodeURIComponent(fullPath)}`
      );
      const items: { type: string; name: string }[] = result.items;
      const files = items.filter(i => i.type === "file").map(i => i.name);
      setGitFileList(files);
      addLogMessage(`📄 Found ${files.length} files`);
    } catch (error) {
      addLogMessage(`❌ ${(error as Error).message}`);
    }
  }, [BACKEND_URL, addLogMessage, setGitFileList, apiCall]);

  const fetchGitFileContent = useCallback(async (repo: string, folder: string, file: string) => {
    try {
      setLoading(true);
      const rawPath = `${repo}/${folder}/${file}`;
      const safePath = rawPath.split("/").map(encodeURIComponent).join("/");
      addLogMessage(`📖 Loading Git file: ${rawPath}`);

      const resp = await fetch(`${BACKEND_URL}/uploads/${safePath}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const text = await resp.text();

      setCode(text);
      setSelectedGitFile(file);
      addLogMessage(`✅ Git file loaded: ${text.length} characters`);
    } catch (error) {
      addLogMessage(`❌ ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL, addLogMessage, setCode, setSelectedGitFile, setLoading]);

  return {
    handleCloneRepo,
    fetchGitFolders,
    fetchGitFiles,
    fetchGitFileContent,
  };
};

