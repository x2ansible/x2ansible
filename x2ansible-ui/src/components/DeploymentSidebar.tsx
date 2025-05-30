import React from 'react';
import {
  RocketLaunchIcon,
  BuildingOfficeIcon,
  ComputerDesktopIcon,
  Cog6ToothIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from "@heroicons/react/24/outline";

interface DeploymentSidebarProps {
  deploymentConfig: {
    environment: 'development' | 'staging' | 'production';
    deploymentMode: 'aap' | 'direct';
    targetHosts: string[];
    rollbackStrategy: 'immediate' | 'gradual' | 'none';
    notifications: boolean;
  };
  setDeploymentConfig: (config: any) => void;
  playbookReady: boolean;
}

export default function DeploymentSidebar({ 
  deploymentConfig, 
  setDeploymentConfig, 
  playbookReady 
}: DeploymentSidebarProps) {
  
  const handleConfigChange = (key: string, value: any) => {
    setDeploymentConfig({
      ...deploymentConfig,
      [key]: value
    });
  };

  const handleHostsChange = (hosts: string) => {
    const hostList = hosts.split(',').map(h => h.trim()).filter(Boolean);
    handleConfigChange('targetHosts', hostList);
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-r border-slate-600/30">
      <div className="p-6 space-y-6 h-full overflow-y-auto context-sidebar-scrollbar">
        
        {/* Header */}
        <div className="relative">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
              <RocketLaunchIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white">Deployment Configuration</h3>
              <p className="text-xs text-slate-400">Configure deployment settings</p>
            </div>
          </div>
        </div>

        {/* Playbook Status */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <div className="flex items-center space-x-2 mb-3">
            {playbookReady ? (
              <CheckCircleIcon className="w-5 h-5 text-green-400" />
            ) : (
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
            )}
            <h4 className="font-semibold text-slate-200 text-sm">Playbook Status</h4>
          </div>
          <div className="text-xs text-slate-300">
            {playbookReady ? (
              <span className="text-green-300">✅ Playbook ready for deployment</span>
            ) : (
              <span className="text-yellow-300">⚠️ Complete previous steps first</span>
            )}
          </div>
        </div>

        {/* Deployment Mode */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <div className="flex items-center space-x-2 mb-4">
            <Cog6ToothIcon className="w-4 h-4 text-slate-400" />
            <h4 className="font-semibold text-slate-200 text-sm">Deployment Mode</h4>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="radio"
                value="direct"
                checked={deploymentConfig.deploymentMode === 'direct'}
                onChange={(e) => handleConfigChange('deploymentMode', e.target.value)}
                className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600"
              />
              <div className="flex items-center space-x-2">
                <ComputerDesktopIcon className="w-4 h-4 text-green-400" />
                <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Direct SSH</span>
              </div>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer group">
              <input
                type="radio"
                value="aap"
                checked={deploymentConfig.deploymentMode === 'aap'}
                onChange={(e) => handleConfigChange('deploymentMode', e.target.value)}
                className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600"
              />
              <div className="flex items-center space-x-2">
                <BuildingOfficeIcon className="w-4 h-4 text-indigo-400" />
                <span className="text-xs text-slate-300 group-hover:text-white transition-colors">AAP Controller</span>
              </div>
            </label>
          </div>
        </div>

        {/* Environment */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <label className="block text-xs font-medium text-slate-300 mb-2">Environment</label>
          <select
            value={deploymentConfig.environment}
            onChange={(e) => handleConfigChange('environment', e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-600/50 bg-slate-700/50 text-slate-200 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors"
          >
            <option value="development">Development</option>
            <option value="staging">Staging</option>
            <option value="production">Production</option>
          </select>
        </div>

        {/* Target Hosts (for Direct mode) */}
        {deploymentConfig.deploymentMode === 'direct' && (
          <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
            <label className="block text-xs font-medium text-slate-300 mb-2">Target Hosts</label>
            <textarea
              value={deploymentConfig.targetHosts.join(', ')}
              onChange={(e) => handleHostsChange(e.target.value)}
              placeholder="host1.example.com, host2.example.com"
              className="w-full p-2 text-xs rounded-lg border border-slate-600/50 bg-slate-700/50 text-slate-200 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors h-20 resize-none"
            />
            <div className="text-xs text-slate-500 mt-1">
              Comma-separated list of target hosts
            </div>
          </div>
        )}

        {/* Rollback Strategy */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <label className="block text-xs font-medium text-slate-300 mb-2">Rollback Strategy</label>
          <select
            value={deploymentConfig.rollbackStrategy}
            onChange={(e) => handleConfigChange('rollbackStrategy', e.target.value)}
            className="w-full p-2 text-xs rounded-lg border border-slate-600/50 bg-slate-700/50 text-slate-200 focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/25 transition-colors"
          >
            <option value="immediate">Immediate</option>
            <option value="gradual">Gradual</option>
            <option value="none">None</option>
          </select>
        </div>

        {/* Notifications */}
        <div className="bg-gradient-to-br from-slate-800/50 to-slate-700/30 rounded-xl border border-slate-600/30 p-4">
          <label className="flex items-center space-x-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={deploymentConfig.notifications}
              onChange={(e) => handleConfigChange('notifications', e.target.checked)}
              className="w-4 h-4 text-blue-500 bg-slate-700 border-slate-600 rounded focus:ring-blue-400/25 focus:ring-2"
            />
            <span className="text-xs text-slate-300 group-hover:text-white transition-colors">Enable Notifications</span>
          </label>
          <div className="text-xs text-slate-500 mt-1 ml-7">
            Get notified about deployment status
          </div>
        </div>

      </div>
    </div>
  );
}