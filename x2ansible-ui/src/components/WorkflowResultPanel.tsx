// src/components/WorkflowResultPanel.tsx
"use client";

interface WorkflowResult {
  // Common fields for all agents
  status: 'success' | 'error' | 'processing' | 'pending';
  duration_ms?: number;
  agent_type: 'classifier' | 'context' | 'converter' | 'validator' | 'deployer';
  
  // Agent-specific results
  classification?: {
    tool_language: string;
    summary: string;
    convertible: boolean;
    manual_estimate_ms: number;
    speedup: number;
  };
  
  context?: {
    dependencies: string[];
    environment: string;
    requirements: string[];
    recommendations: string[];
  };
  
  conversion?: {
    output_format: string;
    conversion_type: string;
    generated_files: string[];
    warnings: string[];
  };
  
  validation?: {
    syntax_valid: boolean;
    security_issues: string[];
    best_practices: string[];
    test_results: any[];
  };
  
  deployment?: {
    target_environment: string;
    deployment_url?: string;
    status: string;
    rollback_available: boolean;
  };
  
  error?: string;
}

interface WorkflowResultPanelProps {
  currentStep: number;
  workflowResult: WorkflowResult | null;
  selectedFile: string;
  selectedGitFile: string;
  code: string;
  loading: boolean;
}

const stepConfig = {
  0: { title: "Classification Result", icon: "🔍", color: "blue" },
  1: { title: "Context Analysis", icon: "📋", color: "purple" },
  2: { title: "Conversion Result", icon: "⚙️", color: "orange" },
  3: { title: "Validation Report", icon: "✅", color: "green" },
  4: { title: "Deployment Status", icon: "🚀", color: "red" }
};

export default function WorkflowResultPanel({
  currentStep,
  workflowResult,
  selectedFile,
  selectedGitFile,
  code,
  loading,
}: WorkflowResultPanelProps) {
  const config = stepConfig[currentStep as keyof typeof stepConfig];
  
  const formatResult = (result: WorkflowResult) => {
    let display = `${config.icon} ${config.title}\n\n`;
    
    // Common info
    if (result.duration_ms) {
      display += `⏱️ Processing Time: ${result.duration_ms.toFixed(1)}ms\n`;
    }
    display += `📊 Status: ${result.status.toUpperCase()}\n\n`;
    
    // Step-specific formatting
    switch (currentStep) {
      case 0: // Classification
        if (result.classification) {
          display += `🔍 Tool/Language: ${result.classification.tool_language}\n`;
          display += `📝 Summary: ${result.classification.summary}\n`;
          display += `✅ Convertible: ${result.classification.convertible ? 'Yes' : 'No'}\n`;
          display += `👨‍💻 Manual Estimate: ${(result.classification.manual_estimate_ms / 1000 / 60).toFixed(1)} minutes\n`;
          display += `🚀 Speedup: ${result.classification.speedup.toFixed(1)}x faster\n`;
        }
        break;
        
      case 1: // Context
        if (result.context) {
          display += `📦 Dependencies: ${result.context.dependencies.join(', ')}\n`;
          display += `🌍 Environment: ${result.context.environment}\n`;
          display += `📋 Requirements:\n`;
          result.context.requirements.forEach(req => display += `  • ${req}\n`);
          display += `💡 Recommendations:\n`;
          result.context.recommendations.forEach(rec => display += `  • ${rec}\n`);
        }
        break;
        
      case 2: // Conversion
        if (result.conversion) {
          display += `📄 Output Format: ${result.conversion.output_format}\n`;
          display += `🔄 Conversion Type: ${result.conversion.conversion_type}\n`;
          display += `📁 Generated Files: ${result.conversion.generated_files.length}\n`;
          result.conversion.generated_files.forEach(file => display += `  • ${file}\n`);
          if (result.conversion.warnings.length > 0) {
            display += `⚠️ Warnings:\n`;
            result.conversion.warnings.forEach(warn => display += `  • ${warn}\n`);
          }
        }
        break;
        
      case 3: // Validation
        if (result.validation) {
          display += `✅ Syntax Valid: ${result.validation.syntax_valid ? 'Yes' : 'No'}\n`;
          display += `🔒 Security Issues: ${result.validation.security_issues.length}\n`;
          result.validation.security_issues.forEach(issue => display += `  • ${issue}\n`);
          display += `📏 Best Practices: ${result.validation.best_practices.length} checks\n`;
          result.validation.best_practices.forEach(practice => display += `  • ${practice}\n`);
        }
        break;
        
      case 4: // Deployment
        if (result.deployment) {
          display += `🌍 Target Environment: ${result.deployment.target_environment}\n`;
          display += `📊 Status: ${result.deployment.status}\n`;
          if (result.deployment.deployment_url) {
            display += `🔗 URL: ${result.deployment.deployment_url}\n`;
          }
          display += `↩️ Rollback Available: ${result.deployment.rollback_available ? 'Yes' : 'No'}\n`;
        }
        break;
    }
    
    if (result.error) {
      display += `\n❌ Error: ${result.error}\n`;
    }
    
    return display;
  };

  const getColorClasses = (color: string) => {
    const colorMap = {
      blue: { dot: "bg-blue-500", loading: "border-blue-400", loadingText: "text-blue-300" },
      purple: { dot: "bg-purple-500", loading: "border-purple-400", loadingText: "text-purple-300" },
      orange: { dot: "bg-orange-500", loading: "border-orange-400", loadingText: "text-orange-300" },
      green: { dot: "bg-green-500", loading: "border-green-400", loadingText: "text-green-300" },
      red: { dot: "bg-red-500", loading: "border-red-400", loadingText: "text-red-300" }
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.blue;
  };

  const colors = getColorClasses(config.color);

  return (
    <div className="bg-gray-800 dark:bg-gray-800 border border-gray-600 dark:border-gray-600 rounded-lg shadow-sm flex flex-col h-full">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-600 dark:border-gray-600 bg-gray-700 dark:bg-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 ${colors.dot} rounded-full ${loading ? 'animate-pulse' : ''}`}></div>
          <h2 className="text-sm font-semibold text-white dark:text-white">{config.title}</h2>
        </div>
        <span className="text-xs text-gray-300 dark:text-gray-300">
          {selectedFile || selectedGitFile || "No file selected"}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 p-0 overflow-hidden">
        {loading && (
          <div className={`flex items-center gap-2 m-4 p-3 bg-${config.color}-900/20 dark:bg-${config.color}-900/20 rounded border border-${config.color}-700 dark:border-${config.color}-700`}>
            <div className={`animate-spin h-4 w-4 border-2 ${colors.loading} border-t-transparent rounded-full`}></div>
            <span className={`text-sm ${colors.loadingText} dark:${colors.loadingText}`}>
              {currentStep === 0 && "Analyzing code..."}
              {currentStep === 1 && "Gathering context..."}
              {currentStep === 2 && "Converting code..."}
              {currentStep === 3 && "Validating output..."}
              {currentStep === 4 && "Deploying..."}
            </span>
          </div>
        )}

        <div className="h-full bg-gray-900 dark:bg-gray-900 text-gray-100 dark:text-gray-100 relative">
          <div className="absolute inset-0 overflow-auto rh-scrollbar">
            <pre className="p-4 text-sm font-mono leading-relaxed whitespace-pre-wrap min-w-max">
              {workflowResult
                ? formatResult(workflowResult)
                : code
                ? `Click the ${config.title.split(' ')[0]} button to start ${config.title.toLowerCase()}.`
                : "← Upload or select a file to begin."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

// src/components/WorkflowLogPanel.tsx
"use client";

interface WorkflowLogPanelProps {
  logMessages: string[];
  setLogMessages: (messages: string[]) => void;
  currentStep: number;
}

const stepLogConfig = {
  0: { title: "Classification Log", icon: "🔍", color: "blue" },
  1: { title: "Context Analysis Log", icon: "📋", color: "purple" },
  2: { title: "Conversion Log", icon: "⚙️", color: "orange" },
  3: { title: "Validation Log", icon: "✅", color: "green" },
  4: { title: "Deployment Log", icon: "🚀", color: "red" }
};

export default function WorkflowLogPanel({ logMessages, setLogMessages, currentStep }: WorkflowLogPanelProps) {
  const config = stepLogConfig[currentStep as keyof typeof stepLogConfig];
  
  return (
    <div className="bg-gray-800 dark:bg-gray-800 border border-gray-600 dark:border-gray-600 rounded-lg shadow-sm flex flex-col h-full">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-600 dark:border-gray-600 bg-gray-700 dark:bg-gray-700">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 bg-${config.color}-500 rounded-full animate-pulse`}></div>
          <h2 className="text-sm font-semibold text-white dark:text-white">{config.icon} {config.title}</h2>
        </div>
        <button
          onClick={() => setLogMessages([])}
          className="text-xs text-gray-300 hover:text-white dark:text-gray-300 dark:hover:text-white px-2 py-1 hover:bg-gray-600 dark:hover:bg-gray-600 rounded transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-0 overflow-hidden">
        <div className="h-full bg-gray-900 dark:bg-gray-900 text-gray-100 dark:text-gray-100 relative">
          <div className="absolute inset-0 overflow-auto rh-scrollbar">
            <div className="p-4 space-y-1 min-w-max">
              {logMessages.length === 0 ? (
                <div className="text-gray-400 dark:text-gray-400 text-sm italic py-8 text-center">
                  No {config.title.toLowerCase()} yet...
                </div>
              ) : (
                logMessages.map((log, i) => (
                  <div 
                    key={i} 
                    className="text-sm font-mono text-gray-100 dark:text-gray-100 hover:bg-gray-800 dark:hover:bg-gray-800 px-2 py-1 rounded transition-colors whitespace-nowrap"
                  >
                    • {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}