import { useState, useCallback } from "react";

export interface SpecRequest {
  code: string;
  context: string;
}

export interface SpecResponse {
  spec_text: string;
}

export function useSpecGenerate() {
  const [spec, setSpec] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSpec = useCallback(async (code: string, context: string) => {
    setLoading(true);
    setError(null);
    setSpec(null);
    try {
      const response = await fetch("/api/spec/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, context }),
      });
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`);
      }
      const data: SpecResponse = await response.json();
      setSpec(data.spec_text || "");
      return data.spec_text || "";
    } catch (err: any) {
      setError(
        err?.message
          ? `Failed to generate spec: ${err.message}`
          : "Unknown error while generating spec"
      );
      setSpec(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { spec, setSpec, loading, error, generateSpec };
}
