// src/components/StepActionButton.tsx
"use client";

interface StepActionButtonProps {
  currentStep: number;
  loading: boolean;
  code: string;
  onExecuteStep: (step: number) => void;
  isStepCompleted: (step: number) => boolean;
}

const stepConfig = {
  0: { 
    action: "Classify Code", 
    icon: "🔍", 
    description: "Analyze and classify the uploaded code",
    requiresCode: true
  },
  1: { 
    action: "Analyze Context", 
    icon: "📋", 
    description: "Gather context and dependencies from classified code",
    requiresCode: false
  },
  2: { 
    action: "Generate Code", 
    icon: "⚙️", 
    description: "Convert code to target format based on context",
    requiresCode: false
  },
  3: { 
    action: "Validate Output", 
    icon: "✅", 
    description: "Validate converted code for quality and security",
    requiresCode: false
  },
  4: { 
    action: "Deploy", 
    icon: "🚀", 
    description: "Deploy validated code to target environment",
    requiresCode: false
  }
};

export default function StepActionButton({
  currentStep,
  loading,
  code,
  onExecuteStep,
  isStepCompleted
}: StepActionButtonProps) {
  const config = stepConfig[currentStep as keyof typeof stepConfig];
  const isCompleted = isStepCompleted(currentStep);
  const canExecute = config.requiresCode ? code.trim().length > 0 : true;

  if (!config) return null;

  return (
    <div className="mt-4 bg-gray-800 border border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onExecuteStep(currentStep)}
            disabled={loading || !canExecute}
            className={`px-6 py-3 rounded-lg transition-all font-medium flex items-center gap-2 text-sm ${
              isCompleted
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Processing...
              </>
            ) : (
              <>
                {config.icon} {isCompleted ? `Re-run ${config.action}` : config.action}
              </>
            )}
          </button>
          
          <div className="text-sm text-gray-300">
            {config.description}
          </div>
        </div>

        {/* Step Status */}
        <div className="flex items-center gap-2 text-sm">
          {isCompleted ? (
            <span className="flex items-center gap-1 text-green-400">
              <span>✅</span>
              <span>Completed</span>
            </span>
          ) : canExecute ? (
            <span className="text-blue-400">Ready to execute</span>
          ) : (
            <span className="text-yellow-400">
              {config.requiresCode ? "Upload a file first" : "Waiting..."}
            </span>
          )}
        </div>
      </div>

      {/* Requirements hint */}
      {!canExecute && config.requiresCode && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-sm text-yellow-400">
            ⚠️ Please upload or select a file before proceeding with classification.
          </div>
        </div>
      )}
    </div>
  );
}