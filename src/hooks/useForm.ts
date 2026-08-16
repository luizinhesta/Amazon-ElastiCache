import { useState, useCallback } from 'react';

interface UseFormOptions<T> {
  initialValues: T;
  onSubmit: (values: T) => Promise<void>;
  validate?: (values: T) => Record<string, string | null>;
}

interface UseFormReturn<T> {
  values: T;
  errors: Record<string, string | null>;
  isLoading: boolean;
  error: string | null;
  success: string | null;
  handleChange: (field: keyof T, value: T[keyof T]) => void;
  handleSubmit: () => Promise<void>;
  setError: (error: string | null) => void;
  setSuccess: (message: string | null) => void;
  resetForm: () => void;
}

export function useForm<T extends Record<string, unknown>>(
  options: UseFormOptions<T>
): UseFormReturn<T> {
  const { initialValues, onSubmit, validate } = options;
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleChange = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues(prev => ({ ...prev, [field]: value }));
    // Clear field error when user types
    setErrors(prev => ({ ...prev, [field as string]: null }));
    setError(null);
  }, []);

  const handleSubmit = useCallback(async () => {
    setError(null);
    setSuccess(null);

    // Run validation if provided
    if (validate) {
      const validationErrors = validate(values);
      const hasErrors = Object.values(validationErrors).some(e => e !== null);
      if (hasErrors) {
        setErrors(validationErrors);
        return;
      }
    }

    setIsLoading(true);
    try {
      await onSubmit(values);
    } catch (err: unknown) {
      // Re-throw so the caller can handle specific errors
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [values, validate, onSubmit]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setError(null);
    setSuccess(null);
    setIsLoading(false);
  }, [initialValues]);

  return {
    values,
    errors,
    isLoading,
    error,
    success,
    handleChange,
    handleSubmit,
    setError,
    setSuccess,
    resetForm,
  };
}
