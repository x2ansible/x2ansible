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
  EyeSlashIcon
} from "@heroicons/react/24/outline";

interface GeneratePanelProps {
  code: string;
  context: string;
  classificationResult?: any;
  onLogMessage?: (message: string) => void;
  onComplete?: () => void;
}

interface StreamingState {
  isStreaming: boolean;
  currentText: string;
  fullText: string;
  currentIndex: number;
}

type PanelMode = 'ready' | 'analysis' | 'generating' | 'complete';

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

  // Auto-scroll to panel when mode changes
  useEffect(() => {
    if (panelRef.current && (panelMode === 'analysis' || panelMode === 'generating')) {
      panelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [panelMode]);

  // Set panel mode based on context and classification
  useEffect(() => {
    if (context && classificationResult && panelMode === 'ready') {
      setPanelMode('analysis');
    }
  }, [context, classificationResult, panelMode]);

  // Start streaming animation
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
        if (streamingIntervalRef.current) {
          clearInterval(streamingIntervalRef.current);
        }
        setPanelMode('complete');
        logMessage("✨ Code streaming completed");
        if (onComplete) {
          setTimeout(() => onComplete(), 500);
        }
        return;
      }

      // Variable speed streaming
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

      // Auto-scroll
      if (codeCanvasRef.current) {
        codeCanvasRef.current.scrollTop = codeCanvasRef.current.scrollHeight;
      }
    }, 20);
  }, [logMessage, onComplete]);

  const stopStreaming = useCallback(() => {
    if (streamingIntervalRef.current) {
      clearInterval(streamingIntervalRef.current);
    }
    setStreamingState(prev => ({
      ...prev,
      isStreaming: false,
      currentText: prev.fullText
    }));
    setPanelMode('complete');
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

    logMessage("🚀 Starting real playbook generation...");
    logMessage(`📊 Using real ${classificationResult?.classification || 'unknown'} analysis`);

    try {
      const payload = {
        input_code: code,
        context: context
      };
      
      const response = await fetch(`${BACKEND_URL}/api/generate`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
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
        
        logMessage(`✅ Real playbook generated: ${data.playbook.length} chars`);
        logMessage(`🤖 Agent used: ${data.debug_info?.agent_used || 'unknown'}`);
        
        if (onComplete) onComplete();
      } else {
        throw new Error("No playbook in response");
      }
      
    } catch (err: any) {
      const errorMessage = err.message || "Generation failed";
      setError(errorMessage);
      logMessage(`❌ Generation failed: ${errorMessage}`);
      setPanelMode('analysis'); // Return to analysis view on error
    } finally {
      setLoading(false);
    }
  }, [code, context, classificationResult, startStreaming, onComplete, logMessage, BACKEND_URL]);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logMessage(`📋 Copied to clipboard`);
    } catch (err) {
      logMessage(`❌ Failed to copy to clipboard`);
    }
  }, [logMessage]);

  const renderAnalysisSection = () => (
    <div className="space-y-6">
      {/* Analysis Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg">
            <DocumentTextIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-xl">
              🤖 Analysis Summary
            </h3>
            <p className="text-slate-400 text-sm">
              {classificationResult?.classification || 'Unknown'} → Ansible conversion ready
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Status indicators */}
          <div className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
            (classificationResult?.complexity_level || '').toLowerCase() === 'high' ? 'bg-red-500/20 text-red-300 border-red-400/40' :
            (classificationResult?.complexity_level || '').toLowerCase() === 'medium' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40' :
            'bg-green-500/20 text-green-300 border-green-400/40'
          }`}>
            {(classificationResult?.complexity_level || 'MEDIUM').toUpperCase()}
          </div>
          
          {classificationResult?.convertible !== undefined && (
            <div className={`px-3 py-1.5 text-xs font-medium rounded-full border ${
              classificationResult.convertible 
                ? 'bg-green-500/20 text-green-300 border-green-400/40' 
                : 'bg-red-500/20 text-red-300 border-red-400/40'
            }`}>
              {classificationResult.convertible ? '✅ READY' : '❌ BLOCKED'}
            </div>
          )}
        </div>
      </div>

      {/* Quick Summary Card */}
      <div className="bg-slate-800/50 rounded-xl p-6 border border-slate-600/30">
        <h4 className="text-slate-200 font-semibold text-lg mb-3 flex items-center">
          <InformationCircleIcon className="w-5 h-5 mr-2 text-blue-400" />
          Conversion Summary
        </h4>
        <p className="text-slate-300 leading-relaxed mb-4">
          {classificationResult?.summary || "Analysis completed successfully. Ready for Ansible conversion."}
        </p>
        
        {/* Key Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">Source</div>
            <div className="text-slate-100 text-lg font-bold mt-1">
              {classificationResult?.classification || 'Unknown'}
            </div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">Components</div>
            <div className="text-slate-100 text-lg font-bold mt-1">
              {classificationResult?.resources?.length || 0}
            </div>
          </div>
          <div className="bg-slate-700/30 rounded-lg p-3 text-center">
            <div className="text-slate-400 text-xs font-medium uppercase tracking-wide">Operations</div>
            <div className="text-slate-100 text-lg font-bold mt-1">
              {classificationResult?.key_operations?.length || 0}
            </div>
          </div>
        </div>

        {/* Toggle Details */}
        <button
          onClick={() => setShowAnalysisDetails(!showAnalysisDetails)}
          className="flex items-center space-x-2 text-blue-300 hover:text-blue-200 transition-colors text-sm font-medium"
        >
          {showAnalysisDetails ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
          <span>{showAnalysisDetails ? 'Hide' : 'Show'} Detailed Analysis</span>
          {showAnalysisDetails ? <ChevronUpIcon className="w-4 h-4" /> : <ChevronDownIcon className="w-4 h-4" />}
        </button>
      </div>

      {/* Detailed Analysis (Collapsible) */}
      {showAnalysisDetails && (
        <div className="space-y-6 animate-in slide-in-from-top-2 duration-300">
          {/* Resources */}
          {classificationResult?.resources && classificationResult.resources.length > 0 && (
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-600/20">
              <h4 className="text-slate-200 font-semibold text-base flex items-center mb-3">
                <CodeBracketIcon className="w-5 h-5 mr-2 text-green-400" />
                Infrastructure Components
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {classificationResult.resources.map((resource: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-300">{resource}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Key Operations */}
          {classificationResult?.key_operations && classificationResult.key_operations.length > 0 && (
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-600/20">
              <h4 className="text-slate-200 font-semibold text-base flex items-center mb-3">
                <CheckCircleIcon className="w-5 h-5 mr-2 text-blue-400" />
                Key Operations
              </h4>
              <div className="space-y-2">
                {classificationResult.key_operations.map((operation: string, index: number) => (
                  <div key={index} className="flex items-start space-x-2 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-slate-300">{operation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Additional Details */}
          {classificationResult?.conversion_notes && (
            <div className="bg-slate-800/30 rounded-xl p-5 border border-slate-600/20">
              <h4 className="text-slate-200 font-semibold text-base flex items-center mb-3">
                <InformationCircleIcon className="w-5 h-5 mr-2 text-amber-400" />
                Conversion Strategy
              </h4>
              <p className="text-slate-300 text-sm leading-relaxed">
                {classificationResult.conversion_notes}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderGeneratingSection = () => (
    <div className="space-y-6">
      {/* Generation Header */}
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
            <h3 className="font-bold text-slate-100 text-xl">
              🚀 Generating Ansible Playbook
            </h3>
            <p className="text-slate-400 text-sm">
              {streamingState.isStreaming ? 'Live streaming from AI agent...' : 
               panelMode === 'complete' ? 'Generation complete' : 'Processing...'}
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

          {/* Control Buttons */}
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

      {/* Code Output */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-600/30 overflow-hidden">
        {(streamingState.currentText || playbook) ? (
          <pre 
            ref={codeCanvasRef}
            className="p-6 bg-slate-900/60 text-slate-100 font-mono text-sm leading-relaxed overflow-auto max-h-96 lg:max-h-[500px] scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600"
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
  );

  const renderReadyState = () => (
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
  );

  return (
    <div ref={panelRef} className="h-full w-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Dynamic Header */}
      <div className="relative bg-gradient-to-r from-slate-800/95 to-slate-700/80 backdrop-blur-sm border-b border-slate-600/40 p-6 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-500 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg">
                <SparklesIcon className="w-7 h-7 text-white" />
              </div>
              {streamingState.isStreaming && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-400 rounded-full animate-ping shadow-lg"></div>
              )}
            </div>
            <div>
              <h1 className="font-bold text-white text-2xl lg:text-3xl">
                {panelMode === 'ready' && 'Agentic '}
                {panelMode === 'analysis' && 'Code Generation'}
                {panelMode === 'generating' && 'Live Generation'}
                {panelMode === 'complete' && 'Conversion Complete'}
              </h1>
              <p className="text-slate-400 mt-1 text-sm lg:text-base">
                {panelMode === 'ready' && 'Advanced infrastructure code analysis and conversion'}
                {panelMode === 'analysis' && `Ready to convert ${classificationResult?.classification || 'Unknown'} to Ansible`}
                {panelMode === 'generating' && 'Real-time Ansible playbook generation in progress'}
                {panelMode === 'complete' && 'Your production-ready Ansible playbook is ready'}
              </p>
            </div>
          </div>
          
          {/* Generate Button */}
          {(panelMode === 'analysis' || panelMode === 'generating') && (
            <button
              className={`flex items-center space-x-3 px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-bold text-white shadow-xl transition-all duration-300 transform ${
                loading || streamingState.isStreaming
                  ? "bg-gradient-to-r from-yellow-500/70 to-orange-400/70 cursor-not-allowed scale-95"
                  : "bg-gradient-to-r from-yellow-500 to-orange-400 hover:from-yellow-600 hover:to-orange-500 hover:scale-105 hover:shadow-2xl active:scale-95"
              }`}
              onClick={streamingState.isStreaming ? stopStreaming : handleGenerate}
              disabled={loading && !streamingState.isStreaming}
            >
              {loading && !streamingState.isStreaming ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin"></div>
                  <span className="text-base lg:text-lg">Generating...</span>
                </>
              ) : streamingState.isStreaming ? (
                <>
                  <StopIcon className="w-5 h-5" />
                  <span className="text-base lg:text-lg">Stop Stream</span>
                </>
              ) : (
                <>
                  <PlayIcon className="w-5 h-5" />
                  <span className="text-base lg:text-lg">Generate Playbook</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
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

      {/* Dynamic Content */}
      <div className="flex-1 p-4 lg:p-6 min-h-0 overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600">
        {panelMode === 'ready' && renderReadyState()}
        {panelMode === 'analysis' && renderAnalysisSection()}
        {(panelMode === 'generating' || panelMode === 'complete') && renderGeneratingSection()}
      </div>
    </div>
  );
}