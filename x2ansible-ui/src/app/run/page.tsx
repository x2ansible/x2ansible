// src/app/run/page.tsx
"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

// === Backend origin for static file fetches ===
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

const steps = ["Classify", "Context", "Convert", "Validate", "Deploy"];

interface ClassificationResponse { classification: string; error?: string }
interface FileUploadResponse    { saved_files: string[]; error?: string }
interface FileListResponse      { folders?: string[]; files?: string[]; error?: string }
interface CloneResponse         { cloned?: string; error?: string }

export default function RunWorkflowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // ─── State ────────────────────────────────────────────────────────────────
  const [step, setStep]                 = useState(0);
  const [sourceType, setSourceType]     = useState<"upload"|"existing"|"git">("upload");
  const [uploadKey, setUploadKey]       = useState(Date.now());
  const [gitUrl, setGitUrl]             = useState("");

  const [code, setCode]                 = useState("");
  const [loading, setLoading]           = useState(false);
  const [classificationResult, setClassificationResult] = useState("");
  const [logMessages, setLogMessages]   = useState<string[]>([]);
  const [sidebarMessages, setSidebarMessages] = useState<string[]>([]);

  const [folderList, setFolderList]     = useState<string[]>([]);
  const [fileList, setFileList]         = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState("");
  const [selectedFile, setSelectedFile]     = useState("");

  const [gitRepoName, setGitRepoName]   = useState("");
  const [gitFolderList, setGitFolderList] = useState<string[]>([]);
  const [gitFileList, setGitFileList]   = useState<string[]>([]);
  const [selectedGitFolder, setSelectedGitFolder] = useState("");
  const [selectedGitFile, setSelectedGitFile]     = useState("");

  // ─── Effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (status === "unauthenticated") {
      const t = setTimeout(() => router.replace("/"), 2000);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  useEffect(() => {
    if (sourceType === "existing") {
      fetchFolders();
    }
  }, [sourceType, gitRepoName]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const apiCall = async (url: string, opts: RequestInit = {}) => {
    const resp = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts.headers },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  };

  const addLog = (msg: string) =>
    setLogMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  // ← alias so old calls to addLogMessage still work
  const addLogMessage = addLog;

  const addSidebarMessage = (msg: string) =>
    setSidebarMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

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

  // ─── Classification ─────────────────────────────────────────────────────────
  const classifyCode = async (input: string) => {
    if (!input.trim()) {
      addLog("⚠️ No code content to classify");
      return;
    }
    setLoading(true);
    addLog("🧠 Classifier agent starting...");
    try {
      const data: ClassificationResponse = await apiCall(
        `${BACKEND_URL}/api/classify`,
        { method: "POST", body: JSON.stringify({ code: input }) }
      );
      if (data.error) throw new Error(data.error);
      setClassificationResult(data.classification);
      addLog("✅ Classification completed successfully");
      if (step === 0) setStep(1);
    } catch (error) {
      addLog(`❌ Classification failed: ${(error as Error).message}`);
      setClassificationResult("");
    } finally {
      setLoading(false);
    }
  };

  const handleManualClassify = () => {
    if (loading) {
      addLog("⚠️ Classification already in progress");
      return;
    }
    if (!code.trim()) {
      addLog("⚠️ No code loaded. Please select or upload a file first");
      return;
    }
    classifyCode(code);
  };

  // ─── File Upload ─────────────────────────────────────────────────────────────
  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (loading) return;
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

      const resp = await fetch(`${BACKEND_URL}/api/files/upload`, {
        method: "POST",
        body: formData,
      });
      if (!resp.ok) throw new Error(`Server upload failed: ${resp.status}`);

      const data: FileUploadResponse = await resp.json();
      if (data.error) throw new Error(`Server error: ${data.error}`);

      addSidebarMessage(`✅ File uploaded successfully: ${data.saved_files.join(", ")}`);
      // auto-classify removed
    } catch (error) {
      addLogMessage(`❌ File processing failed: ${(error as Error).message}`);
      setCode("");
      setSelectedFile("");
    } finally {
      setUploadKey(Date.now());
    }
  };

  // ─── Select Existing ─────────────────────────────────────────────────────────
const fetchFolders = async () => {
  try {
    addLogMessage("📂 Fetching available folders...");
    const data: FileListResponse = await apiCall(`${BACKEND_URL}/api/files/list`);
    if (data.error) throw new Error(data.error);

    // API already includes "__ROOT__"
    // just filter out the cloned repo, and dedupe in case
    const unique = Array.from(
      new Set(
        data.folders!
          .filter(folder => folder !== gitRepoName)
      )
    );

    setFolderList(unique);
    addLogMessage(`📂 Found ${unique.length} folders`);
  } catch (error) {
    addLogMessage(`❌ ${(error as Error).message}`);
  }
};

  const fetchFilesInFolder = async (folder: string) => {
    try {
      addLogMessage(`📄 Fetching files in folder: ${folder}`);
      const data: FileListResponse = await apiCall(
        `${BACKEND_URL}/api/files/${encodeURIComponent(folder)}/list`
      );
      if (data.error) throw new Error(data.error);
      setFileList(data.files || []);
      addLogMessage(`📄 Found ${data.files?.length || 0} files`);
    } catch (error) {
      addLogMessage(`❌ ${(error as Error).message}`);
    }
  };

  const fetchFileContent = async (folder: string, file: string) => {
    if (loading) return;

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
      addLogMessage(`✅ File loaded: ${text.length} characters`);
    } catch (error) {
      addLogMessage(`❌ ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  // ─── Git Clone ───────────────────────────────────────────────────────────────
  const handleCloneRepo = async (e: FormEvent) => {
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
  };

  // ─── UPDATED: fetchGitFolders via /api/files/tree ───────────────────────────
  const fetchGitFolders = async (repo: string) => {
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
  };

  // ─── UPDATED: fetchGitFiles via /api/files/tree ─────────────────────────────
  const fetchGitFiles = async (repo: string, folder: string) => {
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
  };

  const fetchGitFileContent = async (repo: string, folder: string, file: string) => {
    if (loading) return;

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
  };

  // ─── Render guards ─────────────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[--background] text-[--foreground] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-[--background] text-[--foreground] flex items-center justify-center">
        <div className="text-center">
          <p className="mb-4">🔒 Please log in to access this page</p>
          <p className="text-sm text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // ─── Main Render ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[--background] text-[--foreground] p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🚀 Try This Workflow</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            Welcome, {session?.user?.name || session?.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors"
          >
            🔒 Sign out
          </button>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex space-x-4 mb-6 overflow-x-auto">
        {steps.map((label, idx) => (
          <div
            key={idx}
            className={`px-4 py-2 rounded-lg border text-sm font-medium whitespace-nowrap transition-colors ${
              idx === step
                ? "bg-blue-600 text-white border-blue-600"
                : idx < step
                ? "bg-green-100 text-green-700 border-green-300"
                : "bg-gray-100 text-gray-400 border-gray-300"
            }`}
          >
            {idx + 1}. {label}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        {/* Sidebar */}
        <aside className="w-64 bg-white dark:bg-neutral-900 p-4 rounded shadow h-fit">
          <h3 className="font-semibold mb-3 text-sm">Select Source</h3>

          {/* Source Type */}
          <div className="flex flex-col gap-2 mb-4">
            {[
              { key: "upload", label: "Upload File", icon: "📁" },
              { key: "existing", label: "Select Existing", icon: "📂" },
              { key: "git", label: "Clone from Git", icon: "🔗" },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                disabled={loading}
                className={`px-3 py-2 text-sm rounded font-medium transition-colors disabled:opacity-50 ${
                  sourceType === key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 dark:bg-neutral-800 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-neutral-700"
                }`}
                onClick={() => setSourceType(key)}
              >
                {icon} {label}
              </button>
            ))}
          </div>

          {/* Upload Section */}
          {sourceType === "upload" && (
            <label className="block bg-blue-600 hover:bg-blue-700 text-white text-sm text-center py-2 rounded cursor-pointer transition-colors">
              📁 Choose File
              <input
                key={uploadKey}
                type="file"
                onChange={handleUpload}
                className="hidden"
                disabled={loading}
                accept="*/*"
              />
            </label>
          )}

          {/* Existing Section */}
          {sourceType === "existing" && (
            <>
              <select
                disabled={loading}
                className="w-full p-2 rounded border text-sm mb-2 disabled:opacity-50"
                value={selectedFolder}
                onChange={(e) => {
                  setSelectedFolder(e.target.value);
                  setSelectedFile("");
                  if (e.target.value) fetchFilesInFolder(e.target.value);
                }}
              >
                <option value="">-- Select Folder --</option>
                {folderList.map((f, i) => (
                  <option key={i} value={f}>
                    {f === "__ROOT__" ? "📁 uploads/" : `📁 ${f}`}
                  </option>
                ))}
              </select>
              {selectedFolder && (
                <select
                  disabled={loading}
                  className="w-full p-2 rounded border text-sm disabled:opacity-50"
                  value={selectedFile}
                  onChange={(e) => {
                    if (e.target.value) fetchFileContent(selectedFolder, e.target.value);
                  }}
                >
                  <option value="">-- Select File --</option>
                  {fileList.map((f, i) => (
                    <option key={i} value={f}>
                      📄 {f}
                    </option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* Git Section */}
          {sourceType === "git" && (
            <>
              <form onSubmit={handleCloneRepo} className="space-y-2 mb-3">
                <input
                  type="url"
                  value={gitUrl}
                  onChange={(e) => setGitUrl(e.target.value)}
                  placeholder="https://github.com/user/repo.git"
                  className="w-full p-2 border rounded text-sm"
                  disabled={loading}
                />
                <button
                  disabled={loading || !gitUrl.trim()}
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm transition-colors disabled:opacity-50"
                >
                  {loading ? "⏳ Cloning..." : "🔗 Clone Repository"}
                </button>
              </form>

              {gitRepoName && (
                <>
                  <select
                    disabled={loading}
                    className="w-full p-2 rounded border text-sm mb-2 disabled:opacity-50"
                    value={selectedGitFolder}
                    onChange={(e) => {
                      setSelectedGitFolder(e.target.value);
                      setSelectedGitFile("");
                      if (e.target.value) fetchGitFiles(gitRepoName, e.target.value);
                    }}
                  >
                    <option value="">-- Select Folder --</option>
                    {gitFolderList.map((f, i) => (
                      <option key={i} value={f}>
                        📁 {f}
                      </option>
                    ))}
                  </select>

                  {selectedGitFolder && (
                    <select
                      disabled={loading}
                      className="w-full p-2 rounded border text-sm disabled:opacity-50"
                      value={selectedGitFile}
                      onChange={(e) => {
                        if (e.target.value)
                          fetchGitFileContent(gitRepoName, selectedGitFolder, e.target.value);
                      }}
                    >
                      <option value="">-- Select File --</option>
                      {gitFileList.map((f, i) => (
                        <option key={i} value={f}>
                          📄 {f}
                        </option>
                      ))}
                    </select>
                  )}
                </>
              )}
            </>
          )}

          {/* Manual Classification Button */}
          <button
            onClick={handleManualClassify}
            disabled={loading || !code.trim()}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded text-sm transition-colors disabled:opacity-50"
          >
            {loading ? "⏳ Classifying..." : "🔍 Classify Code"}
          </button>

          {/* Status Display */}
          {code && (
            <div className="mt-3 p-2 bg-gray-100 dark:bg-neutral-800 rounded text-xs">
              <div>📄 File: {selectedFile || selectedGitFile || "Uploaded"}</div>
              <div>📊 Size: {code.length} characters</div>
              <div>🏷️ Lines: {code.split("\n").length}</div>
            </div>
          )}
        </aside>

        {/* Main Content */}
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 h-[75vh]">
          {/* Classification Result Panel */}
          <div className="bg-white dark:bg-neutral-900 p-4 rounded shadow overflow-auto">
            <h2 className="text-lg font-semibold mb-1">🧾 Classification Result</h2>
            <p className="text-sm text-gray-500 mb-2">
              <strong>File:</strong> {selectedFile || selectedGitFile || "No file selected"}
            </p>

            {loading && step === 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-500">Analyzing code...</span>
              </div>
            )}

            <div className="bg-gray-50 dark:bg-neutral-800 p-3 rounded">
              <pre className="whitespace-pre-wrap text-sm text-gray-800 dark:text-gray-200">
                {classificationResult ||
                  (code
                    ? "Click 'Classify Code' to analyze the selected file."
                    : "← Upload or select a file to classify.")}
              </pre>
            </div>
          </div>

          {/* Agent Log Panel */}
          <div className="bg-white dark:bg-neutral-900 p-4 rounded shadow overflow-auto">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-semibold">📟 Agent Log</h2>
              <button
                onClick={() => setLogMessages([])}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
              >
                Clear
              </button>
            </div>
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-300 font-mono max-h-96 overflow-y-auto">
              {logMessages.length === 0 ? (
                <div className="text-gray-400 italic">No log messages yet...</div>
              ) : (
                logMessages.map((log, i) => (
                  <div key={i} className="break-words">
                    • {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Sidebar Messages */}
      {sidebarMessages.length > 0 && (
        <div className="mt-4 bg-blue-50 dark:bg-blue-950 p-3 rounded">
          <h4 className="font-medium text-sm mb-2">📢 System Messages</h4>
          <div className="text-sm space-y-1">
            {sidebarMessages.map((msg, i) => (
              <div key={i}>• {msg}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
