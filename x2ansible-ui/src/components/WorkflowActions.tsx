// src/components/WorkflowActions.tsx
"use client";

interface WorkflowActionsProps {
  currentStep: number;
  loading: boolean;
  code: string;
  workflowResult: any;
  onExecuteStep: (step: number) => void;
  onNextStep: () => void;
  onPreviousStep: () => void;
}

const stepActions = {
  0: { 
    action: "Classify Code", 
    icon: "🔍", 
    description: "Analyze and classify the code",
    canProceed: (result: any) => result?.classification?.convertible
  },
  1: { 
    action: "Analyze Context", 
    icon: "📋", 
    description: "Gather context and dependencies",
    canProceed: (result: any) => result?.context?.dependencies
  },
  2: { 
    action: "Convert Code", 
    icon: "⚙️", 
    description: "Convert to target format",
    canProceed: (result: any) => result?.conversion?.generated_files?.length > 0
  },
  3: { 
    action: "Validate Output", 
    icon: "✅", 
    description: "Validate converted code",
    canProceed: (result: any) => result?.validation?.syntax_valid
  },
  4: { 
    action: "Deploy", 
    icon: "🚀", 
    description: "Deploy to target environment",
    canProceed: (result: any) => result?.deployment?.status === 'success'
  }
};

export default function WorkflowActions({
  currentStep,
  loading,
  code,
  workflowResult,
  onExecuteStep,
  onNextStep,
  onPreviousStep,
}: WorkflowActionsProps) {
  const stepConfig = stepActions[currentStep as keyof typeof stepActions];
  const canProceedToNext = workflowResult && stepConfig.canProceed(workflowResult);

  return (
    <div className="mt-4 bg-gray-800 border border-gray-600 rounded-lg p-4">
      <div className="flex items-center justify-between">
        {/* Current Step Action */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => onExecuteStep(currentStep)}
            disabled={loading || !code.trim()}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                Processing...
              </>
            ) : (
              <>
                {stepConfig.icon} {stepConfig.action}
              </>
            )}
          </button>
          
          <div className="text-sm text-gray-300">
            {stepConfig.description}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              onClick={onPreviousStep}
              disabled={loading}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              ← Previous
            </button>
          )}
          
          {currentStep < 4 && (
            <button
              onClick={onNextStep}
              disabled={loading || !canProceedToNext}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 text-sm"
            >
              Next →
            </button>
          )}
        </div>
      </div>

      {/* Step Status */}
      {workflowResult && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="flex items-center gap-2 text-sm">
            {workflowResult.status === 'success' && (
              <span className="text-green-400">✅ Step completed successfully</span>
            )}
            {workflowResult.status === 'error' && (
              <span className="text-red-400">❌ Step failed</span>
            )}
            {workflowResult.status === 'processing' && (
              <span className="text-yellow-400">⏳ Step in progress</span>
            )}
            
            {canProceedToNext && (
              <span className="text-blue-400 ml-4">→ Ready for next step</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}