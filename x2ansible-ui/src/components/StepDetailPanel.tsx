// components/StepDetailPanel.tsx
"use client";

import React from "react";

const stepDetails = [
  {
    id: 0,
    title: "🔍 Classify",
    summary: "Understands the input code's language, tools, and intent.",
    details:
      "This step uses a classifier agent to detect whether the input is a script, Dockerfile, Kubernetes YAML, or something else. It determines the framework (e.g., Helm, Terraform), detects modules, complexity, and templates used.",
  },
  {
    id: 1,
    title: "📚 Context",
    summary: "Retrieves related knowledge using RAG (Retrieval-Augmented Generation).",
    details:
      "Fetches relevant documents, examples, and Ansible references from the vector DB. Uses semantic search on chunked knowledge base files ingested beforehand.",
  },
  {
    id: 2,
    title: "⚙️ Convert",
    summary: "Translates the classified input into a structured Ansible playbook.",
    details:
      "An LLM-based agent performs transformation using model instructions. It combines rules and patterns to generate a minimal, functional playbook in YAML format.",
  },
  {
    id: 3,
    title: "✅ Validate",
    summary: "Lints the playbook using the ansible-lint MCP tool.",
    details:
      "This step calls the mcp::ansible_lint toolgroup via agent forcing. It returns raw output, issue list, and success/failure state.",
  },
  {
    id: 4,
    title: "🤖 Run/Automate",
    summary: "Deploys the playbook using Ansible Automation Controller.",
    details:
      "This step connects to your AAP (Ansible Automation Platform) and runs the playbook as an automated job. You can monitor the job, view output logs, and confirm success or failure via the controller interface.",
  }
];

export function StepDetailPanel({ selectedId }: { selectedId: number }) {
  const current = stepDetails.find((step) => step.id === selectedId);
  if (!current) return null;

  return (
    <div className="p-6 bg-white dark:bg-neutral-900 rounded-lg shadow transition">
      <div className="text-2xl font-semibold mb-2">{current.title}</div>
      <div className="text-gray-700 dark:text-gray-300 mb-2">{current.summary}</div>
      <div className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
        {current.details}
      </div>
    </div>
  );
}
