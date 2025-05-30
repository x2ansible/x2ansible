// hooks/useAdminConfig.ts
import { useState, useCallback } from 'react';

const API_BASE = '/api/admin';

// Types
interface AgentConfig {
  name: string;
  description: string;
  instructions: string;
  status: string;
  version: string;
  created_at: string;
  updated_at: string;
}

interface AgentConfigs {
  [key: string]: AgentConfig;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

interface AgentsResponse {
  agents: AgentConfigs;
  total: number;
}

interface UpdateResponse extends AgentConfig {
  agent_id: string;
  message: string;
}

interface HealthResponse {
  status: string;
  service: string;
  agents_count: number;
  config_status: {
    config_file: string;
    config_exists: boolean;
    config_readable: boolean;
    config_writable: boolean;
    agents_count: number;
    last_updated?: string;
    backup_dir: string;
    backup_dir_exists: boolean;
  };
  agents: string[];
}

export const useAdminConfig = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // Get all agent configurations
  const getAgentConfigs = useCallback(async (): Promise<AgentConfigs> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/agents`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      const data: AgentsResponse = await response.json();
      return data.agents || {};
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Get specific agent configuration
  const getAgentConfig = useCallback(async (agentId: string): Promise<AgentConfig & { agent_id: string }> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/agents/${agentId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Update agent instructions
  const updateAgentInstructions = useCallback(async (
    agentId: string, 
    instructions: string
  ): Promise<UpdateResponse> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/agents`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agent_id: agentId,
          instructions: instructions
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Reload configurations from file
  const reloadConfigs = useCallback(async (): Promise<AgentConfigs> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_BASE}/agents/reload`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      const data: AgentsResponse = await response.json();
      return data.agents || {};
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Export configuration
  const exportConfig = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      
      const response = await fetch(`${API_BASE}/agents/export`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      // Create download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `agent-config-${new Date().toISOString().split('T')[0]}.yaml`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, []);

  // Health check
  const healthCheck = useCallback(async (): Promise<HealthResponse> => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      return await response.json();
      
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(message);
      throw err;
    }
  }, []);

  return {
    loading,
    error,
    clearError,
    getAgentConfigs,
    getAgentConfig,
    updateAgentInstructions,
    reloadConfigs,
    exportConfig,
    healthCheck
  } as const;
};

// Export types for use in components
export type { AgentConfig, AgentConfigs, HealthResponse };