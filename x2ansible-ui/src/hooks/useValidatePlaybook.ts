import { useState, useCallback } from 'react';

interface ValidatePlaybookResult {
  passed: boolean;
  summary: string;
  issues: Array<any>;
  raw_output: string;
  debug_info: any;
}

interface ValidationRequest {
  playbook: string;
  lint_profile?: string;
}

export const useValidatePlaybook = () => {
  const [validationResult, setValidationResult] = useState<ValidatePlaybookResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const validatePlaybook = useCallback(
    async ({ playbook, lint_profile = "production" }: ValidationRequest) => {
      setIsValidating(true);
      setValidationError(null);

      try {
        const response = await fetch('/api/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playbook, lint_profile }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Validation API error: ${response.status} - ${errorText}`);
        }

        const result: ValidatePlaybookResult = await response.json();
        setValidationResult(result);
      } catch (error: any) {
        setValidationError(error.message);
      } finally {
        setIsValidating(false);
      }
    },
    [],
  );

  return {
    validationResult,
    isValidating,
    validationError,
    validatePlaybook,
  };
};