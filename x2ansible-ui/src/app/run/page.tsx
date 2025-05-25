"use client";

import { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

const steps = ["Classify", "Context", "Convert", "Validate", "Deploy"];

export default function RunWorkflowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [code, setCode] = useState<string>("");
  const [classification, setClassification] = useState<string>("");
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [sidebarMessages, setSidebarMessages] = useState<string[]>([]);
  const [uploadKey, setUploadKey] = useState(Date.now());

  const [sourceType, setSourceType] = useState<string>("upload");
  const [gitUrl, setGitUrl] = useState<string>("");

  const [treePath, setTreePath] = useState<string>("");
  const [treeItems, setTreeItems] = useState<{ type: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<string>("");

  const [showRedirectNotice, setShowRedirectNotice] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      setShowRedirectNotice(true);
      setTimeout(() => router.replace("/"), 2000);
    }
  }, [status, router]);

  useEffect(() => {
    if (sourceType === "browse") fetchTree("");
  }, [sourceType]);

  const fetchTree = async (subPath: string) => {
    const res = await fetch(`http://localhost:8000/api/files/tree?path=${subPath}`);
    const data = await res.json();
    setTreePath(subPath);
    setTreeItems(data.items || []);
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const formData = new FormData();
    for (const file of files) formData.append("files", file);

    const res = await fetch("http://localhost:8000/api/files/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    setSidebarMessages(prev => [...prev, `Uploaded: ${data.saved_files.join(", ")}`]);

    const reader = new FileReader();
    reader.onload = () => setCode(reader.result as string);
    reader.readAsText(files[0]);

    // Refresh file input
    setUploadKey(Date.now());
  };

  const handleCloneRepo = async (e: FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("url", gitUrl);

    const res = await fetch("http://localhost:8000/api/files/clone", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.cloned) {
      setSidebarMessages(prev => [...prev, `Cloned repo: ${data.cloned}`]);
      fetchTree(data.cloned); // go into repo
    } else {
      setSidebarMessages(prev => [...prev, `Clone failed: ${data.error || "unknown error"}`]);
    }
  };

  const handleClassify = async () => {
    setLogMessages(["🧠 Classifier agent running..."]);
    try {
      const response = await fetch("http://localhost:8000/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();
      setClassification(data.classification);
      setLogMessages(prev => [...prev, "✅ Classification complete."]);
    } catch {
      setLogMessages(prev => [...prev, "❌ Error contacting classifier endpoint."]);
    }
  };

  const loadFile = async (filePath: string) => {
    fetch(`uploads/${filePath}`)
      .then(res => res.text())
      .then(setCode)
      .catch(() => setCode(""));
  };

  const handlePathClick = (sub: string) => {
    const newPath = treePath ? `${treePath}/${sub}` : sub;
    fetchTree(newPath);
  };

  if (status === "loading") return <div className="p-8">Checking session...</div>;

  if (showRedirectNotice) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white text-center">
        <div className="p-6 text-lg bg-red-700 rounded shadow">
          🔒 You must be signed in to access this page.<br />
          Redirecting...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--background] text-[--foreground] p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🚀 Try This Workflow</h1>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="bg-red-600 text-white px-4 py-2 rounded">
          🔒 Sign out
        </button>
      </div>

      <div className="flex space-x-4 mb-6">
        {steps.map((label, idx) => (
          <div key={idx} className={`px-4 py-2 rounded-lg border text-sm font-medium transition ${
            idx === step ? "bg-blue-600 text-white" :
            idx < step ? "bg-green-100 text-green-700 border-green-300" : "bg-gray-100 text-gray-400 border-gray-200"
          }`}>
            {label}
          </div>
        ))}
      </div>

      <div className="flex gap-4">
        <aside className="w-1/4 bg-white dark:bg-neutral-900 p-4 rounded shadow h-fit">
          <h3 className="font-semibold mb-2">Source</h3>

          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="w-full p-2 rounded border mb-4"
          >
            <option value="upload">Upload File</option>
            <option value="browse">Browse Existing</option>
            <option value="git">Clone from Git</option>
          </select>

          {sourceType === "upload" && (
            <input key={uploadKey} type="file" onChange={handleUpload} className="mb-2" />
          )}

          {sourceType === "browse" && (
            <>
              <div className="space-y-1 mb-2">
                {treeItems.map((item, i) =>
                  item.type === "folder" ? (
                    <div key={i} className="cursor-pointer text-blue-500 hover:underline" onClick={() => handlePathClick(item.name)}>
                      📁 {item.name}
                    </div>
                  ) : (
                    <div key={i} className="cursor-pointer text-gray-700 hover:underline" onClick={() => {
                      setSelectedFile(treePath ? `${treePath}/${item.name}` : item.name);
                      loadFile(treePath ? `${treePath}/${item.name}` : item.name);
                    }}>
                      📄 {item.name}
                    </div>
                  )
                )}
              </div>
              {treePath && (
                <div className="text-xs text-gray-400 mb-2">Path: {treePath}</div>
              )}
            </>
          )}

          {sourceType === "git" && (
            <form onSubmit={handleCloneRepo} className="flex flex-col gap-2">
              <input
                type="text"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="p-2 border rounded"
              />
              <button type="submit" className="bg-blue-600 text-white px-4 py-1 rounded">
                Clone
              </button>
            </form>
          )}

          {sidebarMessages.length > 0 && (
            <div className="mt-4 text-sm text-gray-600 dark:text-gray-300 space-y-1">
              {sidebarMessages.map((msg, i) => <div key={i}>• {msg}</div>)}
            </div>
          )}
        </aside>

        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-neutral-900 p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-2">{`Step ${step + 1}: ${steps[step]}`}</h2>

            <textarea
              className="w-full h-48 p-2 border border-gray-300 rounded bg-gray-50 dark:bg-neutral-800 dark:text-white mb-4"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Paste or load your code here..."
            />
            <button onClick={handleClassify} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              🔍 Classify Code
            </button>

            {classification && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg mb-2 text-blue-700 dark:text-blue-400">🧾 Classification Summary</h3>
                <div className="bg-gray-50 dark:bg-neutral-800 text-sm text-gray-800 dark:text-gray-100 p-4 rounded whitespace-pre-wrap border border-gray-300 dark:border-neutral-700 max-h-64 overflow-auto">
                  {classification}
                </div>
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-neutral-900 p-4 rounded shadow overflow-y-auto max-h-96">
            <h2 className="text-lg font-semibold mb-2">📟 Agent Log</h2>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300 font-mono">
              {logMessages.map((log, i) => <div key={i}>• {log}</div>)}
            </div>
          </div>
        </main>
      </div>

      <div className="mt-10 text-right">
        {step < steps.length - 1 ? (
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            onClick={() => {
              setStep(step + 1);
              setLogMessages([]);
            }}
          >
            Next Step →
          </button>
        ) : (
          <div className="text-green-600 font-semibold">✅ All steps complete!</div>
        )}
      </div>
    </div>
  );
}
