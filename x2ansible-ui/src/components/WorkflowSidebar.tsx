// src/components/WorkflowSidebar.tsx
"use client";

import { ChangeEvent, FormEvent } from "react";
import SourceSelector from "./SourceSelector";

interface WorkflowSidebarProps {
  currentStep: number;
  
  // Step 0 (Classify) - Source Selection Props
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
  
  // Step-specific configs
  contextConfig?: any;
  setContextConfig?: (config: any) => void;
  conversionConfig?: any;
  setConversionConfig?: (config: any) => void;
  validationConfig?: any;
  setValidationConfig?: (config: any) => void;
  deploymentConfig?: any;
  setDeploymentConfig?: (config: any) => void;
}

export default function WorkflowSidebar(props: WorkflowSidebarProps) {
  const { currentStep } = props;

  // FIXED: Consistent wrapper with fixed width and scrollbar
  const SidebarWrapper = ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div className="w-80 bg-gray-900 dark:bg-gray-950 text-white rounded-lg border border-gray-700 dark:border-gray-600 flex flex-col h-[75vh]">
      {/* Fixed Header */}
      <div className="px-4 py-3 border-b border-gray-700 bg-gray-800 rounded-t-lg flex-shrink-0">
        <h3 className="font-semibold text-sm text-gray-200">{title}</h3>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-auto rh-scrollbar">
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );

  // Step 0: Source Selection (existing SourceSelector but wrapped)
  if (currentStep === 0) {
    return (
      <div className="w-80">
        <SourceSelector
          sourceType={props.sourceType}
          setSourceType={props.setSourceType}
          loading={props.loading}
          uploadKey={props.uploadKey}
          handleUpload={props.handleUpload}
          folderList={props.folderList}
          selectedFolder={props.selectedFolder}
          setSelectedFolder={props.setSelectedFolder}
          selectedFile={props.selectedFile}
          fileList={props.fileList}
          fetchFilesInFolder={props.fetchFilesInFolder}
          fetchFileContent={props.fetchFileContent}
          gitUrl={props.gitUrl}
          setGitUrl={props.setGitUrl}
          handleCloneRepo={props.handleCloneRepo}
          gitRepoName={props.gitRepoName}
          gitFolderList={props.gitFolderList}
          selectedGitFolder={props.selectedGitFolder}
          setSelectedGitFolder={props.setSelectedGitFolder}
          gitFileList={props.gitFileList}
          selectedGitFile={props.selectedGitFile}
          fetchGitFiles={props.fetchGitFiles}
          fetchGitFileContent={props.fetchGitFileContent}
          handleManualClassify={props.handleManualClassify}
          code={props.code}
        />
      </div>
    );
  }

  // Step 1: Context Analysis Configuration
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
                checked={props.contextConfig?.analyzeDependencies || true}
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

  // Step 2: Conversion Configuration
  if (currentStep === 2) {
    return (
      <SidebarWrapper title="⚙️ Conversion Options">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Target Format</label>
            <select 
              value={props.conversionConfig?.targetFormat || 'ansible'}
              onChange={(e) => props.setConversionConfig?.({
                ...props.conversionConfig,
                targetFormat: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="ansible">Ansible Playbook</option>
              <option value="terraform">Terraform</option>
              <option value="docker">Docker Compose</option>
              <option value="kubernetes">Kubernetes YAML</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Output Style</label>
            <select 
              value={props.conversionConfig?.outputStyle || 'detailed'}
              onChange={(e) => props.setConversionConfig?.({
                ...props.conversionConfig,
                outputStyle: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="minimal">Minimal</option>
              <option value="detailed">Detailed (Recommended)</option>
              <option value="enterprise">Enterprise Grade</option>
            </select>
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input 
                type="checkbox" 
                checked={props.conversionConfig?.includeComments || true}
                onChange={(e) => props.setConversionConfig?.({
                  ...props.conversionConfig,
                  includeComments: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Include explanatory comments
            </label>
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input 
                type="checkbox" 
                checked={props.conversionConfig?.validateSyntax || true}
                onChange={(e) => props.setConversionConfig?.({
                  ...props.conversionConfig,
                  validateSyntax: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Validate syntax during conversion
            </label>
          </div>

          <div className="pt-2">
            <div className="p-3 bg-gray-800 rounded text-xs border border-gray-700">
              <div className="text-gray-300">🔄 Convert your code to the selected target format with enterprise-grade quality and validation.</div>
            </div>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  // Step 3: Validation Configuration
  if (currentStep === 3) {
    return (
      <SidebarWrapper title="✅ Validation Settings">
        <div className="space-y-4">
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input 
                type="checkbox" 
                checked={props.validationConfig?.checkSyntax || true}
                onChange={(e) => props.setValidationConfig?.({
                  ...props.validationConfig,
                  checkSyntax: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Syntax validation
            </label>
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input 
                type="checkbox" 
                checked={props.validationConfig?.securityScan || true}
                onChange={(e) => props.setValidationConfig?.({
                  ...props.validationConfig,
                  securityScan: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Security vulnerability scan
            </label>
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input 
                type="checkbox" 
                checked={props.validationConfig?.performanceCheck || false}
                onChange={(e) => props.setValidationConfig?.({
                  ...props.validationConfig,
                  performanceCheck: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Performance analysis
            </label>
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input 
                type="checkbox" 
                checked={props.validationConfig?.bestPractices || true}
                onChange={(e) => props.setValidationConfig?.({
                  ...props.validationConfig,
                  bestPractices: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Best practices validation
            </label>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Custom Rules</label>
            <textarea 
              value={props.validationConfig?.customRules?.join('\n') || ''}
              onChange={(e) => props.setValidationConfig?.({
                ...props.validationConfig,
                customRules: e.target.value.split('\n').filter(rule => rule.trim())
              })}
              placeholder="Enter custom validation rules (one per line)"
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 h-16 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>

          <div className="pt-2">
            <div className="p-3 bg-gray-800 rounded text-xs border border-gray-700">
              <div className="text-gray-300">🔍 Comprehensive validation ensures code quality, security, and compliance with best practices.</div>
            </div>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  // Step 4: Deployment Configuration
  if (currentStep === 4) {
    return (
      <SidebarWrapper title="🚀 Deployment Settings">
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Target Environment</label>
            <select 
              value={props.deploymentConfig?.environment || 'development'}
              onChange={(e) => props.setDeploymentConfig?.({
                ...props.deploymentConfig,
                environment: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="development">Development</option>
              <option value="staging">Staging</option>
              <option value="production">Production</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Target Hosts</label>
            <textarea 
              value={props.deploymentConfig?.targetHosts?.join('\n') || ''}
              onChange={(e) => props.setDeploymentConfig?.({
                ...props.deploymentConfig,
                targetHosts: e.target.value.split('\n').filter(host => host.trim())
              })}
              placeholder="server1.example.com&#10;server2.example.com"
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 h-16 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">Rollback Strategy</label>
            <select 
              value={props.deploymentConfig?.rollbackStrategy || 'gradual'}
              onChange={(e) => props.setDeploymentConfig?.({
                ...props.deploymentConfig,
                rollbackStrategy: e.target.value
              })}
              className="w-full p-2 rounded border border-gray-600 text-sm bg-gray-800 text-gray-200 focus:border-red-500 focus:ring-1 focus:ring-red-500"
            >
              <option value="immediate">Immediate Rollback</option>
              <option value="gradual">Gradual Rollback</option>
              <option value="none">No Automatic Rollback</option>
            </select>
          </div>
          
          <div>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input 
                type="checkbox" 
                checked={props.deploymentConfig?.notifications || true}
                onChange={(e) => props.setDeploymentConfig?.({
                  ...props.deploymentConfig,
                  notifications: e.target.checked
                })}
                className="rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              />
              Send deployment notifications
            </label>
          </div>

          <div className="pt-2">
            <div className="p-3 bg-gray-800 rounded text-xs border border-gray-700">
              <div className="text-gray-300">📡 Deploy your converted code to target environments with automated rollback and monitoring.</div>
            </div>
          </div>
        </div>
      </SidebarWrapper>
    );
  }

  return null;
}