import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  RocketLaunchIcon,
  ClipboardDocumentIcon,
  ExclamationCircleIcon,
  CommandLineIcon,
  ServerIcon,
  CloudIcon,
  CheckCircleIcon,
  PlayIcon,
  StopIcon,
  EyeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  CogIcon,
  BuildingOfficeIcon,
  ComputerDesktopIcon,
  SignalIcon,
  BoltIcon
} from "@heroicons/react/24/outline";

interface DeploymentPanelProps {
  playbook: string;
  deploymentConfig: {
    environment: 'development' | 'staging' | 'production';
    deploymentMode: 'aap' | 'direct';
    aapConfig?: {
      controllerUrl: string;
      projectName: string;
      jobTemplateName: string;
      inventory: string;
      credentials: string;
    };
    directConfig?: {
      targetHosts: string[];
      sshCredentials: string;
      becomeMethod: string;
    };
    rollbackStrategy: 'immediate' | 'gradual' | 'none';
    notifications: boolean;
  };
  onLogMessage?: (message: string) => void;
  onComplete?: (result: any) => void;
}

interface DeploymentState {
  isDeploying: boolean;
  currentPhase: string;
  progress: number;
  logs: string[];
  result?: any;
}

type DeploymentPhase = 
  | 'preparing'
  | 'connecting'
  | 'validating'
  | 'executing'
  | 'monitoring'
  | 'completing'
  | 'success'
  | 'failed';

export default function DeploymentPanel({ 
  playbook, 
  deploymentConfig, 
  onLogMessage, 
  onComplete 
}: DeploymentPanelProps) {
  const [deploymentState, setDeploymentState] = useState<DeploymentState>({
    isDeploying: false,
    currentPhase: 'preparing',
    progress: 0,
    logs: []
  });
  
  const [error, setError] = useState<string | null>(null);
  const [showDeploymentDetails, setShowDeploymentDetails] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [hasDeployed, setHasDeployed] = useState(false);

  const logsRef = useRef<HTMLPreElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const logMessage = useCallback((msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${msg}`;
    setDeploymentState(prev => ({
      ...prev,
      logs: [...prev.logs, logEntry]
    }));
    onLogMessage?.(msg);
  }, [onLogMessage]);

  const updateDeploymentPhase = useCallback((phase: DeploymentPhase, progress: number, message?: string) => {
    setDeploymentState(prev => ({
      ...prev,
      currentPhase: phase,
      progress
    }));
    if (message) logMessage(message);
  }, [logMessage]);

  const simulateDeploymentProgress = useCallback(async () => {
    const phases: Array<{phase: DeploymentPhase, duration: number, progress: number, message: string}> = [
      { phase: 'preparing', duration: 1000, progress: 10, message: '🔧 Preparing deployment environment...' },
      { phase: 'connecting', duration: 1500, progress: 25, message: deploymentConfig.deploymentMode === 'aap' ? '🔗 Connecting to AAP Controller...' : '🔗 Establishing SSH connections...' },
      { phase: 'validating', duration: 2000, progress: 40, message: '✅ Validating playbook and configuration...' },
      { phase: 'executing', duration: 3000, progress: 70, message: deploymentConfig.deploymentMode === 'aap' ? '🎯 Creating job template and executing...' : '⚡ Executing playbook on target hosts...' },
      { phase: 'monitoring', duration: 2000, progress: 90, message: '📊 Monitoring deployment progress...' },
      { phase: 'completing', duration: 1000, progress: 95, message: '🏁 Finalizing deployment...' },
      { phase: 'success', duration: 500, progress: 100, message: '🎉 Deployment completed successfully!' }
    ];

    for (const step of phases) {
      if (!deploymentState.isDeploying) break;
      updateDeploymentPhase(step.phase, step.progress, step.message);
      await new Promise(resolve => setTimeout(resolve, step.duration));
    }
  }, [deploymentConfig.deploymentMode, deploymentState.isDeploying, updateDeploymentPhase]);

  const handleDeploy = useCallback(async () => {
    if (!playbook.trim()) {
      setError("No playbook available for deployment");
      logMessage("❌ No playbook available for deployment");
      return;
    }

    setDeploymentState(prev => ({ ...prev, isDeploying: true, logs: [], progress: 0 }));
    setError(null);
    setHasDeployed(true);
    logMessage("🚀 Starting deployment process...");

    try {
      const payload = {
        playbook,
        deployment_config: deploymentConfig
      };

      logMessage(`📋 Deployment mode: ${deploymentConfig.deploymentMode.toUpperCase()}`);
      logMessage(`🌍 Environment: ${deploymentConfig.environment}`);

      // Start the visual progress simulation
      simulateDeploymentProgress();

      const response = await fetch(`${BACKEND_URL}/api/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      
      setDeploymentState(prev => ({
        ...prev,
        isDeploying: false,
        currentPhase: 'success',
        progress: 100,
        result: data
      }));

      logMessage(`✅ Deployment completed successfully`);
      if (data.job_id) logMessage(`📋 Job ID: ${data.job_id}`);
      if (data.execution_time) logMessage(`⏱️ Execution time: ${data.execution_time}s`);
      
      if (onComplete) onComplete(data);

    } catch (err: any) {
      const errorMessage = err.message || "Deployment failed";
      setError(errorMessage);
      setDeploymentState(prev => ({
        ...prev,
        isDeploying: false,
        currentPhase: 'failed',
        result: { error: errorMessage }
      }));
      logMessage(`❌ Deployment failed: ${errorMessage}`);
    }
  }, [playbook, deploymentConfig, simulateDeploymentProgress, onComplete, logMessage, BACKEND_URL]);

  const stopDeployment = useCallback(() => {
    setDeploymentState(prev => ({ ...prev, isDeploying: false }));
    logMessage("⏹️ Deployment stopped by user");
  }, [logMessage]);

  const copyLogsToClipboard = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(deploymentState.logs.join('\n'));
      logMessage(`📋 Deployment logs copied to clipboard`);
    } catch (err) {
      logMessage(`❌ Failed to copy logs to clipboard`);
    }
  }, [deploymentState.logs, logMessage]);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) {
      logsRef.current.scrollTop = logsRef.current.scrollHeight;
    }
  }, [deploymentState.logs]);

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'preparing': return <CogIcon className="w-5 h-5 animate-spin" />;
      case 'connecting': return <SignalIcon className="w-5 h-5 animate-pulse" />;
      case 'validating': return <CheckCircleIcon className="w-5 h-5 animate-pulse" />;
      case 'executing': return <BoltIcon className="w-5 h-5 animate-bounce" />;
      case 'monitoring': return <EyeIcon className="w-5 h-5 animate-pulse" />;
      case 'completing': return <ArrowPathIcon className="w-5 h-5 animate-spin" />;
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-green-400" />;
      case 'failed': return <ExclamationCircleIcon className="w-5 h-5 text-red-400" />;
      default: return <RocketLaunchIcon className="w-5 h-5" />;
    }
  };

  const getProgressColor = () => {
    if (deploymentState.currentPhase === 'failed') return 'bg-red-500';
    if (deploymentState.currentPhase === 'success') return 'bg-green-500';
    return 'bg-blue-500';
  };

  return (
    <div ref={panelRef} className="h-full w-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {error && (
        <div className="mx-6 my-4 p-4 bg-gradient-to-r from-red-500/15 to-pink-500/15 border border-red-500/40 rounded-xl backdrop-blur-sm shadow-lg">
          <div className="flex items-start space-x-3">
            <ExclamationCircleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold text-base">Deployment Failed</h3>
              <p className="text-red-400/90 mt-1 text-sm leading-relaxed">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300 transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* MAIN SCROLL PANEL */}
      <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-y-auto context-sidebar-scrollbar">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg">
              <RocketLaunchIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-2xl lg:text-3xl">Deploy Ansible Playbook</h1>
              <p className="text-slate-400 text-base">
                Automated infrastructure deployment
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={deploymentState.isDeploying ? stopDeployment : handleDeploy}
              disabled={!playbook.trim()}
              className={`px-6 py-3 rounded-xl font-bold text-white shadow-xl transition-all duration-300 transform ${
                !playbook.trim()
                  ? "bg-gray-600 cursor-not-allowed scale-95"
                  : deploymentState.isDeploying
                  ? "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 hover:scale-105 hover:shadow-2xl active:scale-95"
                  : hasDeployed
                  ? "bg-gradient-to-r from-purple-500 to-pink-400 hover:from-purple-600 hover:to-pink-500 hover:scale-105 hover:shadow-2xl active:scale-95"
                  : "bg-gradient-to-r from-purple-500 to-pink-400 hover:from-purple-600 hover:to-pink-500 hover:scale-105 hover:shadow-2xl active:scale-95"
              }`}
            >
              <div className="flex items-center space-x-2">
                {deploymentState.isDeploying ? (
                  <>
                    <StopIcon className="w-5 h-5" />
                    <span>Stop Deployment</span>
                  </>
                ) : hasDeployed ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5" />
                    <span>Redeploy</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-5 h-5" />
                    <span>Deploy Now</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {/* Deployment Configuration Summary */}
        <div className="mb-6">
          <button
            onClick={() => setShowDeploymentDetails(!showDeploymentDetails)}
            className="w-full text-left"
          >
            <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 p-4 hover:bg-slate-800/70 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-400 rounded-lg flex items-center justify-center">
                    {deploymentConfig.deploymentMode === 'aap' ? (
                      <BuildingOfficeIcon className="w-5 h-5 text-white" />
                    ) : (
                      <ComputerDesktopIcon className="w-5 h-5 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100">Deployment Configuration</h3>
                    <p className="text-slate-400 text-sm">
                      {deploymentConfig.deploymentMode === 'aap' ? 'AAP Controller' : 'Direct SSH'} • {deploymentConfig.environment} environment
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <div className={`px-3 py-1 text-xs font-medium rounded-full ${
                    deploymentConfig.deploymentMode === 'aap' 
                      ? 'bg-indigo-500/20 text-indigo-300' 
                      : 'bg-green-500/20 text-green-300'
                  }`}>
                    {deploymentConfig.deploymentMode === 'aap' ? '🏢 AAP MODE' : '🖥️ DIRECT MODE'}
                  </div>
                  {showDeploymentDetails ? (
                    <ChevronUpIcon className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>
              
              {showDeploymentDetails && (
                <div className="mt-4 pt-4 border-t border-slate-600/30">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-slate-200 mb-2">Target Configuration</h4>
                      {deploymentConfig.deploymentMode === 'aap' ? (
                        <div className="space-y-2">
                          <div className="text-slate-300 text-sm bg-slate-700/30 rounded px-3 py-2">
                            <span className="text-slate-400">Controller:</span> {deploymentConfig.aapConfig?.controllerUrl || 'Not configured'}
                          </div>
                          <div className="text-slate-300 text-sm bg-slate-700/30 rounded px-3 py-2">
                            <span className="text-slate-400">Project:</span> {deploymentConfig.aapConfig?.projectName || 'Auto-generated'}
                          </div>
                          <div className="text-slate-300 text-sm bg-slate-700/30 rounded px-3 py-2">
                            <span className="text-slate-400">Job Template:</span> {deploymentConfig.aapConfig?.jobTemplateName || 'Auto-generated'}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="text-slate-300 text-sm bg-slate-700/30 rounded px-3 py-2">
                            <span className="text-slate-400">Hosts:</span> {deploymentConfig.directConfig?.targetHosts.join(', ') || 'Not configured'}
                          </div>
                          <div className="text-slate-300 text-sm bg-slate-700/30 rounded px-3 py-2">
                            <span className="text-slate-400">SSH:</span> {deploymentConfig.directConfig?.sshCredentials || 'Default credentials'}
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-200 mb-2">Deployment Options</h4>
                      <div className="space-y-2">
                        <div className="text-slate-300 text-sm bg-slate-700/30 rounded px-3 py-2">
                          <span className="text-slate-400">Environment:</span> {deploymentConfig.environment}
                        </div>
                        <div className="text-slate-300 text-sm bg-slate-700/30 rounded px-3 py-2">
                          <span className="text-slate-400">Rollback:</span> {deploymentConfig.rollbackStrategy}
                        </div>
                        <div className="text-slate-300 text-sm bg-slate-700/30 rounded px-3 py-2">
                          <span className="text-slate-400">Notifications:</span> {deploymentConfig.notifications ? 'Enabled' : 'Disabled'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </button>
        </div>

        {/* Deployment Progress */}
        {(deploymentState.isDeploying || deploymentState.currentPhase === 'success' || deploymentState.currentPhase === 'failed') && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
                    {getPhaseIcon(deploymentState.currentPhase)}
                  </div>
                  {deploymentState.isDeploying && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full animate-ping"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-xl">Deployment Progress</h3>
                  <p className="text-slate-400 text-sm capitalize">
                    {deploymentState.currentPhase.replace('_', ' ')} • {deploymentState.progress}% complete
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {deploymentState.currentPhase === 'success' && (
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span className="text-xs text-green-300 font-medium">SUCCESS</span>
                  </div>
                )}
                {deploymentState.currentPhase === 'failed' && (
                  <div className="flex items-center space-x-2">
                    <ExclamationCircleIcon className="w-5 h-5 text-red-400" />
                    <span className="text-xs text-red-300 font-medium">FAILED</span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
                style={{ width: `${deploymentState.progress}%` }}
              ></div>
            </div>
          </div>
        )}

        {/* Deployment Logs */}
        {deploymentState.logs.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-400 rounded-lg flex items-center justify-center">
                  <CommandLineIcon className="w-5 h-5 text-white" />
                </div>
                <h3 className="font-bold text-slate-100 text-lg">Deployment Logs</h3>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowLogs(!showLogs)}
                  className="p-2 text-xs text-slate-400 hover:text-blue-300 transition-colors rounded-lg hover:bg-slate-600/30"
                  title="Toggle logs visibility"
                >
                  {showLogs ? <EyeIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
                <button
                  onClick={copyLogsToClipboard}
                  className="p-2 text-xs text-slate-400 hover:text-blue-300 transition-colors rounded-lg hover:bg-slate-600/30"
                  title="Copy logs"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {(showLogs || deploymentState.isDeploying) && (
              <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 overflow-hidden">
                <pre 
                  ref={logsRef}
                  className="p-4 bg-slate-900/60 text-slate-100 font-mono text-sm leading-relaxed overflow-auto max-h-64"
                  style={{ 
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace'
                  }}
                >
                  {deploymentState.logs.join('\n')}
                  {deploymentState.isDeploying && (
                    <span className="inline-block w-2 h-4 bg-purple-400 animate-pulse ml-1" />
                  )}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Empty State */}
        {!playbook && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <RocketLaunchIcon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-slate-200 text-2xl font-bold mb-3">Ready for Deployment</h3>
            <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
              Generate and validate your Ansible playbook first to enable automated deployment
            </p>
            <div className="bg-slate-800/30 rounded-lg p-4 max-w-sm mx-auto border border-slate-600/20">
              <p className="text-slate-500 text-sm">
                📋 Complete the previous steps to unlock deployment capabilities
              </p>
            </div>
          </div>
        )}

        {/* Playbook Ready State */}
        {playbook && !deploymentState.logs.length && !deploymentState.isDeploying && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <RocketLaunchIcon className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-slate-200 text-xl font-bold mb-3">Playbook Ready for Deployment</h3>
            <p className="text-slate-400 text-base mb-6 max-w-lg mx-auto">
              Your Ansible playbook has been generated and validated. Choose your deployment method and click "Deploy Now" to begin.
            </p>
            <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-600/20">
                <BuildingOfficeIcon className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
                <h4 className="text-slate-200 font-semibold mb-1">AAP Controller</h4>
                <p className="text-slate-500 text-sm">
                  Deploy via Ansible Automation Platform with centralized management
                </p>
              </div>
              <div className="bg-slate-800/30 rounded-lg p-4 border border-slate-600/20">
                <ComputerDesktopIcon className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h4 className="text-slate-200 font-semibold mb-1">Direct Deployment</h4>
                <p className="text-slate-500 text-sm">
                  Execute playbook directly on target infrastructure via SSH
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}