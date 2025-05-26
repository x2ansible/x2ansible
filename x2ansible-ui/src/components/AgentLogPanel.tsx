import React, { useEffect, useRef } from 'react';
import { 
  ClockIcon, 
  TrashIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  InformationCircleIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

interface AgentLogPanelProps {
  logMessages: string[];
  setLogMessages: (messages: string[]) => void;
}

export default function AgentLogPanel({ logMessages, setLogMessages }: AgentLogPanelProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [logMessages]);

  const clearLogs = () => {
    setLogMessages([]);
  };

  const getLogIcon = (message: string) => {
    if (message.includes('❌')) return { icon: '🔴', color: 'text-red-400' };
    if (message.includes('✅')) return { icon: '🟢', color: 'text-green-400' };
    if (message.includes('🔍')) return { icon: '🔵', color: 'text-blue-400' };
    if (message.includes('📊')) return { icon: '📊', color: 'text-purple-400' };
    if (message.includes('📋')) return { icon: '📋', color: 'text-yellow-400' };
    if (message.includes('🎯')) return { icon: '🎯', color: 'text-orange-400' };
    if (message.includes('📄')) return { icon: '📄', color: 'text-cyan-400' };
    return { icon: '⚪', color: 'text-slate-400' };
  };

  const formatLogMessage = (message: string) => {
    // Remove timestamp if it exists at the beginning
    const cleanMessage = message.replace(/^\[\d{1,2}:\d{2}:\d{2}\s*(AM|PM)?\]\s*/, '');
    return cleanMessage;
  };

  const getLogType = (message: string) => {
    if (message.includes('❌') || message.includes('Error') || message.includes('Failed')) return 'error';
    if (message.includes('✅') || message.includes('completed') || message.includes('Success')) return 'success';
    if (message.includes('🔍') || message.includes('Starting')) return 'info';
    if (message.includes('📊') || message.includes('parameters')) return 'debug';
    return 'default';
  };

  const formatTime = (timestamp?: Date) => {
    const now = timestamp || new Date();
    return now.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-l border-slate-600/30 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-600/30 bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-400 rounded-lg flex items-center justify-center shadow-lg">
              <ClockIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Agent Log</h3>
              <p className="text-xs text-slate-400">Real-time activity</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-2 px-2 py-1 bg-slate-700/50 rounded-md border border-slate-600/40">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-slate-300">{logMessages.length}</span>
            </div>
            <button
              onClick={clearLogs}
              className="p-1.5 text-slate-400 hover:text-red-300 transition-colors rounded-md hover:bg-slate-700/50"
              title="Clear logs"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Log Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2">
        {logMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-800/50 rounded-xl flex items-center justify-center mb-4">
              <MagnifyingGlassIcon className="w-8 h-8 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm font-medium mb-2">No Activity Yet</p>
            <p className="text-slate-500 text-xs max-w-xs">
              Agent logs will appear here when you start the context discovery process.
            </p>
          </div>
        ) : (
          logMessages.map((message, index) => {
            const { icon, color } = getLogIcon(message);
            const logType = getLogType(message);
            const cleanMessage = formatLogMessage(message);
            const timestamp = formatTime();

            return (
              <div
                key={index}
                className={`group relative flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 hover:bg-slate-800/30 ${
                  logType === 'error' 
                    ? 'bg-red-500/5 border border-red-500/20' 
                    : logType === 'success'
                    ? 'bg-green-500/5 border border-green-500/20'
                    : logType === 'info'
                    ? 'bg-blue-500/5 border border-blue-500/20'
                    : 'bg-slate-800/20 border border-slate-600/20'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                    logType === 'error' 
                      ? 'bg-red-500/20' 
                      : logType === 'success'
                      ? 'bg-green-500/20'
                      : logType === 'info'
                      ? 'bg-blue-500/20'
                      : 'bg-slate-700/50'
                  }`}>
                    <span className={color}>{icon}</span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <p className={`text-sm font-mono leading-relaxed ${
                      logType === 'error' 
                        ? 'text-red-200' 
                        : logType === 'success'
                        ? 'text-green-200'
                        : logType === 'info'
                        ? 'text-blue-200'
                        : 'text-slate-200'
                    }`}>
                      {cleanMessage}
                    </p>
                    <span className="text-xs text-slate-500 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {timestamp}
                    </span>
                  </div>
                </div>

                {/* Indicator */}
                <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-r ${
                  logType === 'error' 
                    ? 'bg-gradient-to-b from-red-500 to-red-600' 
                    : logType === 'success'
                    ? 'bg-gradient-to-b from-green-500 to-green-600'
                    : logType === 'info'
                    ? 'bg-gradient-to-b from-blue-500 to-blue-600'
                    : 'bg-gradient-to-b from-slate-500 to-slate-600'
                }`}></div>
              </div>
            );
          })
        )}
        <div ref={logEndRef} />
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-slate-600/30 bg-slate-800/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              <span className="text-slate-400">
                {logMessages.filter(msg => getLogType(msg) === 'success').length} Success
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-red-400 rounded-full"></div>
              <span className="text-slate-400">
                {logMessages.filter(msg => getLogType(msg) === 'error').length} Errors
              </span>
            </div>
          </div>
          <div className="text-slate-500">
            {logMessages.length > 0 && `Last: ${formatTime()}`}
          </div>
        </div>
      </div>
    </div>
  );
}