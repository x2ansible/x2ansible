import React, { useState } from "react";
import {
  SparklesIcon,
  ClipboardDocumentCheckIcon,
  ListBulletIcon,
  ExclamationTriangleIcon,
  LightBulbIcon
} from "@heroicons/react/24/outline";

interface GenerateSidebarProps {
  conversionConfig: {
    targetFormat: string;
    outputStyle: string;
    includeComments: boolean;
    validateSyntax: boolean;
    useHandlers: boolean;
    useRoles: boolean;
    useVars: boolean;
    // You can add more, but only booleans will render checkboxes below
  };
  setConversionConfig: (config: any) => void;
  contextSummary?: {
    tokens: number;
    docCount: number;
    topics: string[];
  };
}

export default function GenerateSidebar({
  conversionConfig,
  setConversionConfig,
  contextSummary,
}: GenerateSidebarProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleChange = (key: string, value: any) => {
    setConversionConfig({ ...conversionConfig, [key]: value });
  };

  // PATCH: List keys and labels for booleans ONLY, and render checkboxes safely
  const booleanCheckboxOptions: { key: keyof typeof conversionConfig; label: string }[] = [
    { key: "includeComments", label: "Include Comments" },
    { key: "validateSyntax", label: "Validate YAML Syntax" },
    { key: "useHandlers", label: "Use Handlers for Reuse" },
    { key: "useRoles", label: "Use Role-Based Structure" },
    { key: "useVars", label: "Extract Variables for Reuse" },
  ];

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-600/30 p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-orange-400 rounded-xl flex items-center justify-center shadow-lg">
          <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-bold text-white">Playbook Conversion</h3>
          <p className="text-xs text-slate-400">Output Configuration</p>
        </div>
      </div>

      {/* Output Options */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Target Format</label>
          <select
            value={conversionConfig.targetFormat}
            onChange={(e) => handleChange("targetFormat", e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-600 bg-slate-700 text-slate-100"
          >
            <option value="ansible">Ansible</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1">Output Style</label>
          <select
            value={conversionConfig.outputStyle}
            onChange={(e) => handleChange("outputStyle", e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-600 bg-slate-700 text-slate-100"
          >
            <option value="minimal">Minimal</option>
            <option value="detailed">Detailed</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>

        <div className="space-y-3">
          {booleanCheckboxOptions.map(({ key, label }) => (
            <label key={key} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={!!conversionConfig[key]} // always boolean
                onChange={(e) => handleChange(key, e.target.checked)}
                className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded"
              />
              <span className="text-xs text-slate-300">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Context Summary */}
      {contextSummary && (
        <div className="bg-slate-800/40 border border-slate-600/40 rounded-lg p-4">
          <h4 className="text-slate-200 text-sm font-semibold flex items-center space-x-2 mb-2">
            <ListBulletIcon className="w-4 h-4" />
            <span>Context Summary</span>
          </h4>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li>
              <span className="text-slate-200">{contextSummary.docCount}</span> documents matched
            </li>
            <li>
              <span className="text-slate-200">{contextSummary.tokens}</span> tokens retrieved
            </li>
            {contextSummary.topics.length > 0 && (
              <li>
                Topics:{" "}
                <span className="text-slate-300">
                  {contextSummary.topics.slice(0, 3).join(", ")}
                </span>
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Advanced Options Toggle */}
      <div className="mt-4">
        <button
          className="text-xs text-blue-300 hover:underline"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? "Hide" : "Show"} Advanced Options
        </button>
        {showAdvanced && (
          <div className="mt-3 text-xs text-slate-400 space-y-2">
            <p className="italic">Prompt tweaks, debug flags, and model/tool selection coming soon.</p>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="border-t border-slate-600/30 pt-4">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <LightBulbIcon className="w-4 h-4" />
          <span>Need help? </span>
        </div>
        <ul className="mt-2 space-y-1 text-xs text-blue-300 underline">
          <li>
            <a
              href="https://docs.ansible.com/ansible/latest/user_guide/playbooks_best_practices.html"
              target="_blank"
              rel="noreferrer"
            >
              Ansible Best Practices
            </a>
          </li>
          <li>
            <a
              href="https://docs.ansible.com/ansible/latest/playbook_guide/index.html"
              target="_blank"
              rel="noreferrer"
            >
              Playbook Guide
            </a>
          </li>
          <li>
            <a
              href="https://ansible-lint.readthedocs.io/"
              target="_blank"
              rel="noreferrer"
            >
              Ansible Linting
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
