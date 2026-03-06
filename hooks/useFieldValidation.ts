/// hooks/useFieldValidation.ts
import { useState, useCallback } from "react";

export function useFieldValidation<T>(
  initialValue: T,
  validate: (value: T) => boolean,
) {
  const [value, setValue]     = useState<T>(initialValue);
  const [hasError, setHasError] = useState(false);

  const handleChange = useCallback(
    (newValue: T) => {
      setValue(newValue);
      if (validate(newValue)) setHasError(false);
    },
    [validate],
  );

  const trigger = useCallback(() => {
    const valid = validate(value);
    setHasError(!valid);
    return valid;
  }, [value, validate]);

  return { value, hasError, handleChange, trigger };
}
