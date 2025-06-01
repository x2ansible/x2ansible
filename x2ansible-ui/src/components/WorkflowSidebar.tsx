"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import FileTreeSelector, { TreeNode } from "./FileTreeSelector";
import SelectedFilesPanel from "./SelectedFilesPanel";
import SourceSelector from "./SourceSelector";

interface WorkflowSidebarProps {
  currentStep: number;
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
  handleManualClassify: (files?: { path: string; content: string }[]) => void;
  code: string;
  setCode?: (code: string) => void;
  contextConfig?: any;
  setContextConfig?: (config: any) => void;
  conversionConfig?: any;
  setConversionConfig?: (config: any) => void;
  validationConfig?: any;
  setValidationConfig?: (config: any) => void;
  deploymentConfig?: any;
  setDeploymentConfig?: (config: any) => void;
}

// Clean fetchTree function
async function fetchTree(path: string = ""): Promise<TreeNode[]> {
  try {
    const baseUrl = "";

    const url = path
      ? `${baseUrl}/api/files/tree?path=${encodeURIComponent(path)}`
      : `${baseUrl}/api/files/tree`;

    const res = await fetch(url);

    if (!res.ok) {
      console.error(`File tree fetch failed: ${res.status} ${res.statusText}`);
      return [];
    }

    const data = await res.json();
    return data.items || [];
  } catch (e) {
    console.error("File tree fetch exception:", e);
    return [];
  }
}

export default function WorkflowSidebar(props: WorkflowSidebarProps) {
  const { currentStep } = props;

  // Multi-file explorer state
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [analyzing, setAnalyzing] = useState(false);

  // Handle multi-file analyze
  async function handleAnalyzeFiles(selectedFiles: string[]) {
    if (selectedFiles.length === 0) {
      alert("Please select at least one file first!");
      return;
    }

    setAnalyzing(true);

    try {
      const baseUrl = "";

      const response = await fetch(`${baseUrl}/api/files/get_many`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(selectedFiles),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (data.files && Array.isArray(data.files) && data.files.length > 0) {
        // TypeScript fix: type parameter for .map
        const fileList = data.files.map((f: { path: string }) => f.path).join(", ");
        const combinedContent = `# Combined Analysis of ${data.files.length} files: ${fileList}

${data.files
  .map((file: { path: string; content: string }) => `
# ========================================
# File: ${file.path}
# ========================================
${file.content}`)
  .join('\n\n')}`;

        if (props.setCode) {
          props.setCode(combinedContent);
        }
        props.handleManualClassify(data.files);
      } else {
        throw new Error("No files received from server or invalid format");
      }
    } catch (error: any) {
      console.error("Analysis failed:", error);
      alert(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  }

  // Wrapper for steps 1-4
  const SidebarWrapper = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div className="w-80 bg-gray-900 dark:bg-gray-950 text-white rounded-lg border border-gray-700 dark:border-gray-600 flex flex-col h-[75vh]">
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800 rounded-t-lg flex-shrink-0">
        <h3 className="font-semibold text-sm text-gray-200">{title}</h3>
      </div>
      <div className="flex-1 overflow-auto rh-scrollbar">
        <div className="p-4">{children}</div>
      </div>
    </div>
  );

  // Step 0: Source Selection
  if (currentStep === 0) {
    return (
      <div className="w-80">
        {/* Source Type Buttons */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 p-3 flex gap-2">
          {[
            { key: "upload", label: "Upload File", icon: "📁" },
            { key: "existing", label: "Select Existing", icon: "📂" },
            { key: "git", label: "Clone from Git", icon: "🔗" },
          ].map(({ key, label, icon }) => (
            <button
              key={key}
              disabled={props.loading}
              className={`px-3 py-2 text-sm rounded-lg font-medium border transition-colors disabled:opacity-50 text-left flex items-center gap-2 ${
                props.sourceType === key
                  ? "bg-blue-600/90 text-white border-blue-500 shadow"
                  : "bg-slate-800/70 text-slate-300 hover:bg-slate-700 border-slate-700"
              }`}
              onClick={() => props.setSourceType(key as "upload" | "existing" | "git")}
            >
              <span>{icon}</span> {label}
            </button>
          ))}
        </div>

        {/* Upload Option */}
        {props.sourceType === "upload" && (
          <div className="p-4">
            <label className="block bg-blue-600 hover:bg-blue-700 text-white text-sm text-center py-2 rounded cursor-pointer transition-colors mt-2 shadow-md">
              Upload File
              <input
                key={props.uploadKey}
                type="file"
                onChange={props.handleUpload}
                className="hidden"
                disabled={props.loading}
                accept="*/*"
              />
            </label>
            {props.code && (
              <button
                onClick={() => props.handleManualClassify()}
                disabled={props.loading || !props.code.trim()}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold text-base bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow"
              >
                {props.loading ? (
                  <>
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <MagnifyingGlassIcon className="w-5 h-5" />
                    <span>Analyze Uploaded File</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {/* Existing Files Option */}
        {props.sourceType === "existing" && (
          <div className="p-4">
            <FileTreeSelector
              fetchTree={fetchTree}
              selectedFiles={selectedFiles}
              setSelectedFiles={setSelectedFiles}
            />
            {/* Analyze Selected Files Button */}
            <button
              onClick={() => handleAnalyzeFiles(selectedFiles)}
              disabled={selectedFiles.length === 0 || analyzing}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 rounded-full font-semibold text-base bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {analyzing ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <MagnifyingGlassIcon className="w-5 h-5" />
                  <span>Analyze {selectedFiles.length} Files</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Git Option */}
        {props.sourceType === "git" && (
          <div className="p-4">
            <form onSubmit={props.handleCloneRepo} className="space-y-2 mb-3">
              <input
                type="url"
                value={props.gitUrl}
                onChange={(e) => props.setGitUrl(e.target.value)}
                placeholder="https://github.com/user/repo.git"
                className="w-full p-2 border border-slate-700 rounded-lg text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
                disabled={props.loading}
              />
              <button
                disabled={props.loading || !props.gitUrl.trim()}
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm transition-colors disabled:opacity-50 shadow-md"
              >
                {props.loading ? "⏳ Cloning..." : "🔗 Clone Repository"}
              </button>
            </form>
            {props.gitRepoName && (
              <>
                <select
                  disabled={props.loading}
                  className="w-full p-2 rounded-lg border border-slate-700 text-sm bg-slate-800 text-slate-200 disabled:opacity-50 mb-2"
                  value={props.selectedGitFolder}
                  onChange={(e) => {
                    props.setSelectedGitFolder(e.target.value);
                    if (e.target.value) props.fetchGitFiles(props.gitRepoName, e.target.value);
                  }}
                >
                  <option value="">-- Select Folder --</option>
                  {props.gitFolderList.map((f, i) => (
                    <option key={i} value={f}>📁 {f}</option>
                  ))}
                </select>
                {props.selectedGitFolder && (
                  <select
                    disabled={props.loading}
                    className="w-full p-2 rounded-lg border border-slate-700 text-sm bg-slate-800 text-slate-200 disabled:opacity-50"
                    value={props.selectedGitFile}
                    onChange={(e) => {
                      if (e.target.value)
                        props.fetchGitFileContent(props.gitRepoName, props.selectedGitFolder, e.target.value);
                    }}
                  >
                    <option value="">-- Select File --</option>
                    {props.gitFileList.map((f, i) => (
                      <option key={i} value={f}>📄 {f}</option>
                    ))}
                  </select>
                )}
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // Step 1: Context Configuration
  if (currentStep === 1) {
    return (
      <SidebarWrapper title="📋 Context Configuration">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={props.contextConfig?.includeComments || false}
                onChange={(e) => props.setContextConfig?.({
                  ...props.contextConfig,
                  includeComments: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Include code comments
            </label>
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={props.contextConfig?.analyzeDependencies ?? true}
                onChange={(e) => props.setContextConfig?.({
                  ...props.contextConfig,
                  analyzeDependencies: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Analyze dependencies
            </label>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Environment Type</label>
            <select
              value={props.contextConfig?.environmentType || 'development'}
              onChange={(e) => props.setContextConfig?.({
                ...props.contextConfig,
                environmentType: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-300 mb-2">Scan Depth</label>
            <select
              value={props.contextConfig?.scanDepth || 'medium'}
              onChange={(e) => props.setContextConfig?.({
                ...props.contextConfig,
                scanDepth: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="shallow">Shallow (Fast)</option>
              <option value="medium">Medium (Recommended)</option>
              <option value="deep">Deep (Thorough)</option>
            </select>
          </div>
          <div className="pt-2">
            <div className="p-3 bg-gray-800 rounded text-xs border border-gray-700">
              <div className="text-gray-300">🎯 Context analysis examines code structure, dependencies, and environment requirements for optimal conversion.</div>
            </div>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  // Step 2: Conversion Options
  if (currentStep === 2) {
    return (
      <SidebarWrapper title="⚙️ Conversion Options">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Target Framework</label>
            <select
              value={props.conversionConfig?.targetFramework || 'ansible'}
              onChange={(e) => props.setConversionConfig?.({
                ...props.conversionConfig,
                targetFramework: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="ansible">Ansible</option>
              <option value="terraform">Terraform</option>
              <option value="kubernetes">Kubernetes</option>
            </select>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  // Step 3: Validation Config
  if (currentStep === 3) {
    return (
      <SidebarWrapper title="✅ Validation Settings">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={props.validationConfig?.syntaxCheck ?? true}
                onChange={(e) => props.setValidationConfig?.({
                  ...props.validationConfig,
                  syntaxCheck: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Syntax validation
            </label>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  // Step 4: Deployment Config
  if (currentStep === 4) {
    return (
      <SidebarWrapper title="🚀 Deployment Settings">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Deployment Target</label>
            <select
              value={props.deploymentConfig?.target || 'local'}
              onChange={(e) => props.setDeploymentConfig?.({
                ...props.deploymentConfig,
                target: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="local">Local</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  return null;
}
