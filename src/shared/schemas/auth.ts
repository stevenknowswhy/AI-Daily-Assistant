import { z } from 'zod';

// Email validation regex (more comprehensive than built-in)
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

// Password strength requirements
const passwordMinLength = 6;
const passwordMaxLength = 128;

/**
 * Schema for user login
 */
export const loginSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Please enter a valid email address')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(1, 'Password is required')
    .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters`)
    .max(passwordMaxLength, `Password must be less than ${passwordMaxLength} characters`),
});

/**
 * Schema for user registration
 */
export const registerSchema = z.object({
  name: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),
  
  email: z.string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Please enter a valid email address')
    .toLowerCase()
    .trim(),
  
  password: z.string()
    .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters`)
    .max(passwordMaxLength, `Password must be less than ${passwordMaxLength} characters`)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Schema for password reset request
 */
export const forgotPasswordSchema = z.object({
  email: z.string()
    .min(1, 'Email is required')
    .regex(emailRegex, 'Please enter a valid email address')
    .toLowerCase()
    .trim(),
});

/**
 * Schema for password reset
 */
export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  
  password: z.string()
    .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters`)
    .max(passwordMaxLength, `Password must be less than ${passwordMaxLength} characters`)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  
  confirmPassword: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

/**
 * Schema for updating user profile
 */
export const updateProfileSchema = z.object({
  name: z.string()
    .min(1, 'Full name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes')
    .trim()
    .optional(),
  
  email: z.string()
    .regex(emailRegex, 'Please enter a valid email address')
    .toLowerCase()
    .trim()
    .optional(),
  
  currentPassword: z.string()
    .min(1, 'Current password is required to make changes')
    .optional(),
  
  newPassword: z.string()
    .min(passwordMinLength, `Password must be at least ${passwordMinLength} characters`)
    .max(passwordMaxLength, `Password must be less than ${passwordMaxLength} characters`)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one lowercase letter, one uppercase letter, and one number')
    .optional(),
  
  confirmNewPassword: z.string().optional(),
}).refine((data) => {
  if (data.newPassword && !data.confirmNewPassword) {
    return false;
  }
  if (data.newPassword && data.newPassword !== data.confirmNewPassword) {
    return false;
  }
  return true;
}, {
  message: "New passwords don't match",
  path: ["confirmNewPassword"],
});

// TypeScript types inferred from schemas
export type LoginForm = z.infer<typeof loginSchema>;
export type RegisterForm = z.infer<typeof registerSchema>;
export type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;
export type UpdateProfileForm = z.infer<typeof updateProfileSchema>;

// Validation helpers
export const validateEmail = (email: string): boolean => {
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  return password.length >= passwordMinLength && 
         password.length <= passwordMaxLength &&
         /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password);
};

export const getPasswordStrength = (password: string): 'weak' | 'medium' | 'strong' => {
  if (password.length < passwordMinLength) return 'weak';
  
  let score = 0;
  if (/[a-z]/.test(password)) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^a-zA-Z\d]/.test(password)) score++;
  if (password.length >= 12) score++;
  
  if (score <= 2) return 'weak';
  if (score <= 4) return 'medium';
  return 'strong';
};
