"use client";

import { useEffect, useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

import ContextPanel from "@/components/ContextPanel";
import ContextSidebar from "@/components/ContextSidebar";
import WorkflowSidebar from "@/components/WorkflowSidebar";
import ClassificationPanel from "@/components/ClassificationPanel";
import AgentLogPanel from "@/components/AgentLogPanel";
import SystemMessages from "@/components/SystemMessages";
import ThemeToggle from "@/components/ThemeToggle";
import GatedProgressSteps from "@/components/GatedProgressSteps";
import GeneratePanel from "@/components/GeneratePanel";
import GenerateSidebar from "@/components/GenerateSidebar";
import ValidationPanel from "@/components/ValidationPanel";
import ValidationSidebar from "@/components/ValidationSidebar";

import { useFileOperations } from "@/hooks/useFileOperations";
import { useGitOperations } from "@/hooks/useGitOperations";
import { useClassification } from "@/hooks/useClassification";
import { ClassificationResponse } from "@/types/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";
const steps = ["Analyze", "Context", "Convert", "Validate", "Deploy"];

export default function RunWorkflowPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [sourceType, setSourceType] = useState<"upload" | "existing" | "git">("upload");
  const [uploadKey, setUploadKey] = useState(Date.now());
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [sidebarMessages, setSidebarMessages] = useState<string[]>([]);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("");
  const [folderList, setFolderList] = useState<string[]>([]);
  const [fileList, setFileList] = useState<string[]>([]);
  const [gitUrl, setGitUrl] = useState("");
  const [gitRepoName, setGitRepoName] = useState("");
  const [gitFolderList, setGitFolderList] = useState<string[]>([]);
  const [gitFileList, setGitFileList] = useState<string[]>([]);
  const [selectedGitFolder, setSelectedGitFolder] = useState("");
  const [selectedGitFile, setSelectedGitFile] = useState("");
  const [classificationResult, setClassificationResult] = useState<ClassificationResponse | null>(null);

  const [retrievedContext, setRetrievedContext] = useState<string>("");
  const [generatedPlaybook, setGeneratedPlaybook] = useState<string>("");
  const [validationResult, setValidationResult] = useState<any>(null);

  const [contextConfig, setContextConfig] = useState({
    includeComments: false,
    analyzeDependencies: true,
    environmentType: 'development' as 'development' | 'staging' | 'production',
    scanDepth: 'medium' as 'shallow' | 'medium' | 'deep'
  });

  const [conversionConfig, setConversionConfig] = useState({
    targetFormat: 'ansible' as 'ansible' | 'terraform' | 'docker' | 'kubernetes',
    outputStyle: 'detailed' as 'minimal' | 'detailed' | 'enterprise',
    includeComments: true,
    validateSyntax: true,
    useHandlers: false,
    useRoles: false,
    useVars: false
  });
  
  const [validationConfig, setValidationConfig] = useState({
    checkSyntax: true,
    securityScan: true,
    performanceCheck: false,
    bestPractices: true,
    customRules: [] as string[]
  });

  const [deploymentConfig, setDeploymentConfig] = useState({
    environment: 'development' as 'development' | 'staging' | 'production',
    targetHosts: [] as string[],
    rollbackStrategy: 'gradual' as 'immediate' | 'gradual' | 'none',
    notifications: true
  });

  const addLogMessage = (msg: string) =>
    setLogMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const addSidebarMessage = (msg: string) =>
    setSidebarMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const markStepAsCompleted = (stepIndex: number) => {
    if (!completedSteps.includes(stepIndex)) {
      setCompletedSteps(prev => [...prev, stepIndex].sort((a, b) => a - b));
    }
  };

  const handleStepClick = (stepIndex: number) => {
    const isAccessible = stepIndex === 0 ||
      completedSteps.includes(stepIndex) ||
      stepIndex === step ||
      (stepIndex === step + 1 && completedSteps.includes(step));
    if (isAccessible && !loading) {
      setStep(stepIndex);
      setLogMessages([]);
    }
  };

  const handleContextAnalysis = () => {
    setLoading(true);
    addLogMessage("🔍 Starting context analysis...");
    setTimeout(() => {
      setLoading(false);
      markStepAsCompleted(1);
      addLogMessage("✅ Context analysis completed successfully");
    }, 2000);
  };

  const handleConversion = () => {
    setLoading(true);
    addLogMessage("🔄 Starting conversion process...");
    setTimeout(() => {
      setLoading(false);
      markStepAsCompleted(2);
      addLogMessage("✅ Conversion completed successfully");
      
      // Mock generated playbook - replace with actual generated content
      const mockPlaybook = `---
- name: Install and configure web server
  hosts: webservers
  become: yes
  vars:
    packages:
      - nginx
      - git
      - curl
    
  tasks:
    - name: Update package cache
      apt:
        update_cache: yes
        cache_valid_time: 3600
      when: ansible_os_family == "Debian"
    
    - name: Install required packages
      package:
        name: "{{ item }}"
        state: present
      loop: "{{ packages }}"
    
    - name: Start and enable nginx
      systemd:
        name: nginx
        state: started
        enabled: yes
    
    - name: Create web directory
      file:
        path: /var/www/html
        state: directory
        owner: www-data
        group: www-data
        mode: '0755'
    
    - name: Deploy index.html
      template:
        src: index.html.j2
        dest: /var/www/html/index.html
        owner: www-data
        group: www-data
        mode: '0644'
      notify: restart nginx
    
  handlers:
    - name: restart nginx
      systemd:
        name: nginx
        state: restarted`;
      
      setGeneratedPlaybook(mockPlaybook);
      addLogMessage("📋 Generated Ansible playbook ready for validation");
    }, 3000);
  };

  const handleValidation = () => {
    setLoading(true);
    addLogMessage("🛡️ Starting validation process...");
    // The ValidationPanel will handle the actual validation logic
    // This function is mainly for triggering from sidebar or other components
  };

  const handleValidationComplete = (result: any) => {
    setValidationResult(result);
    markStepAsCompleted(3);
    setLoading(false);
    addLogMessage("✅ Validation completed successfully");
    addLogMessage(`📊 Quality score: ${result.score}/100 with ${result.summary.total} issues found`);
  };

  const handleDeployment = () => {
    setLoading(true);
    addLogMessage("🚀 Starting deployment process...");
    setTimeout(() => {
      setLoading(false);
      markStepAsCompleted(4);
      addLogMessage("✅ Deployment completed successfully");
    }, 4000);
  };

  const { fetchFolders, fetchFilesInFolder, fetchFileContent, handleUpload } = useFileOperations({
    BACKEND_URL, setFolderList, setFileList, setCode, setSelectedFile, setUploadKey, addLogMessage, addSidebarMessage, gitRepoName, setLoading
  });

  const { handleCloneRepo, fetchGitFolders, fetchGitFiles, fetchGitFileContent } = useGitOperations({
    BACKEND_URL, gitUrl, setGitRepoName, setGitFolderList, setGitFileList, setCode, setSelectedGitFile, addLogMessage, addSidebarMessage, setLoading
  });

  const { classifyCode, handleManualClassify } = useClassification({
    BACKEND_URL, code, setClassificationResult: (result) => {
      console.log("🔍 DEBUG - Classification result received:", result);
      setClassificationResult(result);
      if (result && !result.error) {
        markStepAsCompleted(0);
      }
    }, setStep, step, setLoading, loading, addLog: addLogMessage
  });

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
  }, [sourceType, gitRepoName, fetchFolders]);

  useEffect(() => {
    if (retrievedContext && !completedSteps.includes(1)) {
      markStepAsCompleted(1);
    }
  }, [retrievedContext, completedSteps]);

  // Debug: Log classificationResult when it changes
  useEffect(() => {
    console.log("🔍 DEBUG - classificationResult state updated:", classificationResult);
  }, [classificationResult]);

  const [showAgentLog, setShowAgentLog] = useState(false);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-red-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-center">
          <p className="mb-4 text-gray-800 dark:text-gray-200 font-semibold">🔒 Please log in to access this page</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">🚀 Convert to Ansible - Step by Step</h1>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Welcome, {session?.user?.name || session?.user?.email}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded transition-colors rh-btn-primary"
          >
            🔒 Sign out
          </button>
        </div>
      </div>

      {/* Step Progress */}
      <GatedProgressSteps
        steps={steps}
        currentStep={step}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
        loading={loading}
      />

      {/* Mobile Log Toggle */}
      <button
        className="fixed bottom-4 right-4 z-50 bg-gray-900 text-white rounded-full px-4 py-2 shadow-lg lg:hidden"
        onClick={() => setShowAgentLog((prev) => !prev)}
        aria-label="Toggle Agent Log"
      >
        {showAgentLog ? "Hide Agent Log" : "Show Agent Log"}
      </button>

      {/* === 3-PANEL LAYOUT === */}
      <div className="x2a-3panel-layout">
        {/* LEFT SIDEBAR */}
        <div className="x2a-side-panel">
          {step === 1 ? (
            <ContextSidebar
              vectorDbId="iac"
              contextConfig={contextConfig}
              setContextConfig={setContextConfig}
              onDocUploaded={() => {}}
            />
          ) : step === 2 ? (
            <GenerateSidebar
              conversionConfig={conversionConfig}
              setConversionConfig={setConversionConfig}
              contextSummary={{
                tokens: retrievedContext.length,
                docCount: 3,
                topics: ["package install", "systemd", "templating"]
              }}
            />
          ) : step === 3 ? (
            <ValidationSidebar
              validationConfig={validationConfig}
              setValidationConfig={setValidationConfig}
              onValidate={handleValidation}
              validationResult={validationResult}
              loading={loading}
            />
          ) : (
            <WorkflowSidebar
              currentStep={step}
              sourceType={sourceType}
              setSourceType={setSourceType}
              loading={loading}
              uploadKey={uploadKey}
              handleUpload={handleUpload}
              folderList={folderList}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              selectedFile={selectedFile}
              fileList={fileList}
              fetchFilesInFolder={fetchFilesInFolder}
              fetchFileContent={fetchFileContent}
              gitUrl={gitUrl}
              setGitUrl={setGitUrl}
              handleCloneRepo={handleCloneRepo}
              gitRepoName={gitRepoName}
              gitFolderList={gitFolderList}
              selectedGitFolder={selectedGitFolder}
              setSelectedGitFolder={setSelectedGitFolder}
              gitFileList={gitFileList}
              selectedGitFile={selectedGitFile}
              fetchGitFiles={fetchGitFiles}
              fetchGitFileContent={fetchGitFileContent}
              handleManualClassify={handleManualClassify}
              code={code}
              contextConfig={contextConfig}
              setContextConfig={setContextConfig}
              handleContextAnalysis={handleContextAnalysis}
              conversionConfig={conversionConfig}
              setConversionConfig={setConversionConfig}
              handleConversion={handleConversion}
              validationConfig={validationConfig}
              setValidationConfig={setValidationConfig}
              handleValidation={handleValidation}
              deploymentConfig={deploymentConfig}
              setDeploymentConfig={setDeploymentConfig}
              handleDeployment={handleDeployment}
            />
          )}
        </div>
        
        {/* CENTER PANEL */}
        <div className="x2a-main-panel">
          {step === 1 ? (
            <ContextPanel
              code={code}
              contextConfig={contextConfig}
              vectorDbId="iac"
              onLogMessage={addLogMessage}
              onContextRetrieved={(context: string) => {
                setRetrievedContext(context);
                markStepAsCompleted(1);
              }}
            />
          ) : step === 2 ? (
            <GeneratePanel
              code={code}
              context={retrievedContext}
              classificationResult={classificationResult}
              onLogMessage={addLogMessage}
              onComplete={(playbook: string) => {
                setGeneratedPlaybook(playbook);
                markStepAsCompleted(2);
                addLogMessage("📋 Playbook generated and ready for validation");
              }}
            />
          ) : step === 3 ? (
            <ValidationPanel
              playbook={generatedPlaybook}
              validationConfig={validationConfig}
              onLogMessage={addLogMessage}
              onValidationComplete={handleValidationComplete}
            />
          ) : (
            <ClassificationPanel
              classificationResult={classificationResult}
              selectedFile={selectedFile}
              selectedGitFile={selectedGitFile}
              code={code}
              loading={loading}
              step={step}
            />
          )}
        </div>

        {/* RIGHT LOG PANEL */}
        <div className={`x2a-log-panel ${showAgentLog ? "" : "hidden"} lg:flex`}>
          <AgentLogPanel
            logMessages={logMessages}
            setLogMessages={setLogMessages}
          />
        </div>
      </div>

      {/* FOOTER SYSTEM MESSAGES */}
      <SystemMessages messages={sidebarMessages} />
    </div>
  );
}