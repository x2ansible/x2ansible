import React, { useState, useEffect } from "react";
import { 
  ShieldCheckIcon, 
  Cog6ToothIcon, 
  PlayIcon, 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  DocumentTextIcon,
  ClockIcon,
  FireIcon,
  BugAntIcon,
  KeyIcon,
  SparklesIcon,
  ChartBarIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";

interface ValidationSidebarProps {
  validationConfig: {
    checkSyntax: boolean;
    securityScan: boolean;
    performanceCheck: boolean;
    bestPractices: boolean;
    customRules: string[];
  };
  setValidationConfig: (config: any) => void;
  validationResult?: any;
  loading?: boolean;
  selectedProfile?: string;
  onProfileChange?: (profile: string) => void;
}

export default function ValidationSidebar({ 
  validationConfig, 
  setValidationConfig, 
  validationResult,
  loading = false,
  selectedProfile = 'production',
  onProfileChange
}: ValidationSidebarProps) {
  const [lintProfiles, setLintProfiles] = useState<any[]>([]);
  const [validationStats, setValidationStats] = useState({
    totalRuns: 0,
    successRate: 0,
    avgIssues: 0,
    lastRun: null as Date | null
  });
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['config', 'profile']));

  // Load validation profiles and stats
  useEffect(() => {
    // Updated to use official Ansible Lint profiles
    const mockProfiles = [
      { 
        id: 'minimal', 
        name: 'Minimal', 
        description: 'Only critical errors and warnings',
        rules: 12,
        color: 'from-blue-500 to-cyan-400'
      },
      { 
        id: 'basic', 
        name: 'Basic', 
        description: 'Essential syntax and structure checks',
        rules: 28,
        color: 'from-green-500 to-emerald-400'
      },
      { 
        id: 'safety', 
        name: 'Safety', 
        description: 'Security and safety focused rules',
        rules: 35,
        color: 'from-orange-500 to-red-400'
      },
      { 
        id: 'test', 
        name: 'Test', 
        description: 'Rules suitable for testing environments',
        rules: 42,
        color: 'from-purple-500 to-pink-400'
      },
      { 
        id: 'production', 
        name: 'Production', 
        description: 'Comprehensive validation for production',
        rules: 58,
        color: 'from-red-500 to-pink-400'
      }
    ];
    setLintProfiles(mockProfiles);

    // Mock stats - replace with actual API call
    setValidationStats({
      totalRuns: 127,
      successRate: 84.2,
      avgIssues: 3.7,
      lastRun: new Date()
    });
  }, []);

  const handleConfigChange = (key: string, value: any) => {
    setValidationConfig({
      ...validationConfig,
      [key]: value
    });
  };

  const handleProfileChange = (profile: string) => {
    if (onProfileChange) {
      onProfileChange(profile);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const copy = new Set(prev);
      copy.has(section) ? copy.delete(section) : copy.add(section);
      return copy;
    });
  };

  const getProfileColor = (profileId: string) => {
    const profile = lintProfiles.find(p => p.id === profileId);
    return profile?.color || 'from-blue-500 to-cyan-400';
  };

  const getValidationStatusIcon = () => {
    if (loading) {
      return <ArrowPathIcon className="w-5 h-5 text-blue-400 animate-spin" />;
    }
    if (!validationResult) {
      return <ClockIcon className="w-5 h-5 text-slate-400" />;
    }
    return validationResult.passed 
      ? <CheckCircleIcon className="w-5 h-5 text-green-400" />
      : <XCircleIcon className="w-5 h-5 text-red-400" />;
  };

  const getValidationSummary = () => {
    if (!validationResult) return null;
    
    const issues = validationResult.issues || [];
    const errors = issues.filter((i: any) => i.severity === 'error' || i.level === 'error').length;
    const warnings = issues.filter((i: any) => i.severity === 'warning' || i.level === 'warning').length;
    
    return { errors, warnings, total: issues.length };
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
              <h3 className="font-bold text-white">Playbook Validation</h3>
              <p className="text-xs text-slate-400">Ansible Lint & Quality</p>
            </div>
          </div>
        </div>

        {/* Validation Status */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-200 text-sm flex items-center space-x-2">
              {getValidationStatusIcon()}
              <span>Validation Status</span>
            </h4>
          </div>
          
          {validationResult ? (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${
                validationResult.passed 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : 'bg-red-500/10 border-red-500/30'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium text-sm ${
                    validationResult.passed ? 'text-green-300' : 'text-red-300'
                  }`}>
                    {validationResult.passed ? 'PASSED' : 'FAILED'}
                  </span>
                  <span className="text-xs text-slate-400">
                    {validationResult.debug_info?.playbook_length || 0} chars
                  </span>
                </div>
                
                {(() => {
                  const summary = getValidationSummary();
                  return summary && (
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center">
                        <div className="text-red-400 font-bold">{summary.errors}</div>
                        <div className="text-slate-500">Errors</div>
                      </div>
                      <div className="text-center">
                        <div className="text-yellow-400 font-bold">{summary.warnings}</div>
                        <div className="text-slate-500">Warnings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-slate-300 font-bold">{summary.total}</div>
                        <div className="text-slate-500">Total</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <ClockIcon className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm text-slate-400">No validation run yet</p>
              <p className="text-xs text-slate-500">Click validate to start</p>
            </div>
          )}
        </div>

        {/* Validation Profile */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <button
            onClick={() => toggleSection('profile')}
            className="flex items-center justify-between w-full mb-4"
          >
            <h4 className="font-semibold text-slate-200 text-sm flex items-center space-x-2">
              <DocumentTextIcon className="w-4 h-4 text-slate-400" />
              <span>Lint Profile</span>
            </h4>
            <span className="text-slate-400">
              {expandedSections.has('profile') ? '−' : '+'}
            </span>
          </button>
          
          {expandedSections.has('profile') && (
            <div className="space-y-3">
              {lintProfiles.map((profile) => (
                <label key={profile.id} className="block cursor-pointer group">
                  <div className={`p-3 rounded-lg border transition-all ${
                    selectedProfile === profile.id
                      ? 'border-blue-400/50 bg-blue-500/10'
                      : 'border-slate-600/50 hover:border-slate-500/50 bg-slate-700/30'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <input
                        type="radio"
                        name="profile"
                        value={profile.id}
                        checked={selectedProfile === profile.id}
                        onChange={(e) => handleProfileChange(e.target.value)}
                        className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-slate-200">
                            {profile.name}
                          </span>
                          <span className="text-xs text-slate-400">
                            {profile.rules} rules
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          {profile.description}
                        </p>
                      </div>
                    </div>
                    <div className={`h-1 rounded-full bg-gradient-to-r ${profile.color} mt-2 opacity-60`}></div>
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Validation Configuration */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <button
            onClick={() => toggleSection('config')}
            className="flex items-center justify-between w-full mb-4"
          >
            <h4 className="font-semibold text-slate-200 text-sm flex items-center space-x-2">
              <Cog6ToothIcon className="w-4 h-4 text-slate-400" />
              <span>Validation Options</span>
            </h4>
            <span className="text-slate-400">
              {expandedSections.has('config') ? '−' : '+'}
            </span>
          </button>
          
          {expandedSections.has('config') && (
            <div className="space-y-4">
              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={validationConfig.checkSyntax}
                  onChange={(e) => handleConfigChange('checkSyntax', e.target.checked)}
                  className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded"
                />
                <div className="flex items-center space-x-2 flex-1">
                  <BugAntIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    Syntax Check
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={validationConfig.securityScan}
                  onChange={(e) => handleConfigChange('securityScan', e.target.checked)}
                  className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded"
                />
                <div className="flex items-center space-x-2 flex-1">
                  <KeyIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    Security Scan
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={validationConfig.performanceCheck}
                  onChange={(e) => handleConfigChange('performanceCheck', e.target.checked)}
                  className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded"
                />
                <div className="flex items-center space-x-2 flex-1">
                  <FireIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    Performance Check
                  </span>
                </div>
              </label>

              <label className="flex items-center space-x-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={validationConfig.bestPractices}
                  onChange={(e) => handleConfigChange('bestPractices', e.target.checked)}
                  className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded"
                />
                <div className="flex items-center space-x-2 flex-1">
                  <SparklesIcon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
                    Best Practices
                  </span>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Validation Stats */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <h4 className="font-semibold text-slate-200 text-sm mb-4 flex items-center space-x-2">
            <ChartBarIcon className="w-4 h-4 text-slate-400" />
            <span>Validation Stats</span>
          </h4>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-blue-400 text-lg font-bold">{validationStats.totalRuns}</div>
              <div className="text-xs text-slate-400">Total Runs</div>
            </div>
            <div className="text-center">
              <div className="text-green-400 text-lg font-bold">{validationStats.successRate}%</div>
              <div className="text-xs text-slate-400">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-yellow-400 text-lg font-bold">{validationStats.avgIssues}</div>
              <div className="text-xs text-slate-400">Avg Issues</div>
            </div>
            <div className="text-center">
              <div className="text-slate-300 text-lg font-bold">
                {validationStats.lastRun ? validationStats.lastRun.toLocaleDateString() : 'Never'}
              </div>
              <div className="text-xs text-slate-400">Last Run</div>
            </div>
          </div>
        </div>

        {/* Quick Actions - Removed validation button, keeping only reset */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <h4 className="font-semibold text-slate-200 text-sm mb-4">Quick Actions</h4>
          
          <div className="space-y-3">
            <button
              className="w-full py-2 rounded-lg font-medium text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all duration-300 border border-slate-600/50"
              onClick={() => {
                // Reset validation result
                window.location.reload();
              }}
            >
              Reset & Start Over
            </button>
          </div>
        </div>

        {/* Validation Pipeline Indicator */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <h4 className="font-semibold text-slate-200 text-sm mb-3">Validation Pipeline</h4>
          <div className="space-y-2">
            {[
              { step: 'Syntax', status: validationConfig.checkSyntax ? 'enabled' : 'disabled', color: validationConfig.checkSyntax ? 'bg-green-400' : 'bg-slate-600' },
              { step: 'Security', status: validationConfig.securityScan ? 'enabled' : 'disabled', color: validationConfig.securityScan ? 'bg-blue-400' : 'bg-slate-600' },
              { step: 'Performance', status: validationConfig.performanceCheck ? 'enabled' : 'disabled', color: validationConfig.performanceCheck ? 'bg-yellow-400' : 'bg-slate-600' },
              { step: 'Best Practices', status: validationConfig.bestPractices ? 'enabled' : 'disabled', color: validationConfig.bestPractices ? 'bg-purple-400' : 'bg-slate-600' },
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${item.color} ${loading && item.status === 'enabled' ? 'animate-pulse' : ''}`}></div>
                <span className={`text-xs ${
                  item.status === 'enabled' ? 'text-slate-300' : 'text-slate-500'
                }`}>
                  {item.step}
                </span>
                <span className={`text-xs ml-auto ${
                  item.status === 'enabled' ? 'text-green-400' : 'text-slate-500'
                }`}>
                  {item.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}