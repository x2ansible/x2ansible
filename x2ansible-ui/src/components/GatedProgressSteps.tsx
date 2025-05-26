// src/components/GatedProgressSteps.tsx
"use client";

interface GatedProgressStepsProps {
  steps: string[];
  currentStep: number;
  completedSteps: number[]; // Array of completed step indices
  onStepClick: (stepIndex: number) => void;
  loading: boolean;
}

export default function GatedProgressSteps({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  loading
}: GatedProgressStepsProps) {
  
  const isStepAccessible = (stepIndex: number): boolean => {
    // Always allow access to step 0 (Classify)
    if (stepIndex === 0) return true;
    
    // Allow access to completed steps
    if (completedSteps.includes(stepIndex)) return true;
    
    // Allow access to current step
    if (stepIndex === currentStep) return true;
    
    // Allow access to next step only if previous step is completed
    if (stepIndex === currentStep + 1 && completedSteps.includes(currentStep)) {
      return true;
    }
    
    // Block all other steps
    return false;
  };

  const getStepStatus = (stepIndex: number) => {
    if (completedSteps.includes(stepIndex)) return 'completed';
    if (stepIndex === currentStep) return 'current';
    if (isStepAccessible(stepIndex)) return 'accessible';
    return 'locked';
  };

  const getStepIcon = (stepIndex: number, status: string) => {
    const icons = ['🔍', '📋', '⚙️', '✅', '🚀'];
    
    if (status === 'completed') return '✓';
    if (status === 'locked') return '🔒';
    return icons[stepIndex] || '•';
  };

  return (
    <div className="flex space-x-1 mb-6 bg-gray-800 border border-gray-600 rounded-lg p-1 shadow-sm">
      {steps.map((label, idx) => {
        const status = getStepStatus(idx);
        const isAccessible = isStepAccessible(idx);
        const icon = getStepIcon(idx, status);
        
        return (
          <button
            key={idx}
            onClick={() => isAccessible && !loading && onStepClick(idx)}
            disabled={!isAccessible || loading}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 relative ${
              status === 'current'
                ? "bg-red-600 text-white shadow-sm"
                : status === 'completed'
                ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                : status === 'accessible'
                ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                : "bg-gray-600 text-gray-400 cursor-not-allowed opacity-60"
            }`}
            title={
              status === 'locked' 
                ? `Complete step ${idx} (${steps[idx - 1]}) to unlock this step`
                : status === 'completed'
                ? `Step ${idx + 1} completed - Click to revisit`
                : status === 'accessible'
                ? `Ready to proceed to step ${idx + 1}`
                : `Current step: ${label}`
            }
          >
            <span className="text-base">{icon}</span>
            <span className="hidden sm:inline">{idx + 1}. {label}</span>
            <span className="sm:hidden">{idx + 1}</span>
            
            {/* Loading indicator for current step */}
            {status === 'current' && loading && (
              <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full ml-1"></div>
            )}
            
            {/* Lock icon overlay for locked steps */}
            {status === 'locked' && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-700 bg-opacity-80 rounded-md">
                <span className="text-gray-400 text-xs">🔒</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}