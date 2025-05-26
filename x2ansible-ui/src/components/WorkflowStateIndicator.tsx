// src/components/WorkflowStateIndicator.tsx
"use client";

interface WorkflowStateIndicatorProps {
  workflowSummary: {
    currentStep: number;
    completedSteps: number;
    totalSteps: number;
    totalLogs: number;
    lastModified: number;
  };
  onReset: () => void;
}

export default function WorkflowStateIndicator({ workflowSummary, onReset }: WorkflowStateIndicatorProps) {
  const progress = (workflowSummary.completedSteps / workflowSummary.totalSteps) * 100;
  
  return (
    <div className="mb-4 bg-gray-800 border border-gray-600 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm text-gray-300">
          Workflow Progress: {workflowSummary.completedSteps}/{workflowSummary.totalSteps} steps completed
        </div>
        <button
          onClick={onReset}
          className="text-xs text-red-400 hover:text-red-300 px-2 py-1 hover:bg-gray-700 rounded transition-colors"
        >
          Reset Workflow
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div 
          className="bg-red-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      
      <div className="mt-2 text-xs text-gray-400 flex justify-between">
        <span>{workflowSummary.totalLogs} total log entries</span>
        <span>Last updated: {new Date(workflowSummary.lastModified).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}