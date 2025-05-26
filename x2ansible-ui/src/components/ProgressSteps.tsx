// src/components/ProgressSteps.tsx
"use client";

interface ProgressStepsProps {
  steps: string[];
  currentStep: number;
}

export default function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <div className="flex space-x-1 mb-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-1 shadow-sm">
      {steps.map((label, idx) => (
        <button
          key={idx}
          className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all ${
            idx === currentStep
              ? "bg-red-600 text-white shadow-sm"
              : idx < currentStep
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          {idx + 1}. {label}
        </button>
      ))}
    </div>
  );
}
