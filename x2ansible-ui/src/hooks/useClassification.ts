import { useCallback } from "react";
import { ClassificationResponse } from "@/types/api";

interface UseClassificationProps {
  BACKEND_URL: string;
  code: string;
  setClassificationResult: (result: ClassificationResponse | null) => void;
  setStep: (step: number) => void;
  step: number;
  setLoading: (loading: boolean) => void;
  loading: boolean;
  addLog: (msg: string) => void;
}

export const useClassification = ({
  BACKEND_URL,
  code,
  setClassificationResult,
  setStep,
  step,
  setLoading,
  loading,
  addLog,
}: UseClassificationProps) => {
  const apiCall = async (url: string, opts: RequestInit = {}) => {
    const resp = await fetch(url, {
      ...opts,
      headers: { "Content-Type": "application/json", ...opts.headers },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    return resp.json();
  };

  const classifyCode = useCallback(async (input: string) => {
    if (!input.trim()) {
      addLog(" No code content to classify");
      return;
    }
    setLoading(true);
    addLog("🧠 Classifier agent starting...");

    try {
    
      const response = await apiCall(
        "/api/classify",
        { method: "POST", body: JSON.stringify({ code: input }) }
      );


      const result: ClassificationResponse = response?.data ?? response;

      if (!result || result.error) {
        throw new Error(result?.error || "No classification result received");
      }

      console.log(" Final parsed classification result:", result);

      setClassificationResult(result);
      addLog(" Classification completed successfully");

      if (result.duration_ms) {
        addLog(`⏱️ Classification took ${result.duration_ms.toFixed(1)}ms`);
      }
      if (result.speedup) {
        addLog(` Estimated ${result.speedup.toFixed(1)}x speedup vs manual review`);
      }

    } catch (error) {
      addLog(` Classification failed: ${(error as Error).message}`);
      setClassificationResult(null);
    } finally {
      setLoading(false);
    }
  }, [BACKEND_URL, addLog, setLoading, setClassificationResult, setStep, step, apiCall]);

  const handleManualClassify = useCallback(() => {
    if (loading) {
      addLog(" Classification already in progress");
      return;
    }
    if (!code.trim()) {
      addLog(" No code loaded. Please select or upload a file first");
      return;
    }
    classifyCode(code);
  }, [loading, code, addLog, classifyCode]);

  return {
    classifyCode,
    handleManualClassify,
  };
};