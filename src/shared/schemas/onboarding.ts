import { z } from 'zod';

// Onboarding step identifiers
export const onboardingSteps = [
  'welcome',
  'profile',
  'preferences',
  'calendar',
  'email',
  'billing',
  'complete'
] as const;

// Timezone options (common ones)
export const timezoneOptions = [
  'America/New_York',
  'America/Chicago', 
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney'
] as const;

/**
 * Schema for user profile setup during onboarding
 */
export const onboardingProfileSchema = z.object({
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'First name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),
  
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Last name can only contain letters, spaces, hyphens, and apostrophes')
    .trim(),
  
  timezone: z.enum(timezoneOptions).default('America/Los_Angeles'),
  
  phoneNumber: z.string()
    .min(1, 'Phone number is required')
    .regex(/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number')
    .transform(val => val.replace(/\D/g, '').replace(/^1/, '+1')),
});

/**
 * Schema for daily assistant preferences during onboarding
 */
export const onboardingPreferencesSchema = z.object({
  // Call preferences
  enableDailyCalls: z.boolean().default(true),
  preferredCallTime: z.string()
    .regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Time must be in HH:MM format')
    .default('08:00'),
  
  // Content preferences
  includeCalendar: z.boolean().default(true),
  includeEmails: z.boolean().default(true),
  includeBills: z.boolean().default(true),
  includeWeather: z.boolean().default(true),
  includeNews: z.boolean().default(false),
  
  // Communication preferences
  voicePreference: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  callDuration: z.enum(['short', 'medium', 'long']).default('medium'),
  
  // Weekly schedule
  weekdays: z.array(z.boolean())
    .length(7, 'Weekdays array must have exactly 7 elements')
    .default([true, true, true, true, true, false, false]),
});

/**
 * Schema for service connection status during onboarding
 */
export const onboardingConnectionsSchema = z.object({
  googleCalendarConnected: z.boolean().default(false),
  gmailConnected: z.boolean().default(false),
  twilioConnected: z.boolean().default(false),
  supabaseConnected: z.boolean().default(false),
  
  // Connection metadata
  googleCalendarEmail: z.string().email().optional(),
  gmailEmail: z.string().email().optional(),
  twilioPhoneNumber: z.string().optional(),
});

/**
 * Schema for complete onboarding state
 */
export const onboardingStateSchema = z.object({
  currentStep: z.enum(onboardingSteps).default('welcome'),
  completedSteps: z.array(z.enum(onboardingSteps)).default([]),
  
  // Step data
  profile: onboardingProfileSchema.optional(),
  preferences: onboardingPreferencesSchema.optional(),
  connections: onboardingConnectionsSchema.optional(),
  
  // Progress tracking
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  isComplete: z.boolean().default(false),
  
  // Skip flags
  skippedSteps: z.array(z.enum(onboardingSteps)).default([]),
});

/**
 * Schema for updating onboarding progress
 */
export const updateOnboardingSchema = z.object({
  currentStep: z.enum(onboardingSteps).optional(),
  completedSteps: z.array(z.enum(onboardingSteps)).optional(),
  profile: onboardingProfileSchema.partial().optional(),
  preferences: onboardingPreferencesSchema.partial().optional(),
  connections: onboardingConnectionsSchema.partial().optional(),
  isComplete: z.boolean().optional(),
});

// TypeScript types inferred from schemas
export type OnboardingProfile = z.infer<typeof onboardingProfileSchema>;
export type OnboardingPreferences = z.infer<typeof onboardingPreferencesSchema>;
export type OnboardingConnections = z.infer<typeof onboardingConnectionsSchema>;
export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export type UpdateOnboarding = z.infer<typeof updateOnboardingSchema>;

// Helper functions
export const calculateOnboardingProgress = (state: OnboardingState): number => {
  const totalSteps = onboardingSteps.length;
  const completedCount = state.completedSteps.length;
  return Math.round((completedCount / totalSteps) * 100);
};

export const getNextOnboardingStep = (currentStep: typeof onboardingSteps[number]): typeof onboardingSteps[number] | null => {
  const currentIndex = onboardingSteps.indexOf(currentStep);
  if (currentIndex === -1 || currentIndex === onboardingSteps.length - 1) {
    return null;
  }
  return onboardingSteps[currentIndex + 1];
};

export const getPreviousOnboardingStep = (currentStep: typeof onboardingSteps[number]): typeof onboardingSteps[number] | null => {
  const currentIndex = onboardingSteps.indexOf(currentStep);
  if (currentIndex <= 0) {
    return null;
  }
  return onboardingSteps[currentIndex - 1];
};

export const isOnboardingStepComplete = (step: typeof onboardingSteps[number], state: OnboardingState): boolean => {
  return state.completedSteps.includes(step);
};
