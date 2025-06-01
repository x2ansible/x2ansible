"use client";

import { ChangeEvent, FormEvent } from "react";
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  FolderOpenIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";

interface SourceSelectorProps {
  sourceType: "upload" | "existing" | "git";
  setSourceType: (type: "upload" | "existing" | "git") => void;
  loading: boolean;
  uploadKey: number;
  handleUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  folderList: string[];
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  selectedFile: string;
  fileList: string[];
  fetchFilesInFolder: (folder: string) => void;
  fetchFileContent: (folder: string, file: string) => void;
  gitUrl: string;
  setGitUrl: (url: string) => void;
  handleCloneRepo: (e: FormEvent) => void;
  gitRepoName: string;
  gitFolderList: string[];
  selectedGitFolder: string;
  setSelectedGitFolder: (folder: string) => void;
  gitFileList: string[];
  selectedGitFile: string;
  fetchGitFiles: (repo: string, folder: string) => void;
  fetchGitFileContent: (repo: string, folder: string, file: string) => void;
  handleManualClassify: () => void;
  code: string;
}

export default function SourceSelector({
  sourceType,
  setSourceType,
  loading,
  uploadKey,
  handleUpload,
  folderList,
  selectedFolder,
  setSelectedFolder,
  selectedFile,
  fileList,
  fetchFilesInFolder,
  fetchFileContent,
  gitUrl,
  setGitUrl,
  handleCloneRepo,
  gitRepoName,
  gitFolderList,
  selectedGitFolder,
  setSelectedGitFolder,
  gitFileList,
  selectedGitFile,
  fetchGitFiles,
  fetchGitFileContent,
  handleManualClassify,
  code,
}: SourceSelectorProps) {
  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-600/30 flex flex-col">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">

        {/* Header */}
        <div className="flex items-center space-x-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
            <DocumentTextIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-white">Source Selection</h3>
            <p className="text-xs text-slate-400">Choose and load your code</p>
          </div>
        </div>

        {/* Source Type Selection */}
        <div className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 rounded-xl border border-slate-600/30 p-4 mb-1 shadow">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpenIcon className="w-5 h-5 text-slate-400" />
            <h4 className="font-semibold text-slate-200 text-sm">File Source</h4>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { key: "upload", label: "Upload File", icon: "📁" },
              { key: "existing", label: "Select Existing", icon: "📂" },
              { key: "git", label: "Clone from Git", icon: "🔗" },
            ].map(({ key, label, icon }) => (
              <button
                key={key}
                disabled={loading}
                className={`px-3 py-2 text-sm rounded-lg font-medium border transition-colors disabled:opacity-50 text-left flex items-center gap-2 ${
                  sourceType === key
                    ? "bg-blue-600/90 text-white border-blue-500 shadow"
                    : "bg-slate-800/70 text-slate-300 hover:bg-slate-700 border-slate-700"
                }`}
                onClick={() => setSourceType(key as "upload" | "existing" | "git")}
              >
                <span>{icon}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Section */}
        {sourceType === "upload" && (
          <label className="block bg-blue-600 hover:bg-blue-700 text-white text-sm text-center py-2 rounded cursor-pointer transition-colors mt-2 shadow-md">
            <CloudArrowUpIcon className="inline w-4 h-4 mr-1 -mt-0.5" /> Choose File
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
          <div className="mt-2 space-y-2">
            <select
              disabled={loading}
              className="w-full p-2 rounded-lg border border-slate-700 text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
              value={selectedFolder}
              onChange={(e) => {
                setSelectedFolder(e.target.value);
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
                className="w-full p-2 rounded-lg border border-slate-700 text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
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
          </div>
        )}

        {/* Git Section */}
        {sourceType === "git" && (
          <div className="mt-2 space-y-2">
            <form onSubmit={handleCloneRepo} className="space-y-2 mb-3">
              <input
                type="url"
                value={gitUrl}
                onChange={(e) => setGitUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full p-2 border border-slate-700 rounded-lg text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
                disabled={loading}
              />
              <button
                disabled={loading || !gitUrl.trim()}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm transition-colors disabled:opacity-50 shadow-md"
              >
                {loading ? "⏳ Cloning..." : "🔗 Clone Repository"}
              </button>
            </form>
            {gitRepoName && (
              <>
                <select
                  disabled={loading}
                  className="w-full p-2 rounded-lg border border-slate-700 text-sm bg-slate-800 text-slate-200 disabled:opacity-50 mb-2"
                  value={selectedGitFolder}
                  onChange={(e) => {
                    setSelectedGitFolder(e.target.value);
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
                    className="w-full p-2 rounded-lg border border-slate-700 text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
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
          </div>
        )}

        {/* Status Display */}
        {code && (
          <div className="mt-3 p-3 bg-slate-800 rounded-xl text-xs border border-slate-700">
            <div className="text-slate-300">📄 File: {selectedFile || selectedGitFile || "Uploaded"}</div>
            <div className="text-slate-300">📊 Size: {code.length.toLocaleString()} characters</div>
            <div className="text-slate-300">🏷️ Lines: {code.split("\n").length.toLocaleString()}</div>
          </div>
        )}
      </div>
      {/* ANALYZE BUTTON - absolutely no background! */}
      <div className="p-6 border-t border-slate-700/40 flex items-center justify-center" style={{ background: "transparent" }}>
        <button
          onClick={handleManualClassify}
          disabled={loading || !code.trim()}
          className={`
            w-full flex items-center justify-center gap-2
            px-4 py-2
            rounded-full
            font-semibold
            text-base
            bg-gradient-to-r from-blue-500 to-cyan-500
            hover:from-blue-600 hover:to-cyan-600
            focus:outline-none focus:ring-2 focus:ring-blue-300
            transition-all duration-200
            text-white
            disabled:opacity-50 disabled:cursor-not-allowed
            shadow
            ${!loading && code.trim() ? "animate-pulse-glow" : ""}
          `}
          style={{ minHeight: "38px", maxWidth: "220px" }}
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              <span>Analyzing...</span>
            </>
          ) : (
            <>
              <MagnifyingGlassIcon className="w-5 h-5" />
              <span>Analyze Code</span>
            </>
          )}
        </button>
        <style jsx global>{`
          @keyframes pulseGlow {
            0%, 100% { box-shadow: 0 0 0 0 #38bdf880; }
            50% { box-shadow: 0 0 8px 2px #38bdf860; }
          }
          .animate-pulse-glow {
            animation: pulseGlow 1.8s infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
