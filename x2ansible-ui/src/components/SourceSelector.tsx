// src/components/SourceSelector.tsx
"use client";

import { ChangeEvent, FormEvent } from "react";

interface SourceSelectorProps {
  sourceType: "upload" | "existing" | "git";
  setSourceType: (type: "upload" | "existing" | "git") => void;
  loading: boolean;
  uploadKey: number;
  handleUpload: (e: ChangeEvent<HTMLInputElement>) => void;
  
  // Existing file props
  folderList: string[];
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  selectedFile: string;
  fileList: string[];
  fetchFilesInFolder: (folder: string) => void;
  fetchFileContent: (folder: string, file: string) => void;
  
  // Git props
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
  
  // Actions
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
    <div className="bg-gray-900 dark:bg-gray-950 text-white p-4 rounded-lg border border-gray-700 dark:border-gray-600 h-fit">
      <h3 className="font-semibold mb-4 text-sm text-gray-200">Select Source</h3>

      {/* Source Type Buttons */}
      <div className="flex flex-col gap-2 mb-4">
        {[
          { key: "upload", label: "Upload File", icon: "📁" },
          { key: "existing", label: "Select Existing", icon: "📂" },
          { key: "git", label: "Clone from Git", icon: "🔗" },
        ].map(({ key, label, icon }) => (
          <button
            key={key}
            disabled={loading}
            className={`px-3 py-2 text-sm rounded font-medium transition-colors disabled:opacity-50 text-left ${
              sourceType === key
                ? "bg-red-600 text-white"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-600"
            }`}
            onClick={() => setSourceType(key as "upload" | "existing" | "git")}
          >
            {icon} {label}
          </button>
        ))}
      </div>

      {/* Upload Section */}
      {sourceType === "upload" && (
        <label className="block bg-red-600 hover:bg-red-700 text-white text-sm text-center py-2 rounded cursor-pointer transition-colors">
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
            className="w-full p-2 rounded border border-gray-600 text-sm mb-2 disabled:opacity-50 bg-gray-800 text-gray-200 rh-select"
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
              className="w-full p-2 rounded border border-gray-600 text-sm disabled:opacity-50 bg-gray-800 text-gray-200 rh-select"
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
              className="w-full p-2 border border-gray-600 rounded text-sm bg-gray-800 text-gray-200 rh-input"
              disabled={loading}
            />
            <button
              disabled={loading || !gitUrl.trim()}
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm transition-colors disabled:opacity-50 rh-btn-primary"
            >
              {loading ? "⏳ Cloning..." : "🔗 Clone Repository"}
            </button>
          </form>

          {gitRepoName && (
            <>
              <select
                disabled={loading}
                className="w-full p-2 rounded border border-gray-600 text-sm mb-2 disabled:opacity-50 bg-gray-800 text-gray-200 rh-select"
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
                  className="w-full p-2 rounded border border-gray-600 text-sm disabled:opacity-50 bg-gray-800 text-gray-200 rh-select"
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
        className="mt-4 w-full bg-red-600 hover:bg-red-700 text-white py-2 rounded text-sm transition-colors disabled:opacity-50 rh-btn-primary"
      >
        {loading ? "⏳ Classifying..." : "🔍 Classify Code"}
      </button>

      {/* Status Display */}
      {code && (
        <div className="mt-3 p-3 bg-gray-800 rounded text-xs border border-gray-700">
          <div className="text-gray-300">📄 File: {selectedFile || selectedGitFile || "Uploaded"}</div>
          <div className="text-gray-300">📊 Size: {code.length.toLocaleString()} characters</div>
          <div className="text-gray-300">🏷️ Lines: {code.split("\n").length.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}