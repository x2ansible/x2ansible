import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  DocumentTextIcon, 
  MagnifyingGlassIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CodeBracketIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
  Bars3BottomLeftIcon,
  Bars3Icon,
  Square2StackIcon
} from "@heroicons/react/24/outline";

interface ContextPanelProps {
  code: string;
  contextConfig?: {
    includeComments?: boolean;
    analyzeDependencies?: boolean;
    environmentType?: 'development' | 'staging' | 'production';
    scanDepth?: 'shallow' | 'medium' | 'deep';
  };
  vectorDbId?: string;
  onLogMessage?: (message: string) => void;
  onContextRetrieved?: (context: string) => void;
}

export default function ContextPanel({ 
  code, 
  contextConfig, 
  vectorDbId = "iac",
  onLogMessage,
  onContextRetrieved
}: ContextPanelProps) {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const [splitView, setSplitView] = useState<'horizontal' | 'vertical' | 'single'>('horizontal');
  const [sourceExpanded, setSourceExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // 🔥 FIX: Use ref to track if we've logged initialization to prevent infinite loops
  const hasLoggedInit = useRef(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 1024);
      if (width < 1024) setSplitView('single');
      else if (width < 1440) setSplitView('horizontal');
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // 🔥 FIX: Stable logging function that won't cause re-renders
  const logMessage = useCallback((message: string) => {
    console.log(`[ContextPanel] ${message}`);
    onLogMessage?.(message);
  }, [onLogMessage]);

  // 🔥 FIX: Only log initialization ONCE using ref
  useEffect(() => {
    if (!hasLoggedInit.current && code && onLogMessage) {
      logMessage("🔧 Context Panel initialized");
      logMessage(`📝 Ready to analyze ${code.length} characters of code`);
      hasLoggedInit.current = true;
    }
  }, [logMessage, code, onLogMessage]);

  const handleQuery = async () => {
    if (!code.trim()) {
      const errorMsg = "No Infrastructure as Code to analyze";
      setError(errorMsg);
      logMessage(`❌ Error: ${errorMsg}`);
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setHasQueried(true);

    const sourceLanguage = getLanguageFromCode(code);
    logMessage(`🚀 Starting context discovery for ${sourceLanguage} code...`);
    logMessage(`⚙️ Config: depth=${contextConfig?.scanDepth || 'medium'}, env=${contextConfig?.environmentType || 'development'}`);

    try {
      const startTime = Date.now();
      
      const requestPayload = {
        query: code,
        top_k: contextConfig?.scanDepth === "deep" ? 10 : contextConfig?.scanDepth === "shallow" ? 3 : 5,
        vector_db_id: vectorDbId
      };
      
      logMessage(`📤 Querying vector DB with top_k=${requestPayload.top_k}`);
      
      const resp = await fetch(`/api/context/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });
      
      logMessage(`📥 Response: HTTP ${resp.status}`);
      
      const data = await resp.json();
      const duration = Date.now() - startTime;
      
      if (!resp.ok) {
        throw new Error(data.detail || `HTTP ${resp.status}`);
      }

      const contextCount = Array.isArray(data.context) ? data.context.length : 0;
      const hasContent = data.context && contextCount > 0;
      
      logMessage(`✅ Context discovery completed in ${duration}ms`);
      logMessage(`📊 Found ${contextCount} conversion pattern${contextCount !== 1 ? 's' : ''}`);
      
      if (hasContent) {
        logMessage(`🎯 Retrieved patterns for ${sourceLanguage} → Ansible conversion`);
        data.context.slice(0, 2).forEach((item: any, index: number) => {
          const preview = typeof item.text === 'string' ? item.text.substring(0, 80) : '';
          logMessage(`📄 Pattern ${index + 1}: ${preview}...`);
        });
      } else {
        logMessage(`⚠️ No relevant patterns found in knowledge base`);
      }
      
      setResult(data);
      
      // 🔥 FIX: Better context passing
      if (hasContent && onContextRetrieved) {
        const contextString = data.context.map((c: any) => c.text || String(c)).join('\n\n');
        logMessage(`🔄 Passing ${contextString.length} chars to next step`);
        onContextRetrieved(contextString);
        logMessage(`✅ Context ready for generation step`);
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Context retrieval failed";
      console.error("Context query error:", err);
      logMessage(`❌ Context discovery failed: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setLoading(false);
      logMessage(`🏁 Context discovery process completed`);
    }
  };

  const toggleChunkExpansion = (index: number) => {
    const newExpanded = new Set(expandedChunks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
      logMessage(`👁️ Collapsed pattern ${index + 1}`);
    } else {
      newExpanded.add(index);
      logMessage(`👁️ Expanded pattern ${index + 1}`);
    }
    setExpandedChunks(newExpanded);
  };

  const getLanguageFromCode = (code: string) => {
    if (code.includes('cookbook') || code.includes('recipe') || code.includes('chef')) return 'Chef';
    if (code.includes('class {') || code.includes('ensure =>') || code.includes('puppet')) return 'Puppet';
    if (code.includes('#!/bin/bash') || code.includes('#!/bin/sh')) return 'Shell Script';
    if (code.includes('terraform {') || code.includes('resource "')) return 'Terraform';
    if (code.includes('package ') && code.includes('action :install')) return 'Chef';
    return 'Infrastructure Code';
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logMessage(`📋 Copied ${type} to clipboard`);
    } catch (err) {
      logMessage(`❌ Failed to copy ${type}`);
    }
  };

  const formatContext = (context: any) => {
    if (!context) return null;
    if (Array.isArray(context)) {
      return context.map((item, i) => {
        const isExpanded = expandedChunks.has(i);
        const preview = typeof item.text === 'string' ? item.text.substring(0, isMobile ? 200 : 400) : '';
        const hasMore = typeof item.text === 'string' && item.text.length > (isMobile ? 200 : 400);
        return (
          <div key={i} className="context-reveal group relative bg-gradient-to-br from-slate-800/60 to-slate-700/40 rounded-lg border border-slate-600/40 hover:border-blue-400/60 transition-all duration-300 overflow-hidden backdrop-blur-sm mb-4">
            {/* Pattern Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-600/30 bg-slate-700/20">
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse shadow-lg"></div>
                  <div className="absolute inset-0 w-2 h-2 bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-ping opacity-75"></div>
                </div>
                <div>
                  <span className="font-semibold text-slate-200 text-base">
                    Conversion Pattern {i + 1}
                  </span>
                  {item.type && (
                    <span className="ml-2 px-2 py-0.5 text-xs bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 rounded-full border border-blue-400/40 backdrop-blur-sm">
                      {item.type}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1">
                {hasMore && (
                  <button
                    onClick={() => toggleChunkExpansion(i)}
                    className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-400 hover:text-blue-300 transition-colors rounded hover:bg-slate-600/30"
                  >
                    <span>{isExpanded ? 'Show Less' : 'Show More'}</span>
                    {isExpanded ? (
                      <ChevronUpIcon className="w-4 h-4" />
                    ) : (
                      <ChevronDownIcon className="w-4 h-4" />
                    )}
                  </button>
                )}
                <button
                  onClick={() => copyToClipboard(item.text, `Pattern ${i + 1}`)}
                  className="p-1 text-slate-400 hover:text-blue-300 transition-colors rounded hover:bg-slate-600/30"
                  title="Copy to clipboard"
                >
                  <ClipboardDocumentIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Pattern Content */}
            <div className="p-3">
              <div className="relative">
                <pre className="text-slate-200 whitespace-pre-wrap font-mono text-xs leading-relaxed bg-slate-900/50 rounded border border-slate-600/20 p-3 min-h-[100px] max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
                  {isExpanded || !hasMore ? item.text : preview + '...'}
                </pre>
                <div className="absolute top-2 right-2">
                  <div className="px-2 py-0.5 text-xs bg-slate-800/80 text-slate-400 rounded border border-slate-600/40 backdrop-blur-sm">
                    {item.text?.includes('ansible') ? 'Ansible' : 
                     item.text?.includes('puppet') ? 'Puppet' : 
                     item.text?.includes('chef') ? 'Chef' : 'Code'}
                  </div>
                </div>
              </div>
            </div>
            {/* Hover glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg"></div>
          </div>
        );
      });
    }
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-600/30 p-3">
        <pre className="text-slate-200 whitespace-pre-wrap font-mono text-xs rh-scrollbar overflow-auto max-h-64">
          {typeof context === 'string' ? context : JSON.stringify(context, null, 2)}
        </pre>
      </div>
    );
  };

  const sourceLanguage = getLanguageFromCode(code);
  const contextCount = result?.context?.length || 0;

  // --- Source Panel with vertical scroll ---
  const renderSourceCode = () => (
    <div className="h-full flex flex-col min-h-[250px]">
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-lg border border-slate-600/40 overflow-hidden backdrop-blur-sm flex-1 flex flex-col">
        {/* Source Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-600/30 bg-slate-700/30">
          <div className="flex items-center space-x-2">
            <CodeBracketIcon className="w-5 h-5 text-slate-400" />
            <span className="font-semibold text-slate-300 text-base">
              Source {sourceLanguage} Code
            </span>
            <div className="px-2 py-0.5 text-xs bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-300 rounded-full border border-orange-400/40">
              {sourceLanguage}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>{code.length.toLocaleString()} chars</span>
              <span>•</span>
              <span>{code.split('\n').length} lines</span>
            </div>
            <button
              onClick={() => copyToClipboard(code, 'source code')}
              className="p-1 text-slate-400 hover:text-blue-300 transition-colors rounded hover:bg-slate-600/30"
              title="Copy source code"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSourceExpanded(!sourceExpanded);
                logMessage(`🔍 ${sourceExpanded ? 'Collapsed' : 'Expanded'} source view`);
              }}
              className="p-1 text-slate-400 hover:text-blue-300 transition-colors rounded hover:bg-slate-600/30"
              title={sourceExpanded ? "Collapse" : "Expand"}
            >
              {sourceExpanded ? (
                <ArrowsPointingInIcon className="w-4 h-4" />
              ) : (
                <ArrowsPointingOutIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        {/* Scrollable Source Content - FIXED VERTICAL SCROLLING */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-3 relative">
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
              <textarea
                className="w-full h-full min-h-[300px] bg-slate-900/60 text-slate-200 font-mono resize-none border border-slate-600/30 rounded p-3 outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors placeholder-slate-500 text-xs leading-relaxed"
                value={code}
                readOnly
                placeholder="Your Infrastructure as Code will appear here..."
              />
              <div className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-slate-800/80 text-slate-400 rounded border border-slate-600/40 backdrop-blur-sm">
                Read-only
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // --- Context Panel with vertical scroll for all patterns ---
  const renderResults = () => {
    if (!result) return null;
    return (
      <div className="h-full flex flex-col min-h-[250px]">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-lg border border-slate-600/40 backdrop-blur-sm flex-1 flex flex-col overflow-hidden">
          {/* Results Header */}
          <div className="p-3 border-b border-slate-600/30 bg-slate-700/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-400 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    Context Retrieved
                  </h3>
                  <p className="text-slate-400 mt-0.5 text-xs">
                    Found {contextCount} pattern{contextCount !== 1 ? 's' : ''} for your {sourceLanguage} code
                  </p>
                </div>
              </div>
              {result.success && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-300 rounded-lg border border-green-400/40 backdrop-blur-sm text-xs">
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Ready</span>
                </div>
              )}
            </div>
          </div>
          {/* Scrollable Conversion Patterns Panel - FIXED VERTICAL SCROLLING */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-3">
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
                {result.context && contextCount > 0 ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between mb-2 sticky top-0 bg-slate-800/80 backdrop-blur-sm rounded p-2 border border-slate-600/30">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-semibold text-slate-200 text-base">
                          Conversion Patterns
                        </h4>
                        <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-300 rounded-full border border-blue-400/40 backdrop-blur-sm">
                          {contextCount} matches
                        </span>
                      </div>
                      <button
                        onClick={() => copyToClipboard(
                          result.context.map((c: any, i: number) => `=== Pattern ${i + 1} ===\n${c.text}`).join('\n\n'),
                          'all patterns'
                        )}
                        className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-400 hover:text-blue-300 transition-colors rounded hover:bg-slate-600/30"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                        <span>Copy All</span>
                      </button>
                    </div>
                    <div className="pb-4">
                      {formatContext(result.context)}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center py-6">
                      <MagnifyingGlassIcon className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                      <h4 className="font-medium text-slate-400 mb-2 text-base">
                        No Conversion Patterns Found
                      </h4>
                      <p className="text-slate-500 max-w-md mx-auto text-xs">
                        No relevant conversion patterns were found in the knowledge base for your {sourceLanguage} code.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Split View Layout with independent scrollbars ---
  const renderSplitView = () => {
    if (splitView === 'single' || isMobile) {
      return (
        <div className="flex-1 p-2 space-y-2 overflow-y-auto rh-scrollbar">
          {renderSourceCode()}
          {renderResults()}
        </div>
      );
    }
    const isHorizontal = splitView === 'horizontal';
    return (
      <div className={`flex-1 flex ${isHorizontal ? 'flex-col' : 'flex-row'} bg-slate-800/10 gap-1`}>
        <div className={`${isHorizontal ? 'h-1/2' : 'w-1/2'} min-h-0 min-w-0`}>
          <div className="h-full p-2">{renderSourceCode()}</div>
        </div>
        {/* Divider */}
        <div className={`${
          isHorizontal 
            ? 'h-1 cursor-row-resize hover:bg-gradient-to-r from-blue-500/30 to-cyan-500/30' 
            : 'w-1 cursor-col-resize hover:bg-gradient-to-b from-blue-500/30 to-cyan-500/30'
        } bg-gradient-to-r from-blue-500/10 to-cyan-500/10 transition-colors duration-200 flex-shrink-0`}>
          <div className={`${isHorizontal ? 'h-full w-full' : 'w-full h-full'} flex items-center justify-center`}>
            <div className={`${
              isHorizontal 
                ? 'w-6 h-1 bg-slate-500/50 rounded-full' 
                : 'h-6 w-1 bg-slate-500/50 rounded-full'
            }`}></div>
          </div>
        </div>
        <div className={`${isHorizontal ? 'h-1/2' : 'w-1/2'} min-h-0 min-w-0`}>
          <div className="h-full p-2 overflow-hidden">{renderResults()}</div>
        </div>
      </div>
    );
  };

  // --- Main Render ---
  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="relative bg-gradient-to-r from-slate-800/90 to-slate-700/60 backdrop-blur-sm border-b border-slate-600/30 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center shadow">
                <MagnifyingGlassIcon className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-ping shadow"></div>
            </div>
            <div>
              <h2 className="font-bold text-gradient-animate text-2xl">
                Context Discovery
              </h2>
              <p className="text-slate-400 mt-1 text-base">
                Finding patterns for {sourceLanguage} → Ansible
              </p>
            </div>
          </div>
          {/* View Controls */}
          {!isMobile && (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1 bg-slate-700/50 rounded p-1 border border-slate-600/40">
                <button
                  onClick={() => {
                    setSplitView('single');
                    logMessage(`🖼️ Changed to single view`);
                  }}
                  className={`p-1 rounded transition-colors ${splitView === 'single' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Single view"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSplitView('horizontal');
                    logMessage(`🖼️ Changed to horizontal split`);
                  }}
                  className={`p-1 rounded transition-colors ${splitView === 'horizontal' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Horizontal split"
                >
                  <Bars3BottomLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSplitView('vertical');
                    logMessage(`🖼️ Changed to vertical split`);
                  }}
                  className={`p-1 rounded transition-colors ${splitView === 'vertical' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Vertical split"
                >
                  <Square2StackIcon className="w-4 h-4" />
                </button>
              </div>
              {/* Configuration Badges */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 rounded border border-slate-600/40">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                  <span className="text-slate-300">
                    Env: <span className="text-blue-300 font-medium">{contextConfig?.environmentType || "Development"}</span>
                  </span>
                </div>
                <div className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 rounded border border-slate-600/40">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-slate-300">
                    Depth: <span className="text-cyan-300 font-medium">{contextConfig?.scanDepth || "Medium"}</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Progress Indicator */}
        <div className="mt-2 flex items-center space-x-3">
          <div className="flex items-center space-x-1 text-xs text-slate-400">
            <div className="flex space-x-1">
              <div className="w-6 h-1 bg-green-400 rounded-full shadow-sm"></div>
              <div className="w-6 h-1 bg-blue-400 rounded-full animate-pulse shadow-sm"></div>
              <div className="w-6 h-1 bg-slate-600 rounded-full"></div>
              <div className="w-6 h-1 bg-slate-600 rounded-full"></div>
              <div className="w-6 h-1 bg-slate-600 rounded-full"></div>
            </div>
            <span className="font-medium">
              Phase 2/5: Context Retrieval
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-3 border-b border-slate-600/20">
        <button
          className={`w-full py-2 rounded-lg font-semibold text-white shadow transition-all duration-300 transform text-base ${
            loading 
              ? "bg-gradient-to-r from-blue-500/50 to-cyan-500/50 cursor-not-allowed scale-95" 
              : !code.trim()
              ? "bg-gradient-to-r from-slate-600 to-slate-700 cursor-not-allowed"
              : hasQueried
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:scale-105 hover:shadow"
              : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 hover:scale-105 hover:shadow pulse-glow"
          }`}
          onClick={handleQuery}
          disabled={loading || !code.trim()}
        >
          <div className="flex items-center justify-center space-x-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Discovering Conversion Patterns...</span>
              </>
            ) : hasQueried ? (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>🔄 Refresh Context</span>
              </>
            ) : (
              <>
                <MagnifyingGlassIcon className="w-4 h-4" />
                <span>🔍 Discover Context</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-3 my-2 p-2 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <ExclamationCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300 font-medium text-xs">Context Discovery Failed</p>
              <p className="text-red-400/80 mt-0.5 text-xs">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Split View Content */}
      {renderSplitView()}
    </div>
  );
}