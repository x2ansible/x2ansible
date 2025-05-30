import React, { useState } from 'react';
import ValidationSidebar from './ValidationSidebar';
import ValidationPanel from './ValidationPanel';

interface ValidationContainerProps {
  playbook?: string;
  onLogMessage?: (message: string) => void;
}

const ValidationContainer: React.FC<ValidationContainerProps> = ({
  playbook = "",
  onLogMessage
}) => {
  // Validation configuration state
  const [validationConfig, setValidationConfig] = useState({
    checkSyntax: true,
    securityScan: true,
    performanceCheck: false,
    bestPractices: true,
    customRules: []
  });

  // Profile selection state - this connects the sidebar and panel
  const [selectedProfile, setSelectedProfile] = useState<string>('production');
  
  // Validation result state
  const [validationResult, setValidationResult] = useState<any>(null);
  const [validationLoading, setValidationLoading] = useState(false);

  // Handle profile change from sidebar
  const handleProfileChange = (profile: string) => {
    setSelectedProfile(profile);
    if (onLogMessage) {
      onLogMessage(`🔧 Switched to ${profile} profile`);
    }
  };

  // Handle validation completion
  const handleValidationComplete = (result: any) => {
    setValidationResult(result);
    setValidationLoading(false);
  };

  return (
    <div className="flex h-full">
      {/* Sidebar - Connected to profile selection */}
      <div className="w-80 flex-shrink-0">
        <ValidationSidebar
          validationConfig={validationConfig}
          setValidationConfig={setValidationConfig}
          validationResult={validationResult}
          loading={validationLoading}
          selectedProfile={selectedProfile}
          onProfileChange={handleProfileChange}
        />
      </div>
      
      {/* Main Panel - Uses selected profile */}
      <div className="flex-1 p-6">
        <ValidationPanel
          playbook={playbook}
          validationConfig={validationConfig}
          onLogMessage={onLogMessage}
          onValidationComplete={handleValidationComplete}
          selectedProfile={selectedProfile}
        />
      </div>
    </div>
  );
};

export default ValidationContainer;