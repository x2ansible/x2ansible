// src/components/AgentLogPanel.tsx
"use client";

interface AgentLogPanelProps {
  logMessages: string[];
  setLogMessages: (messages: string[]) => void;
}

export default function AgentLogPanel({ logMessages, setLogMessages }: AgentLogPanelProps) {
  return (
    <div className="bg-gray-800 dark:bg-gray-800 border border-gray-600 dark:border-gray-600 rounded-lg shadow-sm flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-600 dark:border-gray-600 bg-gray-700 dark:bg-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <h2 className="text-sm font-semibold text-white dark:text-white">Agent Log</h2>
        </div>
        <button
          onClick={() => setLogMessages([])}
          className="text-xs text-gray-300 hover:text-white dark:text-gray-300 dark:hover:text-white px-2 py-1 hover:bg-gray-600 dark:hover:bg-gray-600 rounded transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-0 overflow-hidden">
        <div className="h-full bg-gray-900 dark:bg-gray-900 text-gray-100 dark:text-gray-100 relative">
          <div className="absolute inset-0 overflow-auto rh-scrollbar">
            <div className="p-4 space-y-1 min-w-max">
              {logMessages.length === 0 ? (
                <div className="text-gray-400 dark:text-gray-400 text-sm italic py-8 text-center">
                  No log messages yet...
                </div>
              ) : (
                logMessages.map((log, i) => (
                  <div 
                    key={i} 
                    className="text-sm font-mono text-gray-100 dark:text-gray-100 hover:bg-gray-800 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors whitespace-nowrap"
                  >
                    • {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}