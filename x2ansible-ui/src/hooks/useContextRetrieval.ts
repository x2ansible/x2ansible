import { useState, useCallback } from "react";

export function useContextRetrieval() {
  const [contextResult, setContextResult] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Provide types for the parameters: code is string, top_k is number
  const retrieveContext = useCallback(
    async (code: string, top_k: number = 5): Promise<any> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/context/query", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: code, top_k }),
        });
        const result = await response.json();
        setContextResult(result);
        return result;
      } catch (err: any) {
        setError(err.message || "Unknown error");
        setContextResult(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { contextResult, loading, error, retrieveContext };
}
