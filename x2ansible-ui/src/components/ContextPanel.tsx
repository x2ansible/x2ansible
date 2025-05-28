import React, { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { 
  MagnifyingGlassIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon, 
  ClipboardDocumentIcon 
} from "@heroicons/react/24/outline";

interface ContextPanelProps {
  code: string;
  onLogMessage?: (msg: string) => void;
  onContextRetrieved?: (context: string) => void;
}

interface ContextItem {
  text: string;
  type?: string;
  source?: string;
}

interface ContextResult {
  success: boolean;
  context: ContextItem[];
  steps?: any[];
}

const ContextPanel: React.FC<ContextPanelProps> = ({
  code,
  onLogMessage,
  onContextRetrieved,
}) => {
  const [result, setResult] = useState<ContextResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasQueried, setHasQueried] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChunks, setExpandedChunks] = useState<Set<number>>(new Set());
  const hasLoggedInit = useRef(false);

  // Logging utility
  const logMessage = useCallback(
    (message: string) => {
      if (onLogMessage) onLogMessage(message);
      if (process.env.NODE_ENV !== "production") console.log("[ContextPanel]", message);
    },
    [onLogMessage]
  );

  useEffect(() => {
    if (!hasLoggedInit.current && code) {
      logMessage("🔧 Context Panel initialized");
      hasLoggedInit.current = true;
    }
  }, [logMessage, code]);

  const toggleChunkExpansion = (index: number) => {
    setExpandedChunks((prev) => {
      const copy = new Set(prev);
      copy.has(index) ? copy.delete(index) : copy.add(index);
      return copy;
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      logMessage("Copied pattern to clipboard");
    } catch {
      logMessage("Failed to copy to clipboard");
    }
  };

  const handleQuery = async () => {
    if (!code.trim()) {
      setError("No Infrastructure as Code to analyze");
      logMessage("❌ Error: No code to analyze");
      return;
    }
    setLoading(true);
    setResult(null);
    setError(null);
    setHasQueried(true);

    const startTime = Date.now();
    try {
      logMessage("🚀 Sending context query to backend...");
      const resp = await fetch("/api/context/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: code, top_k: 5 }),
      });
      logMessage(`📥 Response: HTTP ${resp.status}`);

      // --- Safe JSON parse with fallback/error ---
      let data: any = null;
      try {
        const contentType = resp.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          data = await resp.json();
        } else {
          const raw = await resp.text();
          throw new Error(`Backend did not return JSON: ${raw.slice(0, 200)}`);
        }
      } catch (e) {
        setError("Context API did not return valid JSON. Try again.");
        setLoading(false);
        logMessage(`❌ Context discovery failed: ${e}`);
        return;
      }

      const duration = Date.now() - startTime;
      if (!resp.ok) {
        throw new Error(data?.detail || `HTTP ${resp.status}`);
      }

      let contextArray: ContextItem[] = [];
      if (Array.isArray(data.context)) {
        contextArray = data.context;
      } else if (typeof data.context === "string") {
        contextArray = [{ text: data.context }];
      } else {
        contextArray = [];
      }

      setResult({ ...data, context: contextArray });
      setError(null);
      setLoading(false);

      logMessage(`✅ Context retrieved in ${duration}ms (${contextArray.length} patterns)`);
      if (contextArray.length && onContextRetrieved) {
        onContextRetrieved(contextArray.map((c) => c.text).join("\n\n"));
      }
    } catch (err: any) {
      setError(err?.message || "Unknown error in context discovery.");
      setLoading(false);
      logMessage(`❌ Context discovery failed: ${err}`);
    }
  };

  // --- FIXED: Markdown components for syntax highlighting (robust, hydration-error-safe) ---
  const markdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || "");
      if (inline) {
        // Inline code (e.g., `code` in text)
        return (
          <code className={className} {...props}>
            {children}
          </code>
        );
      }
      // Block code: only return SyntaxHighlighter (renders <pre><code> itself, never inside <p>)
      return (
        <SyntaxHighlighter
          style={oneDark}
          language={match ? match[1] : ""}
          PreTag="pre"
          customStyle={{
            borderRadius: 8,
            padding: "1em",
            fontSize: "0.92em",
            background: "#23272e"
          }}
          {...props}
        >
          {String(children).replace(/\n$/, "")}
        </SyntaxHighlighter>
      );
    },
  };

  // --- Renders context patterns, with markdown prettified, show more/less ---
  const renderResults = () => {
    if (!result) return null;
    const patterns = result.context || [];
    return (
      <div className="space-y-4 max-h-[32rem] overflow-y-auto pr-2 context-sidebar-scrollbar">
        {patterns.length === 0 && (
          <div className="text-slate-400 text-center p-4">No Conversion Patterns Found</div>
        )}
        {patterns.map((item, i) => {
          const isExpanded = expandedChunks.has(i);
          // Show first 12 lines or 800 chars as preview (whichever is less)
          const lines = item.text?.split("\n") || [];
          const preview =
            lines.slice(0, 12).join("\n").slice(0, 800) +
            ((lines.length > 12 || (item.text?.length ?? 0) > 800) ? "\n\n..." : "");
          const hasMore = lines.length > 12 || (item.text?.length ?? 0) > 800;

          return (
            <div key={i} className="bg-slate-800 rounded border border-slate-600 p-3 mb-2">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-blue-300">
                  Conversion Pattern {i + 1}
                </span>
                <div>
                  {hasMore && (
                    <button
                      className="text-xs mr-2 underline text-blue-400"
                      onClick={() => toggleChunkExpansion(i)}
                    >
                      {isExpanded ? "Show Less" : "Show More"}
                    </button>
                  )}
                  <button
                    onClick={() => copyToClipboard(item.text)}
                    className="text-xs text-blue-400"
                    title="Copy to clipboard"
                  >
                    <ClipboardDocumentIcon className="w-4 h-4 inline" />
                  </button>
                </div>
              </div>
              {/* Pretty markdown! */}
              <div className="mt-2 text-slate-200 text-xs overflow-x-auto prose prose-invert prose-sm max-w-none">
                <ReactMarkdown components={markdownComponents}>
                  {isExpanded || !hasMore ? item.text : preview}
                </ReactMarkdown>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-900 rounded-lg p-6 shadow">
      <div className="flex items-center mb-4">
        <MagnifyingGlassIcon className="w-6 h-6 text-blue-400 mr-2" />
        <h2 className="text-white font-bold text-xl">Context Discovery</h2>
      </div>
      <button
        className={`w-full py-2 rounded-lg font-semibold text-white ${
          loading
            ? "bg-gradient-to-r from-blue-500/50 to-cyan-500/50 cursor-not-allowed"
            : hasQueried
            ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:scale-105"
            : "bg-gradient-to-r from-blue-500 to-cyan-500 hover:scale-105"
        }`}
        onClick={handleQuery}
        disabled={loading || !code.trim()}
      >
        {loading ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"></span>
            Discovering Conversion Patterns...
          </>
        ) : hasQueried ? (
          <>
            <CheckCircleIcon className="w-4 h-4 inline mr-2" />
            Refresh Context
          </>
        ) : (
          <>
            <MagnifyingGlassIcon className="w-4 h-4 inline mr-2" />
            Discover Context
          </>
        )}
      </button>

      {error && (
        <div className="mt-4 p-2 bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/30 rounded">
          <div className="flex items-center space-x-2">
            <ExclamationCircleIcon className="w-4 h-4 text-red-400" />
            <div>
              <div className="text-red-300 font-medium text-xs">Context Discovery Failed</div>
              <div className="text-red-400/80 mt-0.5 text-xs">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* --- Scrollable, pretty, Markdown-aware results panel --- */}
      <div className="mt-6 max-h-[32rem] overflow-y-auto pr-2 context-sidebar-scrollbar">
        {renderResults()}
      </div>
    </div>
  );
};

export default ContextPanel;
