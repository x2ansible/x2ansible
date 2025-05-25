// src/app/page.tsx
"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Stepper } from "../components/Stepper";
import { StepDetailPanel } from "../components/StepDetailPanel";
import { LoginButton } from "../components/LoginButton";

export default function HomePage() {
  const [activeStep, setActiveStep] = useState(0);
  const { status } = useSession();
  const router = useRouter();

  const handleTryThis = () => {
    if (status === "authenticated") {
      router.push("/run");
    } else {
      router.push("/api/auth/signin?callbackUrl=/run");
    }
  };

  return (
    <main className="min-h-screen bg-[--background] text-[--foreground] p-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl md:text-4xl font-bold text-center w-full">
            ⚙️ Ansible Automation using the Agentic Way
          </h1>
          <div className="absolute right-10 top-10">
            <LoginButton />
          </div>
        </div>

        <p className="text-center text-lg text-gray-600 mb-10">
          A visual overview of how code is transformed into a deployable Ansible playbook
        </p>

        <Stepper activeStep={activeStep} onStepClick={setActiveStep} />

        <div className="mt-8">
          <StepDetailPanel selectedId={activeStep} />
        </div>

        <div className="mt-16 text-center">
          <button
            onClick={handleTryThis}
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow hover:bg-blue-700 transition"
          >
            🚀 Try This Workflow
          </button>
        </div>
      </div>
    </main>
  );
}
