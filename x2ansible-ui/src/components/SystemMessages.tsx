// src/components/SystemMessages.tsx
"use client";

interface SystemMessagesProps {
  messages: string[];
}

export default function SystemMessages({ messages }: SystemMessagesProps) {
  if (messages.length === 0) return null;

  return (
    <div className="mt-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-blue-100 dark:bg-blue-900/30 border-b border-blue-200 dark:border-blue-700">
        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 flex items-center gap-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          System Messages ({messages.length})
        </h4>
      </div>
      
      {/* Scrollable content */}
      <div className="max-h-32 overflow-auto rh-scrollbar bg-blue-25 dark:bg-blue-950/20">
        <div className="p-4 space-y-2">
          {messages.map((msg, i) => (
            <div key={i} className="text-sm text-blue-800 dark:text-blue-300 flex items-start gap-2">
              <span className="text-blue-500 dark:text-blue-400 font-bold mt-0.5">•</span>
              <span className="flex-1">{msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}