import { z } from 'zod';
import { UseFormReturn, FieldPath, FieldValues } from 'react-hook-form';

/**
 * Generic form error handler for react-hook-form with Zod
 */
export const handleFormError = <T extends FieldValues>(
  error: unknown,
  form: UseFormReturn<T>
): void => {
  if (error instanceof z.ZodError) {
    // Handle Zod validation errors
    error.errors.forEach((err) => {
      const fieldName = err.path.join('.') as FieldPath<T>;
      form.setError(fieldName, {
        type: 'manual',
        message: err.message,
      });
    });
  } else if (error instanceof Error) {
    // Handle generic errors
    form.setError('root', {
      type: 'manual',
      message: error.message,
    });
  } else {
    // Handle unknown errors
    form.setError('root', {
      type: 'manual',
      message: 'An unexpected error occurred',
    });
  }
};

/**
 * Clear all form errors
 */
export const clearFormErrors = <T extends FieldValues>(
  form: UseFormReturn<T>
): void => {
  form.clearErrors();
};

/**
 * Get form field error message
 */
export const getFieldError = <T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: FieldPath<T>
): string | undefined => {
  const error = form.formState.errors[fieldName];
  return error?.message as string | undefined;
};

/**
 * Check if form field has error
 */
export const hasFieldError = <T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: FieldPath<T>
): boolean => {
  return !!form.formState.errors[fieldName];
};

/**
 * Get all form errors as an array of strings
 */
export const getAllFormErrors = <T extends FieldValues>(
  form: UseFormReturn<T>
): string[] => {
  const errors: string[] = [];
  
  Object.values(form.formState.errors).forEach((error) => {
    if (error?.message) {
      errors.push(error.message as string);
    }
  });
  
  return errors;
};

/**
 * Reset form with new default values
 */
export const resetFormWithDefaults = <T extends FieldValues>(
  form: UseFormReturn<T>,
  defaultValues: Partial<T>
): void => {
  form.reset(defaultValues);
};

/**
 * Submit form with error handling
 */
export const submitFormWithErrorHandling = async <T extends FieldValues>(
  form: UseFormReturn<T>,
  onSubmit: (data: T) => Promise<void> | void,
  onError?: (error: unknown) => void
): Promise<void> => {
  try {
    clearFormErrors(form);
    const data = form.getValues();
    await onSubmit(data);
  } catch (error) {
    handleFormError(error, form);
    if (onError) {
      onError(error);
    }
  }
};

/**
 * Validate form field on blur
 */
export const validateFieldOnBlur = <T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: FieldPath<T>
) => {
  return () => {
    form.trigger(fieldName);
  };
};

/**
 * Format phone number for display
 */
export const formatPhoneNumberForDisplay = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  return phone;
};

/**
 * Format currency for display
 */
export const formatCurrencyForDisplay = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

/**
 * Parse currency string to number
 */
export const parseCurrencyString = (currency: string): number => {
  const cleaned = currency.replace(/[^0-9.-]+/g, '');
  return parseFloat(cleaned) || 0;
};

/**
 * Debounce function for form validation
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Form field validation states
 */
export const getFieldValidationState = <T extends FieldValues>(
  form: UseFormReturn<T>,
  fieldName: FieldPath<T>
): 'idle' | 'validating' | 'valid' | 'invalid' => {
  const fieldState = form.getFieldState(fieldName);
  const formState = form.formState;
  
  if (formState.isValidating) return 'validating';
  if (fieldState.error) return 'invalid';
  if (fieldState.isDirty && !fieldState.error) return 'valid';
  return 'idle';
};
