// components/Stepper.tsx
"use client";

import React from "react";
import clsx from "clsx";

const steps = [
  { id: 0, name: "Classify" },
  { id: 1, name: "Context" },
  { id: 2, name: "Convert" },
  { id: 3, name: "Validate" },
  { id: 4, name: "Run/Automate" },
];

export function Stepper({
  activeStep,
  onStepClick,
}: {
  activeStep: number;
  onStepClick: (id: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-6 rounded-xl shadow-md">
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div
            className={clsx(
              "cursor-pointer px-4 py-2 rounded-md text-center transition",
              activeStep === step.id
                ? "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-white"
                : "hover:bg-gray-100 dark:hover:bg-neutral-800"
            )}
            onClick={() => onStepClick(step.id)}
          >
            <div className="text-sm font-semibold">{step.name}</div>
          </div>

          {index < steps.length - 1 && <div className="text-gray-400">→</div>}
        </React.Fragment>
      ))}
    </div>
  );
}
