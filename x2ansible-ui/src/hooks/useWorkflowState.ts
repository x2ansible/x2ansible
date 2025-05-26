// src/hooks/useWorkflowState.ts
import { useState, useCallback } from 'react';

export interface WorkflowStepResult {
  stepIndex: number;
  status: 'success' | 'error' | 'processing' | 'pending';
  timestamp: number;
  duration_ms?: number;
  
  // Step-specific data
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

export interface WorkflowState {
  currentStep: number;
  stepResults: Map<number, WorkflowStepResult>;
  stepLogs: Map<number, string[]>;
  lastModified: number;
}

export const useWorkflowState = () => {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    currentStep: 0,
    stepResults: new Map(),
    stepLogs: new Map(),
    lastModified: Date.now()
  });

  // Navigate to a specific step (preserves all data)
  const goToStep = useCallback((stepIndex: number) => {
    setWorkflowState(prev => ({
      ...prev,
      currentStep: stepIndex,
      lastModified: Date.now()
    }));
  }, []);

  // Save result for current step
  const saveStepResult = useCallback((result: Omit<WorkflowStepResult, 'stepIndex' | 'timestamp'>) => {
    setWorkflowState(prev => {
      const newResults = new Map(prev.stepResults);
      newResults.set(prev.currentStep, {
        ...result,
        stepIndex: prev.currentStep,
        timestamp: Date.now()
      });
      
      return {
        ...prev,
        stepResults: newResults,
        lastModified: Date.now()
      };
    });
  }, []);

  // Add log message for current step
  const addStepLog = useCallback((message: string) => {
    setWorkflowState(prev => {
      const newLogs = new Map(prev.stepLogs);
      const currentLogs = newLogs.get(prev.currentStep) || [];
      const timestamp = new Date().toLocaleTimeString();
      newLogs.set(prev.currentStep, [...currentLogs, `[${timestamp}] ${message}`]);
      
      return {
        ...prev,
        stepLogs: newLogs,
        lastModified: Date.now()
      };
    });
  }, []);

  // Clear logs for current step
  const clearCurrentStepLogs = useCallback(() => {
    setWorkflowState(prev => {
      const newLogs = new Map(prev.stepLogs);
      newLogs.set(prev.currentStep, []);
      
      return {
        ...prev,
        stepLogs: newLogs,
        lastModified: Date.now()
      };
    });
  }, []);

  // Get result for specific step
  const getStepResult = useCallback((stepIndex: number): WorkflowStepResult | null => {
    return workflowState.stepResults.get(stepIndex) || null;
  }, [workflowState.stepResults]);

  // Get logs for specific step
  const getStepLogs = useCallback((stepIndex: number): string[] => {
    return workflowState.stepLogs.get(stepIndex) || [];
  }, [workflowState.stepLogs]);

  // Get current step data
  const getCurrentStepResult = useCallback((): WorkflowStepResult | null => {
    return getStepResult(workflowState.currentStep);
  }, [getStepResult, workflowState.currentStep]);

  const getCurrentStepLogs = useCallback((): string[] => {
    return getStepLogs(workflowState.currentStep);
  }, [getStepLogs, workflowState.currentStep]);

  // Check if step has been completed
  const isStepCompleted = useCallback((stepIndex: number): boolean => {
    const result = getStepResult(stepIndex);
    return result?.status === 'success';
  }, [getStepResult]);

  // Check if we can proceed to next step
  const canProceedToNext = useCallback((): boolean => {
    if (workflowState.currentStep >= 4) return false;
    
    const currentResult = getCurrentStepResult();
    if (!currentResult || currentResult.status !== 'success') return false;
    
    // Step-specific validation
    switch (workflowState.currentStep) {
      case 0: return currentResult.classification?.convertible === true;
      case 1: return (currentResult.context?.dependencies?.length || 0) > 0;
      case 2: return (currentResult.conversion?.generated_files?.length || 0) > 0;
      case 3: return currentResult.validation?.syntax_valid === true;
      case 4: return false; // Last step
      default: return false;
    }
  }, [workflowState.currentStep, getCurrentStepResult]);

  // Reset entire workflow
  const resetWorkflow = useCallback(() => {
    setWorkflowState({
      currentStep: 0,
      stepResults: new Map(),
      stepLogs: new Map(),
      lastModified: Date.now()
    });
  }, []);

  // Get workflow summary
  const getWorkflowSummary = useCallback(() => {
    const completedSteps = Array.from(workflowState.stepResults.entries())
      .filter(([_, result]) => result.status === 'success')
      .length;
    
    const totalLogs = Array.from(workflowState.stepLogs.values())
      .reduce((total, logs) => total + logs.length, 0);
    
    return {
      currentStep: workflowState.currentStep,
      completedSteps,
      totalSteps: 5,
      totalLogs,
      lastModified: workflowState.lastModified
    };
  }, [workflowState]);

  return {
    // State
    currentStep: workflowState.currentStep,
    workflowState,
    
    // Navigation
    goToStep,
    
    // Data management
    saveStepResult,
    addStepLog,
    clearCurrentStepLogs,
    
    // Getters
    getStepResult,
    getStepLogs,
    getCurrentStepResult,
    getCurrentStepLogs,
    
    // Validation
    isStepCompleted,
    canProceedToNext,
    
    // Utility
    resetWorkflow,
    getWorkflowSummary
  };
};


