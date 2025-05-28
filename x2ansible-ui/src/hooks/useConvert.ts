// src/hooks/useConvert.ts
import { useState } from "react";

export function useConvert(BACKEND_URL: string) {
  const [loading, setLoading] = useState(false);
  const [playbook, setPlaybook] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const convert = async (code: string, context: string) => {
    setLoading(true);
    setError(null);
    setPlaybook(null);
    try {
      const resp = await fetch(`${BACKEND_URL}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_code: code, context }),
      });
      if (!resp.ok) throw new Error(await resp.text());
      const data = await resp.json();
      setPlaybook(data.playbook || "");
    } catch (e: any) {
      setError(e.message || "Conversion failed");
    } finally {
      setLoading(false);
    }
  };

  return { loading, playbook, error, convert };
}
