// Onboarding step enumeration
export enum OnboardingStep {
  WELCOME = 0,
  DAILY_CALL = 1,
  PHONE_SETUP = 2,
  CALENDAR_MANAGEMENT = 3,
  EMAIL_SUMMARIES = 4,
  FINANCIAL_REMINDERS = 5,
  GET_STARTED = 6
}

// Time periods for daily call setup
export enum CallTimePreference {
  EARLY_MORNING = "6:00 AM",
  MORNING = "8:00 AM", 
  MID_MORNING = "10:00 AM",
  CUSTOM = "custom"
}

// Animation types for gamification
export enum AnimationType {
  SLIDE_IN = "slideIn",
  FADE_IN = "fadeIn",
  BOUNCE = "bounce",
  SCALE = "scale"
}