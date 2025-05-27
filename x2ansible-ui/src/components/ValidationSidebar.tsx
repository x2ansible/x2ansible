"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheckIcon, 
  Cog6ToothIcon, 
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  BugAntIcon,
  LockClosedIcon,
  CpuChipIcon,
  DocumentCheckIcon,
  ClipboardDocumentListIcon,
  AdjustmentsHorizontalIcon,
  PlayIcon,
  PlusIcon,
  TrashIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";

interface ValidationSidebarProps {
  validationConfig?: {
    checkSyntax?: boolean;
    securityScan?: boolean;
    performanceCheck?: boolean;
    bestPractices?: boolean;
    customRules?: string[];
  };
  setValidationConfig?: (config: any) => void;
  onValidate?: () => void;
  validationResult?: {
    success: boolean;
    summary: {
      total: number;
      errors: number;
      warnings: number;
      info: number;
      suggestions: number;
    };
    score?: number;
  } | null;
  loading?: boolean;
}

export default function ValidationSidebar({ 
  validationConfig,
  setValidationConfig,
  onValidate,
  validationResult,
  loading = false
}: ValidationSidebarProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['checks', 'rules']));
  const [newCustomRule, setNewCustomRule] = useState("");
  const [showAddRule, setShowAddRule] = useState(false);
  const [validationPresets, setValidationPresets] = useState([
    { name: 'Basic', checks: { checkSyntax: true, securityScan: false, performanceCheck: false, bestPractices: true } },
    { name: 'Security', checks: { checkSyntax: true, securityScan: true, performanceCheck: false, bestPractices: true } },
    { name: 'Performance', checks: { checkSyntax: true, securityScan: true, performanceCheck: true, bestPractices: true } },
    { name: 'Comprehensive', checks: { checkSyntax: true, securityScan: true, performanceCheck: true, bestPractices: true } }
  ]);

  const handleConfigChange = (key: string, value: any) => {
    if (setValidationConfig && validationConfig) {
      setValidationConfig({
        ...validationConfig,
        [key]: value
      });
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const addCustomRule = () => {
    if (newCustomRule.trim() && validationConfig && setValidationConfig) {
      const updatedRules = [...(validationConfig.customRules || []), newCustomRule.trim()];
      setValidationConfig({
        ...validationConfig,
        customRules: updatedRules
      });
      setNewCustomRule("");
      setShowAddRule(false);
    }
  };

  const removeCustomRule = (index: number) => {
    if (validationConfig && setValidationConfig) {
      const updatedRules = (validationConfig.customRules || []).filter((_, i) => i !== index);
      setValidationConfig({
        ...validationConfig,
        customRules: updatedRules
      });
    }
  };

  const applyPreset = (preset: any) => {
    if (setValidationConfig) {
      setValidationConfig({
        ...validationConfig,
        ...preset.checks
      });
    }
  };

  const getScoreColor = (score?: number) => {
    if (!score) return 'from-slate-500 to-slate-600';
    if (score >= 90) return 'from-green-500 to-emerald-400';
    if (score >= 70) return 'from-yellow-500 to-orange-400';
    return 'from-red-500 to-pink-400';
  };

  const getCheckIcon = (enabled: boolean) => {
    return enabled ? (
      <CheckCircleIcon className="w-4 h-4 text-green-400" />
    ) : (
      <div className="w-4 h-4 border-2 border-slate-600 rounded-full"></div>
    );
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-600/30">
      <div className="p-6 space-y-6 h-full overflow-y-auto">
        {/* Header */}
        <div className="relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
              <ShieldCheckIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Validation Suite</h3>
              <p className="text-xs text-slate-400">Ansible Quality Checks</p>
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <AdjustmentsHorizontalIcon className="w-4 h-4 text-slate-400" />
            <h4 className="font-semibold text-slate-200 text-sm">Quick Presets</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            {validationPresets.map((preset, index) => (
              <button
                key={index}
                onClick={() => applyPreset(preset)}
                className="p-2 text-xs rounded-lg border border-slate-600/50 bg-slate-700/30 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-colors text-center"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        {/* Validation Checks Configuration */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <button
            onClick={() => toggleSection('checks')}
            className="flex items-center justify-between w-full mb-3 group"
          >
            <div className="flex items-center space-x-2">
              <Cog6ToothIcon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              <h4 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">
                Validation Checks
              </h4>
            </div>
            <div className="text-slate-400 group-hover:text-white transition-colors">
              {expandedSections.has('checks') ? '−' : '+'}
            </div>
          </button>
          
          {expandedSections.has('checks') && (
            <div className="space-y-4">
              {/* Syntax Check */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <BugAntIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                  <div>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      Syntax Validation
                    </span>
                    <p className="text-xs text-slate-500">Check YAML syntax and Ansible structure</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={validationConfig?.checkSyntax || false}
                    onChange={(e) => handleConfigChange('checkSyntax', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
              </label>

              {/* Security Scan */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <LockClosedIcon className="w-4 h-4 text-slate-400 group-hover:text-red-400 transition-colors" />
                  <div>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      Security Scan
                    </span>
                    <p className="text-xs text-slate-500">Detect security vulnerabilities and risks</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={validationConfig?.securityScan || false}
                    onChange={(e) => handleConfigChange('securityScan', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-red-500"></div>
                </label>
              </label>

              {/* Performance Check */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <CpuChipIcon className="w-4 h-4 text-slate-400 group-hover:text-green-400 transition-colors" />
                  <div>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      Performance Analysis
                    </span>
                    <p className="text-xs text-slate-500">Optimize execution speed and efficiency</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={validationConfig?.performanceCheck || false}
                    onChange={(e) => handleConfigChange('performanceCheck', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </label>

              {/* Best Practices */}
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center space-x-3">
                  <DocumentCheckIcon className="w-4 h-4 text-slate-400 group-hover:text-yellow-400 transition-colors" />
                  <div>
                    <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                      Best Practices
                    </span>
                    <p className="text-xs text-slate-500">Follow Ansible community guidelines</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={validationConfig?.bestPractices || false}
                    onChange={(e) => handleConfigChange('bestPractices', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-yellow-500"></div>
                </label>
              </label>
            </div>
          )}
        </div>

        {/* Custom Rules */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <button
            onClick={() => toggleSection('rules')}
            className="flex items-center justify-between w-full mb-3 group"
          >
            <div className="flex items-center space-x-2">
              <ClipboardDocumentListIcon className="w-4 h-4 text-slate-400 group-hover:text-white transition-colors" />
              <h4 className="font-semibold text-slate-200 text-sm group-hover:text-white transition-colors">
                Custom Rules
              </h4>
            </div>
            <div className="text-slate-400 group-hover:text-white transition-colors">
              {expandedSections.has('rules') ? '−' : '+'}
            </div>
          </button>
          
          {expandedSections.has('rules') && (
            <div className="space-y-3">
              {/* Existing Custom Rules */}
              {validationConfig?.customRules && validationConfig.customRules.length > 0 ? (
                <div className="space-y-2">
                  {validationConfig.customRules.map((rule, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-slate-700/30 rounded border border-slate-600/30">
                      <span className="text-xs text-slate-300 font-mono flex-1 truncate">
                        {rule}
                      </span>
                      <button
                        onClick={() => removeCustomRule(index)}
                        className="ml-2 p-1 text-red-400 hover:text-red-300 transition-colors"
                        title="Remove rule"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-500 text-center py-2">
                  No custom rules defined
                </div>
              )}

              {/* Add New Rule */}
              {showAddRule ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={newCustomRule}
                    onChange={(e) => setNewCustomRule(e.target.value)}
                    placeholder="Enter rule name (e.g., no-debug-tasks)"
                    className="w-full p-2 text-xs rounded border border-slate-600/50 bg-slate-700/50 text-slate-200 placeholder-slate-500 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25"
                    onKeyPress={(e) => e.key === 'Enter' && addCustomRule()}
                  />
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={addCustomRule}
                      className="flex-1 py-1 px-2 text-xs bg-green-500/20 text-green-300 border border-green-500/30 rounded hover:bg-green-500/30 transition-colors"
                    >
                      Add Rule
                    </button>
                    <button
                      onClick={() => {
                        setShowAddRule(false);
                        setNewCustomRule("");
                      }}
                      className="flex-1 py-1 px-2 text-xs bg-slate-600/50 text-slate-300 border border-slate-600/50 rounded hover:bg-slate-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddRule(true)}
                  className="w-full py-2 px-3 text-xs border-2 border-dashed border-slate-600/50 rounded text-slate-400 hover:border-blue-400/50 hover:text-blue-300 transition-colors flex items-center justify-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Custom Rule</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Validation Results Summary */}
        {validationResult && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
            <div className="flex items-center space-x-2 mb-3">
              <ShieldCheckIcon className="w-4 h-4 text-slate-400" />
              <h4 className="font-semibold text-slate-200 text-sm">Last Validation</h4>
            </div>
            
            {/* Quality Score */}
            {validationResult.score && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-slate-400">Quality Score</span>
                  <span className="text-sm font-bold text-white">
                    {validationResult.score}/100
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full bg-gradient-to-r ${getScoreColor(validationResult.score)} transition-all duration-500`}
                    style={{ width: `${validationResult.score}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Issue Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-red-500/10 border border-red-500/30 rounded p-2 text-center">
                <div className="text-red-300 font-bold text-sm">{validationResult.summary.errors}</div>
                <div className="text-red-400/80 text-xs">Errors</div>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 text-center">
                <div className="text-yellow-300 font-bold text-sm">{validationResult.summary.warnings}</div>
                <div className="text-yellow-400/80 text-xs">Warnings</div>
              </div>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-center">
                <div className="text-blue-300 font-bold text-sm">{validationResult.summary.info}</div>
                <div className="text-blue-400/80 text-xs">Info</div>
              </div>
              <div className="bg-green-500/10 border border-green-500/30 rounded p-2 text-center">
                <div className="text-green-300 font-bold text-sm">{validationResult.summary.suggestions}</div>
                <div className="text-green-400/80 text-xs">Tips</div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="mt-3 flex items-center justify-center">
              <div className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${
                validationResult.summary.errors > 0 
                  ? 'bg-red-500/20 text-red-300 border-red-400/40'
                  : validationResult.summary.warnings > 0
                  ? 'bg-yellow-500/20 text-yellow-300 border-yellow-400/40'
                  : 'bg-green-500/20 text-green-300 border-green-400/40'
              }`}>
                {validationResult.summary.errors > 0 
                  ? 'Critical Issues Found'
                  : validationResult.summary.warnings > 0
                  ? 'Review Recommended'
                  : 'Validation Passed'}
              </div>
            </div>
          </div>
        )}

        {/* Quick Action Button */}
        {onValidate && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
            <button
              onClick={onValidate}
              disabled={loading}
              className={`w-full py-3 rounded-lg font-medium text-sm transition-all duration-300 transform ${
                loading 
                  ? "bg-gradient-to-r from-purple-500/50 to-pink-500/50 cursor-not-allowed scale-95" 
                  : "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 hover:scale-105 text-white shadow-lg"
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>Validating...</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    <span>Run Validation</span>
                  </>
                )}
              </div>
            </button>
          </div>
        )}

        {/* Validation Process Indicator */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <h4 className="font-semibold text-slate-200 text-sm mb-3">Validation Pipeline</h4>
          <div className="space-y-2">
            {[
              { step: 'Analyze', status: 'completed', color: 'bg-green-400' },
              { step: 'Context', status: 'completed', color: 'bg-green-400' },
              { step: 'Convert', status: 'completed', color: 'bg-green-400' },
              { step: 'Validate', status: 'active', color: 'bg-purple-400 animate-pulse' },
              { step: 'Deploy', status: 'pending', color: 'bg-slate-600' },
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${item.color}`}></div>
                <span className={`text-xs ${
                  item.status === 'active' ? 'text-purple-300 font-medium' :
                  item.status === 'completed' ? 'text-green-300' : 'text-slate-500'
                }`}>
                  {item.step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <InformationCircleIcon className="w-4 h-4 text-slate-400" />
            <h4 className="font-semibold text-slate-200 text-sm">Active Configuration</h4>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Syntax Check:</span>
              {getCheckIcon(validationConfig?.checkSyntax || false)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Security Scan:</span>
              {getCheckIcon(validationConfig?.securityScan || false)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Performance:</span>
              {getCheckIcon(validationConfig?.performanceCheck || false)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Best Practices:</span>
              {getCheckIcon(validationConfig?.bestPractices || false)}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Custom Rules:</span>
              <span className="text-xs font-medium text-blue-300">
                {validationConfig?.customRules?.length || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Help & Tips */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <div className="flex items-center space-x-2 mb-3">
            <InformationCircleIcon className="w-4 h-4 text-blue-400" />
            <h4 className="font-semibold text-slate-200 text-sm">Validation Tips</h4>
          </div>
          
          <div className="space-y-2 text-xs text-slate-400">
            <div className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
              <p>Enable all checks for production playbooks</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
              <p>Custom rules help enforce team standards</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-yellow-400 rounded-full mt-2 flex-shrink-0"></div>
              <p>Fix errors before warnings for best results</p>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-1 h-1 bg-purple-400 rounded-full mt-2 flex-shrink-0"></div>
              <p>Higher quality scores indicate better playbooks</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}