"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { 
  ChevronDownIcon, 
  ChevronUpIcon, 
  ShieldCheckIcon, 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  XCircleIcon,
  InformationCircleIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  CodeBracketIcon,
  SparklesIcon,
  ClipboardDocumentIcon,
  Bars3BottomLeftIcon,
  Square2StackIcon,
  DocumentTextIcon,
  BugAntIcon,
  LightBulbIcon,
  CpuChipIcon
} from "@heroicons/react/24/outline";

// --- Define UI types ---
interface ValidationIssue {
  type: 'error' | 'warning' | 'info' | 'suggestion';
  severity: 'high' | 'medium' | 'low';
  rule: string;
  message: string;
  line?: number;
  column?: number;
  file?: string;
  description?: string;
  suggestion?: string;
}

interface ValidationResult {
  success: boolean;
  issues: ValidationIssue[];
  summary: {
    total: number;
    errors: number;
    warnings: number;
    info: number;
    suggestions: number;
  };
  score?: number;
  duration?: number;
}

interface ValidationPanelProps {
  playbook: string;
  validationConfig?: {
    checkSyntax?: boolean;
    securityScan?: boolean;
    performanceCheck?: boolean;
    bestPractices?: boolean;
    customRules?: string[];
  };
  onLogMessage?: (message: string) => void;
  onValidationComplete?: (result: ValidationResult) => void;
}
export default function ValidationPanel({ 
  playbook, 
  validationConfig,
  onLogMessage,
  onValidationComplete
}: ValidationPanelProps) {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [splitView, setSplitView] = useState<'horizontal' | 'vertical' | 'single'>('horizontal');
  const [playbookExpanded, setPlaybookExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
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

  const logMessage = useCallback((message: string) => {
    console.log(`[ValidationPanel] ${message}`);
    onLogMessage?.(message);
  }, [onLogMessage]);

  useEffect(() => {
    if (!hasLoggedInit.current && playbook && playbook.length > 0 && onLogMessage) {
      logMessage("🛡️ Validation Panel initialized");
      logMessage(`📋 Ready to validate ${playbook.length} characters of Ansible playbook`);
      hasLoggedInit.current = true;
    }
  }, [logMessage, playbook, onLogMessage]);
  // --- PATCHED: Real API call to /api/validate ---
  const handleValidation = async () => {
    if (!playbook || !playbook.trim()) {
      const errorMsg = "No Ansible playbook to validate";
      setError(errorMsg);
      logMessage(`❌ Error: ${errorMsg}`);
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setHasValidated(true);

    logMessage(`🚀 Starting Ansible playbook validation...`);
    logMessage(`⚙️ Config: syntax=${validationConfig?.checkSyntax}, security=${validationConfig?.securityScan}, performance=${validationConfig?.performanceCheck}`);

    try {
      const startTime = Date.now();

      // --- REAL API call here ---
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playbook: playbook,
          lint_profile: "production" // Or use a field from config if you support profiles
        }),
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Validation API error: ${errorText}`);
      }

      const apiResult = await response.json();

      // Map API result to UI result
      const mappedResult: ValidationResult = {
        success: apiResult.passed,
        issues: (apiResult.issues || []).map((issue: any) => ({
          type: issue.type || 'error',
          severity: issue.severity || 'medium',
          rule: issue.rule || '',
          message: issue.message || (typeof issue === "string" ? issue : ""),
          line: issue.line,
          column: issue.column,
          file: issue.file,
          description: issue.description,
          suggestion: issue.suggestion,
        })),
        summary: {
          total: apiResult.issues ? apiResult.issues.length : 0,
          errors: (apiResult.issues || []).filter((i: any) => i.type === "error").length,
          warnings: (apiResult.issues || []).filter((i: any) => i.type === "warning").length,
          info: (apiResult.issues || []).filter((i: any) => i.type === "info").length,
          suggestions: (apiResult.issues || []).filter((i: any) => i.type === "suggestion").length,
        },
        score: typeof apiResult.score === "number"
          ? apiResult.score
          : 100 - ((apiResult.issues || []).length * 10),
        duration
      };

      logMessage(`✅ Validation completed in ${duration}ms`);
      logMessage(`📊 Found ${mappedResult.summary.total} issues: ${mappedResult.summary.errors} errors, ${mappedResult.summary.warnings} warnings`);
      logMessage(`🎯 Playbook quality score: ${mappedResult.score}/100`);

      if (mappedResult.summary.errors > 0) {
        logMessage(`🚨 ${mappedResult.summary.errors} critical error(s) found - playbook may not execute`);
      }

      setResult(mappedResult);
      onValidationComplete?.(mappedResult);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Validation failed";
      console.error("Validation error:", err);
      logMessage(`❌ Validation failed: ${errorMessage}`);
      setError(errorMessage);
    } finally {
      setLoading(false);
      logMessage(`🏁 Validation process completed`);
    }
  };
  const toggleIssueExpansion = (index: number) => {
    const newExpanded = new Set(expandedIssues);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
      logMessage(`👁️ Collapsed issue ${index + 1}`);
    } else {
      newExpanded.add(index);
      logMessage(`👁️ Expanded issue ${index + 1}`);
    }
    setExpandedIssues(newExpanded);
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logMessage(`📋 Copied ${type} to clipboard`);
    } catch (err) {
      logMessage(`❌ Failed to copy ${type}`);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircleIcon className="w-5 h-5 text-red-400" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />;
      case 'info': return <InformationCircleIcon className="w-5 h-5 text-blue-400" />;
      case 'suggestion': return <LightBulbIcon className="w-5 h-5 text-green-400" />;
      default: return <BugAntIcon className="w-5 h-5 text-slate-400" />;
    }
  };

  const getIssueColor = (type: string, severity: string) => {
    if (type === 'error') return 'from-red-500/20 to-pink-500/20 border-red-500/40';
    if (type === 'warning' && severity === 'high') return 'from-orange-500/20 to-red-500/20 border-orange-500/40';
    if (type === 'warning') return 'from-yellow-500/20 to-orange-500/20 border-yellow-500/40';
    if (type === 'info') return 'from-blue-500/20 to-cyan-500/20 border-blue-500/40';
    if (type === 'suggestion') return 'from-green-500/20 to-emerald-500/20 border-green-500/40';
    return 'from-slate-500/20 to-slate-600/20 border-slate-500/40';
  };

  const getSeverityBadgeColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/20 text-red-300 border-red-400/40';
      case 'medium': return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40';
      case 'low': return 'bg-blue-500/20 text-blue-300 border-blue-400/40';
      default: return 'bg-slate-500/20 text-slate-300 border-slate-400/40';
    }
  };

  const getFilteredIssues = () => {
    if (!result?.issues) return [];
    return result.issues.filter(issue => {
      const typeMatch = selectedType === 'all' || issue.type === selectedType;
      const severityMatch = selectedSeverity === 'all' || issue.severity === selectedSeverity;
      return typeMatch && severityMatch;
    });
  };

  const formatIssues = (issues: ValidationIssue[]) => {
    const filteredIssues = getFilteredIssues();
    
    if (filteredIssues.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center py-6">
            <CheckCircleIcon className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h4 className="font-medium text-slate-400 mb-2 text-base">
              {selectedType === 'all' && selectedSeverity === 'all' 
                ? 'No Issues Found' 
                : 'No Issues Match Current Filters'}
            </h4>
            <p className="text-slate-500 max-w-md mx-auto text-xs">
              {selectedType === 'all' && selectedSeverity === 'all' 
                ? 'Your Ansible playbook passed all validation checks!'
                : 'Try adjusting your filters to see more issues.'}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {filteredIssues.map((issue, index) => {
          const isExpanded = expandedIssues.has(index);
          return (
            <div 
              key={index} 
              className={`issue-reveal group relative bg-gradient-to-br ${getIssueColor(issue.type, issue.severity)} rounded-lg border overflow-hidden backdrop-blur-sm hover:shadow-lg transition-all duration-300`}
            >
              {/* Issue Header */}
              <div className="flex items-center justify-between p-3 border-b border-slate-600/30 bg-slate-700/20">
                <div className="flex items-center space-x-3">
                  {getIssueIcon(issue.type)}
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-semibold text-slate-200 text-sm">
                        {issue.message}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full border backdrop-blur-sm ${getSeverityBadgeColor(issue.severity)}`}>
                        {issue.severity}
                      </span>
                    </div>
                    <div className="flex items-center space-x-3 text-xs text-slate-400">
                      <span className="font-mono bg-slate-700/50 px-2 py-0.5 rounded">
                        {issue.rule}
                      </span>
                      {issue.line && (
                        <span>Line {issue.line}{issue.column ? `:${issue.column}` : ''}</span>
                      )}
                      {issue.file && (
                        <span>{issue.file}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => copyToClipboard(issue.message, 'issue message')}
                    className="p-1 text-slate-400 hover:text-blue-300 transition-colors rounded hover:bg-slate-600/30"
                    title="Copy issue"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4" />
                  </button>
                  {(issue.description || issue.suggestion) && (
                    <button
                      onClick={() => toggleIssueExpansion(index)}
                      className="flex items-center space-x-1 px-2 py-1 text-xs text-slate-400 hover:text-blue-300 transition-colors rounded hover:bg-slate-600/30"
                    >
                      <span>{isExpanded ? 'Less' : 'More'}</span>
                      {isExpanded ? (
                        <ChevronUpIcon className="w-4 h-4" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Expanded Issue Details */}
              {isExpanded && (issue.description || issue.suggestion) && (
                <div className="p-3 space-y-3 bg-slate-800/30">
                  {issue.description && (
                    <div>
                      <h5 className="text-xs font-medium text-slate-300 mb-1 flex items-center space-x-1">
                        <InformationCircleIcon className="w-3 h-3" />
                        <span>Description</span>
                      </h5>
                      <p className="text-xs text-slate-400 leading-relaxed bg-slate-900/30 rounded p-2 border border-slate-600/20">
                        {issue.description}
                      </p>
                    </div>
                  )}
                  {issue.suggestion && (
                    <div>
                      <h5 className="text-xs font-medium text-green-300 mb-1 flex items-center space-x-1">
                        <LightBulbIcon className="w-3 h-3" />
                        <span>Suggestion</span>
                      </h5>
                      <p className="text-xs text-green-400/80 leading-relaxed bg-green-900/20 rounded p-2 border border-green-500/20">
                        {issue.suggestion}
                      </p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-lg"></div>
            </div>
          );
        })}
      </div>
    );
  };

  // --- Playbook Panel with vertical scroll ---
  const renderPlaybookCode = () => (
    <div className="h-full flex flex-col min-h-[250px]">
      <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-lg border border-slate-600/40 overflow-hidden backdrop-blur-sm flex-1 flex flex-col">
        {/* Playbook Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-slate-600/30 bg-slate-700/30">
          <div className="flex items-center space-x-2">
            <CodeBracketIcon className="w-5 h-5 text-slate-400" />
            <span className="font-semibold text-slate-300 text-base">
              Generated Ansible Playbook
            </span>
            <div className="px-2 py-0.5 text-xs bg-gradient-to-r from-red-500/20 to-pink-500/20 text-red-300 rounded-full border border-red-400/40">
              YAML
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <span>{(playbook || "").length.toLocaleString()} chars</span>
              <span>•</span>
              <span>{(playbook || "").split('\n').length} lines</span>
            </div>
            <button
              onClick={() => copyToClipboard(playbook || "", 'playbook')}
              className="p-1 text-slate-400 hover:text-blue-300 transition-colors rounded hover:bg-slate-600/30"
              title="Copy playbook"
            >
              <ClipboardDocumentIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setPlaybookExpanded(!playbookExpanded);
                logMessage(`🔍 ${playbookExpanded ? 'Collapsed' : 'Expanded'} playbook view`);
              }}
              className="p-1 text-slate-400 hover:text-blue-300 transition-colors rounded hover:bg-slate-600/30"
              title={playbookExpanded ? "Collapse" : "Expand"}
            >
              {playbookExpanded ? (
                <ArrowsPointingInIcon className="w-4 h-4" />
              ) : (
                <ArrowsPointingOutIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        {/* Scrollable Playbook Content */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full p-3 relative">
            <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
              <textarea
                className="w-full h-full min-h-[300px] bg-slate-900/60 text-slate-200 font-mono resize-none border border-slate-600/30 rounded p-3 outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors placeholder-slate-500 text-xs leading-relaxed"
                value={playbook || ""}
                readOnly
                placeholder="Generated Ansible playbook will appear here..."
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

  // --- Validation Results Panel ---
  const renderResults = () => {
    if (!result) return null;
    
    return (
      <div className="h-full flex flex-col min-h-[250px]">
        <div className="bg-gradient-to-br from-slate-800/80 to-slate-700/60 rounded-lg border border-slate-600/40 backdrop-blur-sm flex-1 flex flex-col overflow-hidden">
          {/* Results Header */}
          <div className="p-3 border-b border-slate-600/30 bg-slate-700/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className={`w-8 h-8 bg-gradient-to-br ${
                  result.summary.errors > 0 ? 'from-red-500 to-pink-400' :
                  result.summary.warnings > 0 ? 'from-yellow-500 to-orange-400' :
                  'from-green-500 to-emerald-400'
                } rounded-lg flex items-center justify-center`}>
                  <ShieldCheckIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    Validation Results
                  </h3>
                  <p className="text-slate-400 mt-0.5 text-xs">
                    {result.summary.total} issue{result.summary.total !== 1 ? 's' : ''} found • Score: {result.score}/100
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {result.score && (
                  <div className={`px-3 py-1 rounded-lg border backdrop-blur-sm text-sm font-semibold ${
                    result.score >= 90 ? 'bg-green-500/20 text-green-300 border-green-400/40' :
                    result.score >= 70 ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40' :
                    'bg-red-500/20 text-red-300 border-red-400/40'
                  }`}>
                    {result.score}/100
                  </div>
                )}
              </div>
            </div>
            
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-center">
                <div className="text-red-300 font-bold text-lg">{result.summary.errors}</div>
                <div className="text-red-400/80 text-xs">Errors</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-center">
                <div className="text-yellow-300 font-bold text-lg">{result.summary.warnings}</div>
                <div className="text-yellow-400/80 text-xs">Warnings</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-center">
                <div className="text-blue-300 font-bold text-lg">{result.summary.info}</div>
                <div className="text-blue-400/80 text-xs">Info</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded p-2 text-center">
                <div className="text-green-300 font-bold text-lg">{result.summary.suggestions}</div>
                <div className="text-green-400/80 text-xs">Suggestions</div>
              </div>
            </div>
            
            {/* Filters */}
            <div className="flex items-center space-x-3 mt-3">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="text-xs bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-slate-200 focus:border-blue-400/50"
              >
                <option value="all">All Types</option>
                <option value="error">Errors</option>
                <option value="warning">Warnings</option>
                <option value="info">Info</option>
                <option value="suggestion">Suggestions</option>
              </select>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}  
                className="text-xs bg-slate-700/50 border border-slate-600/50 rounded px-2 py-1 text-slate-200 focus:border-blue-400/50"
              >
                <option value="all">All Severity</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          
          {/* Scrollable Issues Panel */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full p-3">
              <div className="h-full overflow-y-auto scrollbar-thin scrollbar-track-slate-800 scrollbar-thumb-slate-600 hover:scrollbar-thumb-slate-500">
                <div className="pb-4">
                  {formatIssues(result.issues)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- Split View Layout ---
  const renderSplitView = () => {
    if (splitView === 'single' || isMobile) {
      return (
        <div className="flex-1 p-2 space-y-2 overflow-y-auto rh-scrollbar">
          {renderPlaybookCode()}
          {renderResults()}
        </div>
      );
    }
    const isHorizontal = splitView === 'horizontal';
    return (
      <div className={`flex-1 flex ${isHorizontal ? 'flex-col' : 'flex-row'} bg-slate-800/10 gap-1`}>
        <div className={`${isHorizontal ? 'h-1/2' : 'w-1/2'} min-h-0 min-w-0`}>
          <div className="h-full p-2">{renderPlaybookCode()}</div>
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
              <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-400 rounded-lg flex items-center justify-center shadow">
                <ShieldCheckIcon className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-400 rounded-full animate-ping shadow"></div>
            </div>
            <div>
              <h2 className="font-bold text-white text-2xl">
                Validation & Linting
              </h2>
              <p className="text-slate-400 mt-1 text-base">
                Analyzing Ansible playbook quality
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
                  className={`p-1 rounded transition-colors ${splitView === 'single' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Single view"
                >
                  <DocumentTextIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSplitView('horizontal');
                    logMessage(`🖼️ Changed to horizontal split`);
                  }}
                  className={`p-1 rounded transition-colors ${splitView === 'horizontal' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Horizontal split"
                >
                  <Bars3BottomLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setSplitView('vertical');
                    logMessage(`🖼️ Changed to vertical split`);
                  }}
                  className={`p-1 rounded transition-colors ${splitView === 'vertical' ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-white'}`}
                  title="Vertical split"
                >
                  <Square2StackIcon className="w-4 h-4" />
                </button>
              </div>
              {/* Status Badges */}
              <div className="flex items-center space-x-2 text-xs">
                <div className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 rounded border border-slate-600/40">
                  <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
                  <span className="text-slate-300">
                    Quality: <span className="text-purple-300 font-medium">
                      {result?.score ? `${result.score}/100` : 'Pending'}
                    </span>
                  </span>
                </div>
                <div className="flex items-center space-x-1 px-2 py-1 bg-slate-700/50 rounded border border-slate-600/40">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-slate-300">
                    Issues: <span className="text-cyan-300 font-medium">
                      {result?.summary.total || 0}
                    </span>
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
              <div className="w-6 h-1 bg-green-400 rounded-full shadow-sm"></div>
              <div className="w-6 h-1 bg-green-400 rounded-full shadow-sm"></div>
              <div className="w-6 h-1 bg-purple-400 rounded-full animate-pulse shadow-sm"></div>
              <div className="w-6 h-1 bg-slate-600 rounded-full"></div>
            </div>
            <span className="font-medium">
              Phase 4/5: Validation & Linting
            </span>
          </div>
        </div>
      </div>

      {/* Action Button */}
      <div className="p-3 border-b border-slate-600/20">
        <button
          className={`w-full py-2 rounded-lg font-semibold text-white shadow transition-all duration-300 transform text-base ${
            loading 
              ? "bg-gradient-to-r from-purple-500/50 to-pink-500/50 cursor-not-allowed scale-95" 
              : !playbook || !playbook.trim()
              ? "bg-gradient-to-r from-slate-600 to-slate-700 cursor-not-allowed"
              : hasValidated
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 hover:scale-105 hover:shadow"
              : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105 hover:shadow pulse-glow"
          }`}
          onClick={handleValidation}
          disabled={loading || !playbook || !playbook.trim()}
        >
          <div className="flex items-center justify-center space-x-2">
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Validating Playbook...</span>
              </>
            ) : hasValidated ? (
              <>
                <CheckCircleIcon className="w-4 h-4" />
                <span>🔄 Re-validate Playbook</span>
              </>
            ) : (
              <>
                <ShieldCheckIcon className="w-4 h-4" />
                <span>🛡️ Validate Playbook</span>
              </>
            )}
          </div>
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-3 my-2 p-2 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-lg backdrop-blur-sm">
          <div className="flex items-center space-x-2">
            <XCircleIcon className="w-4 h-4 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-300 font-medium text-xs">Validation Failed</p>
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
