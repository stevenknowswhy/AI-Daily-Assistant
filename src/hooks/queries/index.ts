/**
 * Query Hooks Index
 * =================
 * 
 * Centralized exports for all TanStack Query hooks
 */

// Dashboard queries
export {
  useCalendarEvents,
  useEmails,
  useBills,
  useDailySummary,
  useDashboardData,
  useVoiceCommand,
  useAuthStatus,
  useCalendarAuth,
  useGmailAuth,
  useRefreshDashboard,
  useOptimisticUpdate,
} from './useDashboardQueries';

// Daily call queries
export {
  useDailyCallPreferences,
  useUpdateDailyCallPreferences,
  useTestDailyCall,
  useToggleDailyCall,
  useUpdateCallTime,
  useUpdateContentPreferences,
  useDefaultDailyCallPreferences,
} from './useDailyCallQueries';

// Types
export type {
  DailyCallPreferences,
  DailyCallSettings,
} from './useDailyCallQueries';
