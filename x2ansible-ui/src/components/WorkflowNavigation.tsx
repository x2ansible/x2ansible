// src/components/WorkflowNavigation.tsx
"use client";

interface WorkflowNavigationProps {
  currentStep: number;
  isStepCompleted: (step: number) => boolean;
  onGoToStep: (step: number) => void;
  canProceedToNext: boolean;
  loading: boolean;
}

const steps = [
  { index: 0, name: "Classify", icon: "🔍" },
  { index: 1, name: "Context", icon: "📋" },
  { index: 2, name: "Convert", icon: "⚙️" },
  { index: 3, name: "Validate", icon: "✅" },
  { index: 4, name: "Deploy", icon: "🚀" }
];

export default function WorkflowNavigation({
  currentStep,
  isStepCompleted,
  onGoToStep,
  canProceedToNext,
  loading
}: WorkflowNavigationProps) {
  return (
    <div className="flex space-x-1 mb-6 bg-gray-800 border border-gray-600 rounded-lg p-1 shadow-sm">
      {steps.map((step) => {
        const isActive = step.index === currentStep;
        const isCompleted = isStepCompleted(step.index);
        const isAccessible = step.index <= currentStep || isCompleted;
        
        return (
          <button
            key={step.index}
            onClick={() => isAccessible && !loading && onGoToStep(step.index)}
            disabled={!isAccessible || loading}
            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center justify-center gap-2 ${
              isActive
                ? "bg-red-600 text-white shadow-sm"
                : isCompleted
                ? "bg-green-600 text-white hover:bg-green-700"
                : isAccessible
                ? "text-gray-300 hover:text-white hover:bg-gray-700"
                : "text-gray-500 cursor-not-allowed opacity-50"
            }`}
          >
            <span>{step.icon}</span>
            <span>{step.index + 1}. {step.name}</span>
            {isCompleted && step.index !== currentStep && (
              <span className="text-xs">✓</span>
            )}
            {isActive && loading && (
              <div className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full"></div>
            )}
          </button>
        );
      })}
    </div>
  );
}
