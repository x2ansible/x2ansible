import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PlayIcon,
  DocumentTextIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/outline";

// --- Interfaces ---

interface ValidationPanelProps {
  playbook?: string;
  validationConfig?: any;
  onLogMessage?: (msg: string) => void;
  onValidationComplete?: (result: ValidationResult) => void;
}

interface ValidationIssue {
  severity?: string;
  message?: string;
  rule?: string;
  filename?: string;
  line?: number;
  column?: number;
  level?: string;
  tag?: string[];
  description?: string;
  [key: string]: any;
}

interface ValidationResult {
  passed: boolean;
  summary: any; // can be string or object depending on backend
  issues: ValidationIssue[];
  raw_output: string | { stdout?: string; stderr?: string };
  debug_info: {
    status?: string;
    playbook_length?: number;
    num_issues?: number;
    error_count?: number;
    warning_count?: number;
    info_count?: number;
    [key: string]: any;
  };
}

// --- Main Panel ---

const ValidationPanel: React.FC<ValidationPanelProps> = ({
  playbook = "",
  validationConfig,
  onLogMessage,
  onValidationComplete,
}) => {
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasValidated, setHasValidated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lintProfile, setLintProfile] = useState<'basic' | 'moderate' | 'production'>('production');
  const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
  const [showRawOutput, setShowRawOutput] = useState(false);
  const hasLoggedInit = useRef(false);

  // Logging utility
  const logMessage = useCallback(
    (message: string) => {
      if (onLogMessage) onLogMessage(message);
      if (process.env.NODE_ENV !== "production") console.log("[ValidationPanel]", message);
    },
    [onLogMessage]
  );

  useEffect(() => {
    if (!hasLoggedInit.current && playbook && playbook.trim()) {
      logMessage("🛡️ Validation Panel initialized");
      hasLoggedInit.current = true;
    }
  }, [logMessage, playbook, validationConfig, onLogMessage, onValidationComplete]);

  // --- UI Helper Functions ---

  const toggleIssueExpansion = (index: number) => {
    setExpandedIssues((prev) => {
      const copy = new Set(prev);
      copy.has(index) ? copy.delete(index) : copy.add(index);
      return copy;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logMessage("📋 Copied to clipboard");
    } catch {
      logMessage("❌ Failed to copy to clipboard");
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'error': case 'high':
        return <XCircleIcon className="w-4 h-4 text-red-400" />;
      case 'warning': case 'medium':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />;
      case 'info': case 'low':
        return <CheckCircleIcon className="w-4 h-4 text-blue-400" />;
      default:
        return <ExclamationTriangleIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'error': case 'high':
        return 'from-red-500/10 to-pink-500/10 border-red-500/30';
      case 'warning': case 'medium':
        return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30';
      case 'info': case 'low':
        return 'from-blue-500/10 to-cyan-500/10 border-blue-500/30';
      default:
        return 'from-slate-500/10 to-slate-600/10 border-slate-500/30';
    }
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'basic': return 'from-green-500 to-emerald-400';
      case 'moderate': return 'from-yellow-500 to-orange-400';
      case 'production': return 'from-red-500 to-pink-400';
      default: return 'from-blue-500 to-cyan-400';
    }
  };

  // --- Validation Action ---

  const handleValidation = async () => {
    if (!playbook || !playbook.trim()) {
      setError("No playbook to validate");
      logMessage("❌ Error: No playbook content");
      return;
    }

    setLoading(true);
    setResult(null);
    setError(null);
    setHasValidated(true);

    const startTime = Date.now();
    try {
      logMessage(`🚀 Starting validation with ${lintProfile} profile...`);
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playbook, lint_profile: lintProfile }),
      });

      let data: ValidationResult;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
        } else {
          throw new Error("Backend did not return JSON");
        }
      } catch (e) {
        setError("Validation API did not return valid JSON. Try again.");
        setLoading(false);
        logMessage(`❌ Validation failed: ${e}`);
        return;
      }

      if (!response.ok) {
        throw new Error(typeof data?.summary === "string" ? data.summary : "Validation failed");
      }

      setResult(data);
      setError(null);
      setLoading(false);

      const issueCount = data.issues?.length || 0;
      const status = data.passed ? "✅ PASSED" : "❌ FAILED";
      logMessage(`${status} Validation completed in ${Date.now() - startTime}ms (${issueCount} issues found)`);
      if (onValidationComplete) onValidationComplete(data);

    } catch (err: any) {
      setError(err?.message || "Unknown validation error occurred.");
      setLoading(false);
      logMessage(`❌ Validation failed: ${err}`);
    }
  };

  // --- Render Functions ---

  // Lint Raw Output
  const renderRawOutput = () => {
    if (!result || !showRawOutput) return null;
    const rawOutput = result.raw_output;

    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-600/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            <span>Raw Lint Output (Debug)</span>
          </h4>
          <button
            onClick={() => copyToClipboard(
              typeof rawOutput === "string"
                ? rawOutput
                : JSON.stringify(rawOutput, null, 2)
            )}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy Output
          </button>
        </div>
        <div className="space-y-4">
          {(!rawOutput || (typeof rawOutput === "string" && rawOutput.trim() === "")) ? (
            <div className="text-xs text-red-300 bg-slate-900/70 rounded p-3 border border-red-500/30">
              No raw lint output was returned by the backend.
            </div>
          ) : (
            <>
              {typeof rawOutput === "object" && (
                <>
                  {rawOutput.stdout && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <h5 className="text-sm font-medium text-green-300">Standard Output</h5>
                      </div>
                      <pre className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900/50 p-3 rounded border border-slate-600/30">
                        {rawOutput.stdout || "[empty]"}
                      </pre>
                    </div>
                  )}
                  {rawOutput.stderr && (
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <h5 className="text-sm font-medium text-red-300">Standard Error</h5>
                      </div>
                      <pre className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900/50 p-3 rounded border border-slate-600/30">
                        {rawOutput.stderr || "[empty]"}
                      </pre>
                    </div>
                  )}
                  {!rawOutput.stdout && !rawOutput.stderr && (
                    <div className="text-xs text-yellow-300 bg-slate-900/70 rounded p-3 border border-yellow-500/30">
                      No stdout or stderr in raw_output.
                    </div>
                  )}
                </>
              )}
              {typeof rawOutput === "string" && rawOutput.trim() && (
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <h5 className="text-sm font-medium text-blue-300">Raw String</h5>
                  </div>
                  <pre className="text-xs text-slate-300 overflow-auto max-h-64 bg-slate-900/50 p-3 rounded border border-slate-600/30">
                    {rawOutput}
                  </pre>
                </div>
              )}
            </>
          )}
          {/* Always show JSON for debugging */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              <h5 className="text-sm font-medium text-purple-300">JSON Representation</h5>
            </div>
            <pre className="text-xs text-slate-300 overflow-auto max-h-48 bg-slate-900/50 p-3 rounded border border-slate-600/30">
              {JSON.stringify(rawOutput, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    );
  };

  // Lint Results Banner + Stats
  const renderValidationSummary = () => {
    if (!result) return null;
    const { passed, issues, debug_info } = result;
    const errorCount = debug_info?.error_count || issues?.filter(i => i.severity?.toLowerCase() === 'error' || i.level?.toLowerCase() === 'error').length || 0;
    const warningCount = debug_info?.warning_count || issues?.filter(i => i.severity?.toLowerCase() === 'warning' || i.level?.toLowerCase() === 'warning').length || 0;
    const infoCount = debug_info?.info_count || issues?.filter(i => i.severity?.toLowerCase() === 'info' || i.level?.toLowerCase() === 'info').length || 0;

    return (
      <div className={`rounded-xl border p-6 ${
        passed 
          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' 
          : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {passed ? (
              <CheckCircleIcon className="w-8 h-8 text-green-400" />
            ) : (
              <XCircleIcon className="w-8 h-8 text-red-400" />
            )}
            <div>
              <h3 className={`font-bold text-xl ${passed ? 'text-green-300' : 'text-red-300'}`}>
                {passed ? 'Validation Passed' : 'Validation Failed'}
              </h3>
              <p className="text-sm text-slate-400">
                Profile: <span className="font-medium">{lintProfile}</span> • 
                Analyzed: <span className="font-medium">{debug_info?.playbook_length || 0}</span> characters
              </p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
            title="Copy full validation result"
          >
            <ClipboardDocumentIcon className="w-5 h-5" />
          </button>
        </div>
        {/* Enhanced Stats Grid */}
        {issues && issues.length > 0 && (
          <>
            <div className="grid grid-cols-4 gap-4 mt-4">
              <div className="text-center p-3 rounded-lg bg-slate-800/50">
                <div className="text-slate-300 text-2xl font-bold">{issues.length}</div>
                <div className="text-xs text-slate-400">Total Issues</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-500/10">
                <div className="text-red-400 text-2xl font-bold">{errorCount}</div>
                <div className="text-xs text-slate-400">Errors</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-yellow-500/10">
                <div className="text-yellow-400 text-2xl font-bold">{warningCount}</div>
                <div className="text-xs text-slate-400">Warnings</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10">
                <div className="text-blue-400 text-2xl font-bold">{infoCount}</div>
                <div className="text-xs text-slate-400">Info</div>
              </div>
            </div>
            {/* Rules Summary */}
            <div className="mt-4 p-4 bg-slate-800/30 rounded-lg">
              <h4 className="text-sm font-semibold text-slate-300 mb-2">Most Common Rules</h4>
              <div className="flex flex-wrap gap-2">
                {Array.from(new Set(issues.map(i => i.rule).filter(Boolean))).slice(0, 5).map((rule, idx) => {
                  const count = issues.filter(i => i.rule === rule).length;
                  return (
                    <span key={idx} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded flex items-center space-x-1">
                      <span>{rule}</span>
                      <span className="bg-slate-600/50 text-slate-400 px-1 rounded">{count}</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Lint Issues (expandable, grouped by file)
  const renderIssues = () => {
    if (!result?.issues || result.issues.length === 0) return null;

    // Group issues by file
    const groupedIssues = result.issues.reduce((acc, issue, idx) => {
      const key = issue.filename || 'General';
      if (!acc[key]) acc[key] = [];
      acc[key].push({ ...issue, originalIndex: idx });
      return acc;
    }, {} as Record<string, any[]>);

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
            <span>Issues Found ({result.issues.length})</span>
          </h4>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => copyToClipboard(result.issues.map(i =>
                `${i.severity?.toUpperCase()}: ${i.message} ${i.filename ? `(${i.filename}:${i.line})` : ''}`
              ).join('\n'))}
              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Copy All Issues
            </button>
            <button
              onClick={() => setExpandedIssues(new Set(result.issues.map((_, idx) => idx)))}
              className="text-xs text-slate-400 hover:text-slate-300 transition-colors"
            >
              Expand All
            </button>
          </div>
        </div>

        <div className="max-h-[600px] overflow-y-auto pr-2 space-y-4">
          {Object.entries(groupedIssues).map(([filename, fileIssues]) => (
            <div key={filename} className="bg-slate-800/30 rounded-lg border border-slate-600/30">
              <div className="p-3 border-b border-slate-600/30 bg-slate-700/30">
                <h5 className="font-medium text-slate-200 flex items-center space-x-2">
                  <DocumentTextIcon className="w-4 h-4 text-slate-400" />
                  <span>{filename}</span>
                  <span className="text-xs bg-slate-600/50 text-slate-400 px-2 py-1 rounded">
                    {fileIssues.length} issue{fileIssues.length !== 1 ? 's' : ''}
                  </span>
                </h5>
              </div>
              
              <div className="p-3 space-y-3">
                {fileIssues.map((issue) => {
                  const isExpanded = expandedIssues.has(issue.originalIndex);
                  const severity = issue.severity || issue.level || 'info';
                  return (
                    <div
                      key={issue.originalIndex}
                      className={`rounded-lg border p-4 bg-gradient-to-r ${getSeverityColor(severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getSeverityIcon(severity)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`text-xs font-medium px-2 py-1 rounded ${
                                severity.toLowerCase() === 'error' ? 'bg-red-500/20 text-red-300' :
                                severity.toLowerCase() === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                                'bg-blue-500/20 text-blue-300'
                              }`}>
                                {severity.toUpperCase()}
                              </span>
                              {issue.rule && (
                                <span className="text-xs text-slate-400 font-mono bg-slate-700/50 px-2 py-1 rounded">
                                  {issue.rule}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-200 mb-3 leading-relaxed">
                              {issue.message || issue.description || 'No description available'}
                            </p>
                            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                              {issue.line && (
                                <span className="flex items-center space-x-1">
                                  <span>📍</span>
                                  <span>Line {issue.line}</span>
                                </span>
                              )}
                              {issue.column && (
                                <span>Column {issue.column}</span>
                              )}
                            </div>
                            {issue.tag && issue.tag.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-3">
                                {issue.tag.map((tag, tagIndex) => (
                                  <span
                                    key={tagIndex}
                                    className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleIssueExpansion(issue.originalIndex)}
                          className="text-slate-400 hover:text-white transition-colors ml-3 p-1"
                        >
                          {isExpanded ? (
                            <ChevronDownIcon className="w-4 h-4" />
                          ) : (
                            <ChevronRightIcon className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      {isExpanded && (
                        <div className="mt-4 pt-4 border-t border-slate-600/30">
                          <div className="bg-slate-800/50 rounded p-3">
                            <h6 className="text-xs font-medium text-slate-400 mb-2">Raw Issue Data</h6>
                            <pre className="text-xs text-slate-300 overflow-x-auto">
                              {JSON.stringify(issue, null, 2)}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // --- Main Render ---

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 rounded-lg p-6 shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheckIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-white font-bold text-xl">Playbook Validation</h2>
            <p className="text-xs text-slate-400">Ansible Lint Analysis</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Cog6ToothIcon className="w-4 h-4 text-slate-400" />
          <select
            value={lintProfile}
            onChange={(e) => setLintProfile(e.target.value as any)}
            disabled={loading}
            className="text-xs rounded-lg border border-slate-600/50 bg-slate-700/50 text-slate-200 px-3 py-2 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors"
          >
            <option value="basic">Basic Profile</option>
            <option value="moderate">Moderate Profile</option>
            <option value="production">Production Profile</option>
          </select>
          <div className={`w-8 h-1 rounded-full bg-gradient-to-r ${getProfileColor(lintProfile)}`}></div>
        </div>
      </div>
      <button
        className={`w-full py-3 rounded-lg font-semibold text-white mb-6 transition-all duration-300 transform ${
          loading
            ? "bg-gradient-to-r from-purple-500/50 to-pink-500/50 cursor-not-allowed scale-95"
            : hasValidated
            ? result?.passed
              ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-105"
              : "bg-gradient-to-r from-red-500 to-pink-500 hover:scale-105"
            : "bg-gradient-to-r from-purple-500 to-pink-500 hover:scale-105"
        }`}
        onClick={handleValidation}
        disabled={loading || !playbook || !playbook.trim()}
      >
        <div className="flex items-center justify-center space-x-2">
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              <span>Validating Playbook...</span>
            </>
          ) : hasValidated ? (
            <>
              <PlayIcon className="w-4 h-4" />
              <span>Re-validate Playbook</span>
            </>
          ) : (
            <>
              <ShieldCheckIcon className="w-4 h-4" />
              <span>Validate Playbook</span>
            </>
          )}
        </div>
      </button>
      {error && (
        <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded-xl">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
            <div>
              <div className="text-red-300 font-medium">Validation Failed</div>
              <div className="text-red-400/80 text-sm mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}
      {!playbook || !playbook.trim() ? (
        <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-600/30">
          <ShieldCheckIcon className="w-16 h-16 text-slate-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No Playbook Available</h3>
          <p className="text-slate-400 mb-4">Generate a playbook first to validate it</p>
          <div className="text-sm text-slate-500">
            Go to the <strong>Convert</strong> step to generate an Ansible playbook
          </div>
        </div>
      ) : result && (
        <div className="space-y-6">
          {renderValidationSummary()}
          {renderIssues()}
          {/* PATCH: Always show lint/tool error at top */}
          {result && !result.passed && (() => {
            // Helper logic for surfacing any error
            if (!result) return null;
            let topLevelError = "";
            if (typeof result.raw_output === "string" && result.raw_output.trim()) {
              topLevelError = result.raw_output;
            }
            if (result.raw_output && typeof result.raw_output === "object") {
              if (result.raw_output.stderr && result.raw_output.stderr.trim())
                topLevelError = result.raw_output.stderr;
              else if (result.raw_output.stdout && result.raw_output.stdout.trim())
                topLevelError = result.raw_output.stdout;
            }
            if (result.error_message) topLevelError = result.error_message;
            if (typeof result.summary === "string" && result.summary.toLowerCase().startsWith("error"))
              topLevelError = result.summary;
            if (!topLevelError) return null;
            return (
              <div className="mb-4 p-4 rounded-lg bg-gradient-to-r from-red-900/80 to-pink-800/60 border border-red-600 flex items-center space-x-3">
                <ExclamationTriangleIcon className="w-6 h-6 text-red-300 flex-shrink-0" />
                <div>
                  <p className="font-bold text-red-200 mb-1">Validation Error</p>
                  <p className="text-red-300 text-sm whitespace-pre-line">
                    {topLevelError.length > 800
                      ? topLevelError.slice(0, 800) + "..."
                      : topLevelError}
                  </p>
                </div>
              </div>
            );
          })()}
          {result.raw_output && (
            <div className="flex items-center justify-between">
              <button
                onClick={() => setShowRawOutput(!showRawOutput)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors flex items-center space-x-2"
              >
                <DocumentTextIcon className="w-4 h-4" />
                <span>{showRawOutput ? 'Hide' : 'Show'} Raw Output</span>
                {showRawOutput ? (
                  <ChevronDownIcon className="w-4 h-4" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4" />
                )}
              </button>
            </div>
          )}
          {renderRawOutput()}
        </div>
      )}
    </div>
  );
};

export default ValidationPanel;
