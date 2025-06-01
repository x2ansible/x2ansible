import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';

import {
  Clock,
  Zap,
  CheckCircle,
  XCircle,
  Settings,
  FileCode,
  GitBranch,
  AlertTriangle,
  Info
} from 'lucide-react';

export interface ClassificationResult {
  classification: string;
  summary?: string;
  detailed_analysis?: string;
  resources?: string[];
  key_operations?: string[];
  dependencies?: string;
  configuration_details?: string;
  complexity_level?: string;
  convertible?: boolean; // Made optional to match ClassificationResponse
  conversion_notes?: string;
  duration_ms?: number;
  manual_estimate_ms?: number;
  speedup?: number;
}

type Tab = 'overview' | 'resources' | 'operations' | 'conversion';

const ClassificationPanel: React.FC<{ 
  classificationResult?: ClassificationResult;
  selectedFile?: string;
  selectedGitFile?: string;
  code?: string;
  loading?: boolean;
  step?: number;
}> = ({ classificationResult }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showComplexityDesc, setShowComplexityDesc] = useState(false);

  if (!classificationResult) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900">
        <div className="text-center text-gray-400">
          <FileCode size={48} className="mx-auto mb-4 text-gray-600" />
          <p className="text-lg text-gray-300">Analysis has not been performed yet.</p>
          <p className="text-sm mt-2 text-gray-500">Upload and analyze a file to see the results here.</p>
        </div>
      </div>
    );
  }

  const result = classificationResult;

  // Split the complexity_level into the label and description (if any)
  const complexityLabel = (result.complexity_level || 'Unknown').split(' ')[0];
  const complexityRest = (result.complexity_level || '').split(' ').slice(1).join(' ').trim();

  const getComplexityColor = (level?: string) => {
    switch ((level || '').toLowerCase()) {
      case 'simple': return 'text-green-400 bg-green-900/30 border-green-500/30';
      case 'moderate': return 'text-yellow-400 bg-yellow-900/30 border-yellow-500/30';
      case 'complex': return 'text-red-400 bg-red-900/30 border-red-500/30';
      default: return 'text-gray-400 bg-gray-800/50 border-gray-600/30';
    }
  };

  const getComplexityIcon = (level?: string) => {
    switch ((level || '').toLowerCase()) {
      case 'simple': return '🟢';
      case 'moderate': return '🟡';
      case 'complex': return '🔴';
      default: return '⚪';
    }
  };

  const formatTime = (ms?: number) => {
    if (ms == null) return 'N/A';
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Handle optional convertible property with fallback
  const isConvertible = result.convertible ?? false;

  const TabButton: React.FC<{
    id: Tab;
    label: string;
    icon: React.ComponentType<any>;
    active: boolean;
    onClick: (id: Tab) => void;
  }> = ({ id, label, icon: Icon, active, onClick }) => (
    <button
      onClick={() => onClick(id)}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
        active
          ? 'bg-blue-900/50 text-blue-300 shadow-sm border border-blue-500/30'
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-gray-300'
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );

  return (
    <div className="w-full h-full flex flex-col bg-gray-900 text-white">
      {/* Header, Stats, Tabs: non-scrolling area */}
      <div className="flex-shrink-0">
        {/* Header */}
        <div className="border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-100 flex items-center gap-2">
                <FileCode className="text-blue-400" size={20} />
                Analysis Results
              </h2>
              <p className="text-gray-400 mt-1 text-sm">Infrastructure-as-Code Analysis</p>
            </div>
            <div className="flex items-center gap-3">
              {result.speedup != null && (
                <div className="text-right">
                  <div className="text-xs text-gray-500">Analysis Speed</div>
                  <div className="text-lg font-bold text-green-400">
                    {result.speedup.toFixed(1)}x faster
                  </div>
                </div>
              )}
              <div className="w-10 h-10 bg-blue-900/30 rounded-full flex items-center justify-center border border-blue-500/30">
                <Zap className="text-blue-400" size={16} />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats - Compact Layout */}
        <div className="p-4 bg-gray-800/50 border-b border-gray-700">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-lg font-bold text-blue-400 capitalize truncate">
                {result.classification || 'Unknown'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Tool/Language</div>
            </div>
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                isConvertible 
                  ? 'bg-green-900/30 text-green-400 border border-green-500/30' 
                  : 'bg-red-900/30 text-red-400 border border-red-500/30'
              }`}>
                {isConvertible ? <CheckCircle size={12} /> : <XCircle size={12} />}
                {isConvertible ? 'Yes' : 'No'}
              </div>
              <div className="text-xs text-gray-500 mt-1">Convertible</div>
            </div>
            {/* Complexity stat, info icon shows popover */}
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50 relative">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getComplexityColor(complexityLabel)}`}>
                <span className="text-xs">{getComplexityIcon(complexityLabel)}</span>
                <span className="truncate">{complexityLabel}</span>
                {(complexityRest || result.detailed_analysis) && (
                  <button
                    className="ml-1 text-gray-400 hover:text-blue-300"
                    onClick={e => { e.stopPropagation(); setShowComplexityDesc(v => !v); }}
                    title="Show complexity details"
                    aria-label="Show complexity details"
                    tabIndex={0}
                    type="button"
                  >
                    <Info size={14} />
                  </button>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">Complexity</div>
              {/* Popover with the detailed description */}
              {showComplexityDesc && (
                <div
                  className="absolute left-1/2 top-full z-50 mt-2 w-80 -translate-x-1/2 bg-gray-900 text-gray-100 border border-gray-700 rounded-xl shadow-xl px-4 py-3 text-xs text-left"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-blue-300">Complexity Details</span>
                    <button className="ml-2 px-1 text-gray-400 hover:text-blue-300" onClick={() => setShowComplexityDesc(false)}>
                      ×
                    </button>
                  </div>
                  <div className="whitespace-pre-line">
                    {(complexityRest ? complexityRest + "\n" : "") + (result.detailed_analysis || '') || 'No details.'}
                  </div>
                </div>
              )}
            </div>
            <div className="text-center bg-gray-800/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-sm font-bold text-gray-300 flex items-center justify-center gap-1">
                <Clock size={12} />
                <span>{formatTime(result.duration_ms)}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">Analysis Time</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 pt-3">
          <div className="flex gap-1 overflow-x-auto">
            <TabButton id="overview"    label="Overview"   icon={FileCode}     active={activeTab === 'overview'}    onClick={setActiveTab} />
            <TabButton id="resources"   label="Resources"  icon={Settings}     active={activeTab === 'resources'}   onClick={setActiveTab} />
            <TabButton id="operations"  label="Operations" icon={GitBranch}    active={activeTab === 'operations'}  onClick={setActiveTab} />
            <TabButton id="conversion"  label="Conversion" icon={AlertTriangle} active={activeTab === 'conversion'} onClick={setActiveTab} />
          </div>
        </div>
      </div>

      {/* Tab content: scrollable and fills remaining space */}
      <div className="flex-1 min-h-0 overflow-y-auto rh-scrollbar px-4 py-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {result.summary && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-2">Summary</h3>
                <p className="text-gray-300 bg-blue-900/20 p-3 rounded-lg border-l-4 border-blue-500 text-sm leading-relaxed">
                  {result.summary}
                </p>
              </div>
            )}
            {result.detailed_analysis && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-2">Detailed Analysis</h3>
                <div className="prose prose-invert bg-gray-900 rounded-lg border border-gray-700/70 p-4 text-sm max-w-none overflow-x-auto">
                  <ReactMarkdown>{result.detailed_analysis}</ReactMarkdown>
                </div>
              </div>
            )}

            {result.dependencies && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-2">Dependencies</h3>
                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-amber-300 text-sm">{result.dependencies}</p>
                </div>
              </div>
            )}
            {result.configuration_details && (
              <div>
                <h3 className="text-base font-semibold text-gray-200 mb-2">Configuration Details</h3>
                <div className="bg-gray-800/50 border border-gray-600/50 rounded-lg p-3">
                  <code className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                    {result.configuration_details}
                  </code>
                </div>
              </div>
            )}
            {!result.summary && !result.detailed_analysis && !result.dependencies && !result.configuration_details && (
              <div className="text-center text-gray-500 py-8">
                <p className="text-sm">No detailed analysis available for this classification.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'resources' && (
          <div>
            <h3 className="text-base font-semibold text-gray-200 mb-3">Resources & Components</h3>
            {result.resources?.length ? (
              <div className="space-y-2">
                {result.resources.map((r, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="text-gray-300 text-sm">{r}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Settings size={32} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm">No resources information available.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'operations' && (
          <div>
            <h3 className="text-base font-semibold text-gray-200 mb-3">Key Operations</h3>
            {result.key_operations?.length ? (
              <div className="space-y-2">
                {result.key_operations.map((op, i) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-green-900/20 rounded-lg border-l-4 border-green-500/50">
                    <div className="text-green-400 font-bold text-xs flex-shrink-0 mt-0.5 bg-green-900/30 px-1.5 py-0.5 rounded">
                      {String(i + 1).padStart(2, '0')}
                    </div>
                    <div className="text-gray-300 text-sm">{op}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <GitBranch size={32} className="mx-auto mb-3 text-gray-600" />
                <p className="text-sm">No operations information available.</p>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'conversion' && (
          <div className="space-y-4">
            <div className={`p-3 rounded-lg border-l-4 ${
              isConvertible
                ? 'bg-green-900/20 border-green-500 border-green-500/50'
                : 'bg-red-900/20 border-red-500 border-red-500/50'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {isConvertible ? (
                  <CheckCircle className="text-green-400" size={16} />
                ) : (
                  <XCircle className="text-red-400" size={16} />
                )}
                <h3 className={`font-semibold text-sm ${
                  isConvertible ? 'text-green-300' : 'text-red-300'
                }`}>
                  {isConvertible ? 'Conversion Possible' : 'Conversion Not Recommended'}
                </h3>
              </div>
              <p className={`text-sm ${isConvertible ? 'text-green-200' : 'text-red-200'}`}>
                {result.conversion_notes || 'No conversion notes available.'}
              </p>
            </div>
            
            {(result.duration_ms != null || result.manual_estimate_ms != null || result.speedup != null) && (
              <div className="bg-gray-800/30 p-3 rounded-lg border border-gray-700/50">
                <h4 className="font-semibold text-gray-200 mb-3 text-sm">Performance Comparison</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="text-lg font-bold text-blue-400">
                      {formatTime(result.duration_ms)}
                    </div>
                    <div className="text-xs text-gray-500">AI Analysis</div>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="text-lg font-bold text-orange-400">
                      {formatTime(result.manual_estimate_ms)}
                    </div>
                    <div className="text-xs text-gray-500">Manual Review</div>
                  </div>
                  <div className="text-center p-2 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="text-lg font-bold text-green-400">
                      {result.speedup ? `${result.speedup.toFixed(1)}x` : 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">Speed Improvement</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassificationPanel;