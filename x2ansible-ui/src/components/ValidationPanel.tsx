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
}

interface ValidationResult {
  passed: boolean;
  summary: string;
  issues: ValidationIssue[];
  raw_output: string;
  debug_info: {
    status: string;
    playbook_length: number;
    num_issues: number;
    [key: string]: any;
  };
}

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
    console.log("🔍 ValidationPanel - Props changed:");
    console.log("  - playbook length:", playbook?.length || 0);
    console.log("  - playbook preview:", playbook?.substring(0, 100) || "EMPTY");
    console.log("  - validationConfig:", validationConfig);
    console.log("  - onLogMessage:", !!onLogMessage);
    console.log("  - onValidationComplete:", !!onValidationComplete);
    
    if (!hasLoggedInit.current && playbook && playbook.trim()) {
      logMessage("🛡️ Validation Panel initialized");
      hasLoggedInit.current = true;
    }
  }, [logMessage, playbook, validationConfig, onLogMessage, onValidationComplete]);

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
      case 'error':
      case 'high':
        return <XCircleIcon className="w-4 h-4 text-red-400" />;
      case 'warning':
      case 'medium':
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />;
      case 'info':
      case 'low':
        return <CheckCircleIcon className="w-4 h-4 text-blue-400" />;
      default:
        return <ExclamationTriangleIcon className="w-4 h-4 text-slate-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'error':
      case 'high':
        return 'from-red-500/10 to-pink-500/10 border-red-500/30';
      case 'warning':
      case 'medium':
        return 'from-yellow-500/10 to-orange-500/10 border-yellow-500/30';
      case 'info':
      case 'low':
        return 'from-blue-500/10 to-cyan-500/10 border-blue-500/30';
      default:
        return 'from-slate-500/10 to-slate-600/10 border-slate-500/30';
    }
  };

  const getProfileColor = (profile: string) => {
    switch (profile) {
      case 'basic':
        return 'from-green-500 to-emerald-400';
      case 'moderate':
        return 'from-yellow-500 to-orange-400';
      case 'production':
        return 'from-red-500 to-pink-400';
      default:
        return 'from-blue-500 to-cyan-400';
    }
  };

  const handleValidation = async () => {
    console.log("🎯 BUTTON CLICKED - handleValidation called!");
    console.log("🔍 Playbook exists:", !!playbook);
    console.log("🔍 Playbook length:", playbook?.length || 0);
    console.log("🔍 Loading state:", loading);
    
    if (!playbook || !playbook.trim()) {
      console.log("❌ No playbook - early return");
      setError("No playbook to validate");
      logMessage("❌ Error: No playbook content");
      return;
    }

    console.log("✅ Starting validation process...");
    setLoading(true);
    setResult(null);
    setError(null);
    setHasValidated(true);

    const startTime = Date.now();
    try {
      logMessage(`🚀 Starting validation with ${lintProfile} profile...`);
      console.log("🔍 Validation Debug:", {
        playbookLength: playbook.length,
        lintProfile,
        playbookPreview: playbook.substring(0, 200) + "..."
      });
      
      const requestBody = { 
        playbook: playbook, 
        lint_profile: lintProfile 
      };
      
      console.log("📨 About to make fetch request...");
      console.log("📨 Request body:", requestBody);
      
      const response = await fetch("/api/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      console.log("📥 Response received:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      logMessage(`📥 Response: HTTP ${response.status}`);

      let data: ValidationResult;
      try {
        const contentType = response.headers.get("content-type");
        console.log("📄 Response content-type:", contentType);
        
        if (contentType && contentType.includes("application/json")) {
          data = await response.json();
          console.log("✅ Parsed JSON response:", data);
        } else {
          const raw = await response.text();
          console.error("❌ Non-JSON response:", raw);
          throw new Error(`Backend did not return JSON: ${raw.slice(0, 200)}`);
        }
      } catch (e) {
        console.error("❌ Failed to parse response:", e);
        setError("Validation API did not return valid JSON. Try again.");
        setLoading(false);
        logMessage(`❌ Validation failed: ${e}`);
        return;
      }

      const duration = Date.now() - startTime;
      
      if (!response.ok) {
        console.error("❌ API Error Response:", data);
        throw new Error(data?.summary || data?.detail || `HTTP ${response.status}`);
      }

      console.log("✅ Validation successful:", data);
      setResult(data);
      setError(null);
      setLoading(false);

      const issueCount = data.issues?.length || 0;
      const status = data.passed ? "✅ PASSED" : "❌ FAILED";
      
      logMessage(`${status} Validation completed in ${duration}ms (${issueCount} issues found)`);
      
      if (onValidationComplete) {
        console.log("📞 Calling onValidationComplete callback");
        onValidationComplete(data);
      } else {
        console.log("⚠️ No onValidationComplete callback provided");
      }

    } catch (err: any) {
      console.error("❌ Validation error:", err);
      setError(err?.message || "Unknown validation error occurred.");
      setLoading(false);
      logMessage(`❌ Validation failed: ${err}`);
    }
  };

  const renderValidationSummary = () => {
    if (!result) return null;

    const { passed, issues, debug_info } = result;
    const errorCount = issues?.filter(i => i.severity?.toLowerCase() === 'error' || i.level?.toLowerCase() === 'error').length || 0;
    const warningCount = issues?.filter(i => i.severity?.toLowerCase() === 'warning' || i.level?.toLowerCase() === 'warning').length || 0;
    const infoCount = issues?.filter(i => i.severity?.toLowerCase() === 'info' || i.level?.toLowerCase() === 'info').length || 0;

    return (
      <div className={`rounded-xl border p-4 ${
        passed 
          ? 'bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/30' 
          : 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-3">
            {passed ? (
              <CheckCircleIcon className="w-6 h-6 text-green-400" />
            ) : (
              <XCircleIcon className="w-6 h-6 text-red-400" />
            )}
            <div>
              <h3 className={`font-bold text-lg ${passed ? 'text-green-300' : 'text-red-300'}`}>
                {passed ? 'Validation Passed' : 'Validation Failed'}
              </h3>
              <p className="text-xs text-slate-400">
                Profile: {lintProfile} • {debug_info?.playbook_length || 0} chars analyzed
              </p>
            </div>
          </div>
          <button
            onClick={() => copyToClipboard(JSON.stringify(result, null, 2))}
            className="text-slate-400 hover:text-white transition-colors"
            title="Copy validation result"
          >
            <ClipboardDocumentIcon className="w-5 h-5" />
          </button>
        </div>

        {issues && issues.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div className="text-center">
              <div className="text-red-400 text-2xl font-bold">{errorCount}</div>
              <div className="text-xs text-slate-400">Errors</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-400 text-2xl font-bold">{warningCount}</div>
              <div className="text-xs text-slate-400">Warnings</div>
            </div>
            <div className="text-center">
              <div className="text-blue-400 text-2xl font-bold">{infoCount}</div>
              <div className="text-xs text-slate-400">Info</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderIssues = () => {
    if (!result?.issues || result.issues.length === 0) return null;

    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-white flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />
            <span>Issues Found ({result.issues.length})</span>
          </h4>
          <button
            onClick={() => copyToClipboard(result.issues.map(i => `${i.severity}: ${i.message}`).join('\n'))}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy All Issues
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto pr-2 space-y-2">
          {result.issues.map((issue, index) => {
            const isExpanded = expandedIssues.has(index);
            const severity = issue.severity || issue.level || 'info';
            
            return (
              <div
                key={index}
                className={`rounded-lg border p-3 bg-gradient-to-r ${getSeverityColor(severity)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {getSeverityIcon(severity)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          severity.toLowerCase() === 'error' ? 'bg-red-500/20 text-red-300' :
                          severity.toLowerCase() === 'warning' ? 'bg-yellow-500/20 text-yellow-300' :
                          'bg-blue-500/20 text-blue-300'
                        }`}>
                          {severity.toUpperCase()}
                        </span>
                        {issue.rule && (
                          <span className="text-xs text-slate-400 font-mono">
                            {issue.rule}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-200 mb-2">
                        {issue.message || issue.description || 'No description available'}
                      </p>

                      {(issue.line || issue.column || issue.filename) && (
                        <div className="flex items-center space-x-4 text-xs text-slate-400">
                          {issue.filename && (
                            <span>📄 {issue.filename}</span>
                          )}
                          {issue.line && (
                            <span>Line {issue.line}</span>
                          )}
                          {issue.column && (
                            <span>Col {issue.column}</span>
                          )}
                        </div>
                      )}

                      {issue.tag && issue.tag.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
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
                    onClick={() => toggleIssueExpansion(index)}
                    className="text-slate-400 hover:text-white transition-colors ml-2"
                  >
                    {isExpanded ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-600/30">
                    <pre className="text-xs text-slate-300 overflow-x-auto bg-slate-800/50 p-2 rounded">
                      {JSON.stringify(issue, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderRawOutput = () => {
    if (!result?.raw_output || !showRawOutput) return null;

    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-600/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white flex items-center space-x-2">
            <DocumentTextIcon className="w-4 h-4 text-slate-400" />
            <span>Raw Lint Output</span>
          </h4>
          <button
            onClick={() => copyToClipboard(result.raw_output)}
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            Copy Output
          </button>
        </div>
        <pre className="text-xs text-slate-300 overflow-auto max-h-64 bg-slate-900/50 p-3 rounded border">
          {result.raw_output}
        </pre>
      </div>
    );
  };

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

        {/* Lint Profile Selector */}
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

      {/* Validation Button */}
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
        onClick={(e) => {
          console.log("🎯 BUTTON CLICKED EVENT!");
          console.log("🔍 Event:", e);
          console.log("🔍 Button disabled:", loading || !playbook || !playbook.trim());
          console.log("🔍 Loading:", loading);
          console.log("🔍 Playbook exists:", !!playbook);
          console.log("🔍 Playbook length:", playbook?.length || 0);
          e.preventDefault();
          handleValidation();
        }}
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

      {/* Error Display */}
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

      {/* Results Section */}
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
          
          {/* Raw Output Toggle */}
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