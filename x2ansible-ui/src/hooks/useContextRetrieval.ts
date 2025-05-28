// x2ansible-ui/src/hooks/useContextRetrieval.ts

import { useState, useCallback } from "react";

export function useContextRetrieval() {
  const [contextResult, setContextResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const retrieveContext = useCallback(async (code, top_k = 5) => {
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
    } catch (err) {
      setError(err.message);
      setContextResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { contextResult, loading, error, retrieveContext };
}
