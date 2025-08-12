import { z } from 'zod';

// Voice options for OpenAI TTS
export const voiceOptions = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;

// Phone number validation regex (supports various formats)
const phoneRegex = /^\+?[1-9]\d{1,14}$/;

// Time format validation (HH:MM)
const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;

// Timezone validation (basic IANA timezone format)
const timezoneRegex = /^[A-Za-z_]+\/[A-Za-z_]+$/;

/**
 * Schema for daily call preferences
 * Used for form validation and API contracts
 */
export const dailyCallPreferencesSchema = z.object({
  enabled: z.boolean().default(false),
  
  phoneNumber: z.string()
    .min(1, 'Phone number is required')
    .regex(phoneRegex, 'Please enter a valid phone number (e.g., +1234567890)')
    .transform(val => val.replace(/\D/g, '').replace(/^1/, '+1')), // Normalize phone number
  
  time: z.string()
    .regex(timeRegex, 'Time must be in HH:MM format')
    .default('08:00'),
  
  timezone: z.string()
    .regex(timezoneRegex, 'Invalid timezone format')
    .default('America/Los_Angeles'),
  
  voice: z.enum(voiceOptions).default('alloy'),
  
  // Content preferences
  includeCalendar: z.boolean().default(true),
  includeEmails: z.boolean().default(true),
  includeBills: z.boolean().default(true),
  
  // Weekly schedule (Sunday = 0, Monday = 1, ..., Saturday = 6)
  weekdays: z.array(z.boolean())
    .length(7, 'Weekdays array must have exactly 7 elements')
    .default([true, true, true, true, true, false, false]), // Mon-Fri by default
});

/**
 * Schema for updating daily call preferences (all fields optional)
 */
export const updateDailyCallPreferencesSchema = dailyCallPreferencesSchema.partial();

/**
 * Schema for testing daily call functionality
 */
export const testDailyCallSchema = z.object({
  phoneNumber: z.string()
    .min(1, 'Phone number is required for test call')
    .regex(phoneRegex, 'Please enter a valid phone number'),
  
  message: z.string()
    .min(1, 'Test message is required')
    .max(500, 'Test message must be less than 500 characters')
    .optional()
    .default('This is a test call from your AI Daily Assistant.'),
});

// TypeScript types inferred from schemas
export type DailyCallPreferences = z.infer<typeof dailyCallPreferencesSchema>;
export type UpdateDailyCallPreferences = z.infer<typeof updateDailyCallPreferencesSchema>;
export type TestDailyCall = z.infer<typeof testDailyCallSchema>;

// Form validation helpers
export const validatePhoneNumber = (phone: string): boolean => {
  return phoneRegex.test(phone);
};

export const validateTime = (time: string): boolean => {
  return timeRegex.test(time);
};

export const formatPhoneNumber = (phone: string): string => {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // Format as +1 (XXX) XXX-XXXX for US numbers
  if (digits.length === 10) {
    return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits.startsWith('1')) {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return as-is for international numbers
  return phone.startsWith('+') ? phone : `+${digits}`;
};
