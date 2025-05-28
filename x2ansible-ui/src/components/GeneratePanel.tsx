import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  SparklesIcon, 
  ClipboardDocumentIcon, 
  ExclamationCircleIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  PlayIcon,
  StopIcon,
  CheckCircleIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

interface GeneratePanelProps {
  code: string;
  context: string;
  classificationResult?: any;
  onLogMessage?: (message: string) => void;
  onComplete?: (playbook: string) => void;
}

interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  fullText: string;
  currentIndex: number;
}

type PanelMode = 'ready' | 'generating' | 'complete' | 'editing';

export default function GeneratePanel({ 
  code, 
  context, 
  classificationResult, 
  onLogMessage, 
  onComplete 
}: GeneratePanelProps) {
  const [playbook, setPlaybook] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panelMode, setPanelMode] = useState<PanelMode>('ready');
  const [showAnalysisDetails, setShowAnalysisDetails] = useState(false);
  const [specText, setSpecText] = useState<string>("");
  const [hasGenerated, setHasGenerated] = useState(false);

  // Streaming state
  const [streamingState, setStreamingState] = useState<StreamingState>({
    isStreaming: false,
    currentText: '',
    fullText: '',
    currentIndex: 0
  });

  const streamingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const codeCanvasRef = useRef<HTMLPreElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

  const logMessage = useCallback((msg: string) => {
    onLogMessage?.(msg);
  }, [onLogMessage]);

  useEffect(() => {
    if (!context || !classificationResult || specText) return;
    setSpecText("Generated requirements based on your infrastructure code and context analysis. You can edit these requirements before generating the playbook.");
  }, [context, classificationResult]);

  const startStreaming = useCallback((fullText: string) => {
    setPanelMode('generating');
    setStreamingState({
      isStreaming: true,
      currentText: '',
      fullText,
      currentIndex: 0
    });
    let currentIndex = 0;
    streamingIntervalRef.current = setInterval(() => {
      if (currentIndex >= fullText.length) {
        setStreamingState(prev => ({ ...prev, isStreaming: false }));
        if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
        setPanelMode('complete');
        setHasGenerated(true);
        logMessage("✨ Playbook generation completed");
        if (onComplete) setTimeout(() => onComplete(fullText), 500);
        return;
      }
      let charsToAdd = 1;
      const char = fullText[currentIndex];
      if (char === '\n') charsToAdd = 1;
      else if (char === ' ') charsToAdd = Math.min(2, fullText.length - currentIndex);
      else if (/[a-zA-Z0-9]/.test(char)) charsToAdd = Math.min(3, fullText.length - currentIndex);
      const newText = fullText.substring(0, currentIndex + charsToAdd);
      setStreamingState(prev => ({
        ...prev,
        currentText: newText,
        currentIndex: currentIndex + charsToAdd
      }));
      currentIndex += charsToAdd;
      if (codeCanvasRef.current) codeCanvasRef.current.scrollTop = codeCanvasRef.current.scrollHeight;
    }, 20);
  }, [logMessage, onComplete]);

  const stopStreaming = useCallback(() => {
    if (streamingIntervalRef.current) clearInterval(streamingIntervalRef.current);
    setStreamingState(prev => ({
      ...prev,
      isStreaming: false,
      currentText: prev.fullText
    }));
    setPanelMode('complete');
    setHasGenerated(true);
    logMessage("⏹️ Streaming stopped");
  }, [logMessage]);

  const handleGenerate = useCallback(async () => {
    if (!code.trim()) {
      setError("No input code provided");
      logMessage("❌ No input code provided");
      return;
    }
    setLoading(true);
    setError(null);
    setPlaybook("");
    setStreamingState({ isStreaming: false, currentText: '', fullText: '', currentIndex: 0 });
    logMessage("🚀 Starting playbook generation...");
    try {
      const payload = {
        input_code: code,
        context: specText || context
      };
      const response = await fetch(`${BACKEND_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      const data = await response.json();
      if (data.playbook) {
        setPlaybook(data.playbook);
        startStreaming(data.playbook);
        logMessage(`✅ Playbook generated: ${data.playbook.length} chars`);
        if (onComplete) onComplete(data.playbook);
      } else {
        throw new Error("No playbook in response");
      }
    } catch (err: any) {
      const errorMessage = err.message || "Generation failed";
      setError(errorMessage);
      logMessage(`❌ Generation failed: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [code, specText, context, startStreaming, onComplete, logMessage, BACKEND_URL]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logMessage(`📋 Copied to clipboard`);
    } catch (err) {
      logMessage(`❌ Failed to copy to clipboard`);
    }
  }, [logMessage]);

  return (
    <div ref={panelRef} className="h-full w-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {error && (
        <div className="mx-6 my-4 p-4 bg-gradient-to-r from-red-500/15 to-pink-500/15 border border-red-500/40 rounded-xl backdrop-blur-sm shadow-lg">
          <div className="flex items-start space-x-3">
            <ExclamationCircleIcon className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-red-300 font-semibold text-base">Generation Failed</h3>
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
            <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg">
              <SparklesIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-white text-2xl lg:text-3xl">Generate Ansible Playbook</h1>
              <p className="text-slate-400 text-base">
                {hasGenerated ? 'Playbook ready - edit requirements to regenerate' : 'AI-powered infrastructure conversion'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {hasGenerated && (
              <button
                onClick={() => setPanelMode(panelMode === 'editing' ? 'complete' : 'editing')}
                className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white transition-all duration-200 flex items-center space-x-2"
              >
                <PencilSquareIcon className="w-4 h-4" />
                <span className="text-sm">{panelMode === 'editing' ? 'Cancel Edit' : 'Edit Requirements'}</span>
              </button>
            )}
            <button
              onClick={handleGenerate}
              disabled={loading || streamingState.isStreaming}
              className={`px-6 py-3 rounded-xl font-bold text-white shadow-xl transition-all duration-300 transform ${
                loading || streamingState.isStreaming
                  ? "bg-gradient-to-r from-yellow-500/70 to-orange-400/70 cursor-not-allowed scale-95"
                  : "bg-gradient-to-r from-yellow-500 to-orange-400 hover:from-yellow-600 hover:to-orange-500 hover:scale-105 hover:shadow-2xl active:scale-95"
              }`}
            >
              <div className="flex items-center space-x-2">
                {loading ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : hasGenerated ? (
                  <>
                    <ArrowPathIcon className="w-5 h-5" />
                    <span>Regenerate</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    <span>Generate Playbook</span>
                  </>
                )}
              </div>
            </button>
          </div>
        </div>

        {classificationResult && (
          <div className="mb-6">
            <button
              onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
              className="w-full text-left"
            >
              <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 p-4 hover:bg-slate-800/70 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                      <DocumentTextIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-100">Analysis Summary</h3>
                      <p className="text-slate-400 text-sm">
                        {classificationResult?.classification || 'Unknown'} • {classificationResult?.complexity_level || 'Medium'} complexity
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className={`px-3 py-1 text-xs font-medium rounded-full ${
                      classificationResult?.convertible 
                        ? 'bg-green-500/20 text-green-300' 
                        : 'bg-red-500/20 text-red-300'
                    }`}>
                      {classificationResult?.convertible ? '✅ READY' : '❌ BLOCKED'}
                    </div>
                    {showAnalysisDetails ? (
                      <ChevronUpIcon className="w-5 h-5 text-slate-400" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                    )}
                  </div>
                </div>
                
                {showAnalysisDetails && (
                  <div className="mt-4 pt-4 border-t border-slate-600/30">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-slate-200 mb-2">Summary</h4>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {classificationResult?.summary || 'Analysis summary not available'}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-medium text-slate-200 mb-2">Key Resources</h4>
                        <div className="space-y-1">
                          {(classificationResult?.resources || []).slice(0, 3).map((resource: string, i: number) => (
                            <div key={i} className="text-slate-300 text-sm bg-slate-700/30 rounded px-2 py-1">
                              {resource}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </button>
          </div>
        )}

        {(panelMode === 'editing' || !hasGenerated) && (
          <div className="mb-6">
            <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-200 flex items-center space-x-2">
                  <DocumentTextIcon className="w-5 h-5 text-slate-400" />
                  <span>Requirements & Specifications</span>
                </h3>
                <span className="text-xs text-slate-500">
                  {specText ? `${specText.length} characters` : 'Auto-generated'}
                </span>
              </div>
              <textarea
                value={specText}
                onChange={e => setSpecText(e.target.value)}
                className="w-full bg-slate-900/50 text-slate-100 font-mono p-4 rounded-lg border border-slate-600/30 outline-none min-h-[120px] max-h-[300px] resize-vertical scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors"
                style={{ fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace', fontSize: '0.9rem', lineHeight: 1.5 }}
                placeholder="Describe your infrastructure requirements here..."
              />
            </div>
          </div>
        )}

        {(panelMode === 'generating' || panelMode === 'complete') && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg">
                    <CodeBracketIcon className="w-6 h-6 text-white" />
                  </div>
                  {streamingState.isStreaming && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-xl">Ansible Playbook</h3>
                  <p className="text-slate-400 text-sm">
                    {streamingState.isStreaming ? 'Live streaming from AI agent...' : 
                      panelMode === 'complete' ? `Generated ${playbook.length} characters` : 'Processing...'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {streamingState.isStreaming && (
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                    <span className="text-xs text-green-300 font-medium">STREAMING</span>
                  </div>
                )}
                {panelMode === 'complete' && (
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-400" />
                    <span className="text-xs text-green-300 font-medium">COMPLETE</span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  {streamingState.isStreaming && (
                    <button
                      onClick={stopStreaming}
                      className="p-2 text-xs text-red-400 hover:text-red-300 transition-colors rounded-lg hover:bg-slate-600/30"
                      title="Stop streaming"
                    >
                      <StopIcon className="w-4 h-4" />
                    </button>
                  )}
                  {(playbook || streamingState.currentText) && (
                    <button
                      onClick={() => copyToClipboard(playbook || streamingState.currentText)}
                      className="p-2 text-xs text-slate-400 hover:text-blue-300 transition-colors rounded-lg hover:bg-slate-600/30"
                      title="Copy YAML"
                    >
                      <ClipboardDocumentIcon className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 overflow-hidden">
              {(streamingState.currentText || playbook) ? (
                <pre 
                  ref={codeCanvasRef}
                  className="p-6 bg-slate-900/60 text-slate-100 font-mono text-sm leading-relaxed overflow-auto max-h-96 lg:max-h-[500px] context-sidebar-scrollbar"
                  style={{ 
                    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, monospace',
                    tabSize: 2
                  }}
                >
                  {streamingState.currentText || playbook}
                  {streamingState.isStreaming && (
                    <span className="inline-block w-2 h-5 bg-green-400 animate-pulse ml-1 align-top" />
                  )}
                </pre>
              ) : (
                <div className="p-12 text-center">
                  <div className="w-16 h-16 bg-slate-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <CodeBracketIcon className="w-8 h-8 text-slate-400" />
                  </div>
                  <p className="text-slate-500 text-lg font-medium mb-2">Preparing Generation</p>
                  <p className="text-slate-600 text-sm">
                    AI agent is processing your infrastructure code...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {!context && !classificationResult && (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <SparklesIcon className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-slate-200 text-2xl font-bold mb-3">Ready for AI Conversion</h3>
            <p className="text-slate-400 text-lg mb-8 max-w-md mx-auto">
              Complete context analysis first to see intelligent conversion insights and generate your Ansible playbook
            </p>
            <div className="bg-slate-800/30 rounded-lg p-4 max-w-sm mx-auto border border-slate-600/20">
              <p className="text-slate-500 text-sm">
                📋 Context analysis will unlock detailed infrastructure analysis and conversion strategy
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
