// src/hooks/useGeneratePlaybook.ts
import { useState, useCallback } from "react";

interface GenerateRequest {
  input_code: string;
  context?: string;
}

interface GenerateResponse {
  playbook: string;
  raw?: string;
  debug_info?: Record<string, any>;
}

export function useGeneratePlaybook() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateResponse | null>(null);

  // Optional: For aborting if needed
  const [controller, setController] = useState<AbortController | null>(null);

  const generate = useCallback(
    async (payload: GenerateRequest) => {
      setLoading(true);
      setError(null);
      setResult(null);

      const abortController = new AbortController();
      setController(abortController);

      try {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });

        // Defensive JSON parse
        let data;
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          data = await res.json();
        } else {
          throw new Error(await res.text());
        }

        if (!res.ok) {
          throw new Error(
            data?.error ||
              `Backend error: HTTP ${res.status} ${
                res.statusText || ""
              }`
          );
        }

        setResult(data as GenerateResponse);
      } catch (err: any) {
        if (err?.name === "AbortError") {
          setError("Request cancelled.");
        } else {
          setError(err?.message || "Failed to generate playbook.");
        }
      } finally {
        setLoading(false);
        setController(null);
      }
    },
    []
  );

  const cancel = useCallback(() => {
    controller?.abort();
  }, [controller]);

  return {
    generate,
    loading,
    error,
    result,
    cancel,
  };
}
