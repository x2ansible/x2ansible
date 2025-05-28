import { useState, useCallback } from "react";

export interface SpecRequest {
  code: string;
  context?: string;
  code_summary?: string;
}

export interface SpecResponse {
  spec_text: string;
  requirements: string[];
  goals: string[];
  constraints: string[];
  infrastructure_components: string[];
  conversion_strategy: string;
  complexity_assessment: string;
  estimated_tasks: number;
}

export function useSpecGenerate() {
  const [spec, setSpec] = useState<SpecResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSpec = useCallback(async (
    code: string, 
    context?: string, 
    code_summary?: string
  ): Promise<SpecResponse | null> => {
    setLoading(true);
    setError(null);
    setSpec(null);
    
    try {
      const payload: SpecRequest = { code };
      if (context) payload.context = context;
      if (code_summary) payload.code_summary = code_summary;
      
      console.log('🔄 Generating spec with payload:', { 
        codeLength: code.length,
        hasContext: !!context,
        hasSummary: !!code_summary 
      });
      
      const response = await fetch("/api/spec/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Backend returned ${response.status}: ${errorText}`);
      }
      
      const data: SpecResponse = await response.json();
      
      console.log('✅ Spec generated:', {
        specLength: data.spec_text.length,
        requirements: data.requirements.length,
        complexity: data.complexity_assessment,
        estimatedTasks: data.estimated_tasks
      });
      
      setSpec(data);
      return data;
      
    } catch (err: any) {
      const errorMsg = err?.message 
        ? `Failed to generate spec: ${err.message}`
        : "Unknown error while generating spec";
      
      console.error('❌ Spec generation failed:', err);
      setError(errorMsg);
      setSpec(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearSpec = useCallback(() => {
    setSpec(null);
    setError(null);
  }, []);

  return { 
    spec, 
    setSpec, 
    loading, 
    error, 
    generateSpec,
    clearSpec,
    
    // Convenience getters for backward compatibility
    specText: spec?.spec_text || "",
    complexity: spec?.complexity_assessment || "Medium",
    estimatedTasks: spec?.estimated_tasks || 0,
    requirements: spec?.requirements || [],
    goals: spec?.goals || [],
    constraints: spec?.constraints || [],
    components: spec?.infrastructure_components || []
  };
}