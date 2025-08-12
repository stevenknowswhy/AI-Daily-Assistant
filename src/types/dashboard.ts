/**
 * Dashboard Types and Interfaces
 * =============================
 * 
 * Centralized type definitions for dashboard components
 */

export interface ConnectionStatus {
  calendar: boolean;
  email: boolean;
  phone: boolean;
  bills: boolean;
}

export interface AuthStatus {
  authenticated: boolean;
  calendar: boolean;
  gmail: boolean;
}

export interface DailyCallPreferences {
  phoneNumber: string;
  callTime: string;
  timezone: string;
  noAnswerAction: 'text_briefing' | 'email_briefing' | 'retry_call';
  retryCount: number;
  isActive: boolean;
}

export interface DashboardState {
  calendarTimeRange: '24h' | '7d' | '30d';
  emailCount: number;
  isVoiceActive: boolean;
  backendStatus: 'checking' | 'connected' | 'mock';
  isLoadingDailySummary: boolean;
  dailySummaryResponse: string;
  // Phone-related state removed - now handled by DailyCallWidgetV2
  showSettingsModal: boolean;
  isSigningOut: boolean;
  showBillsModal: boolean;
  showDailyBriefingModal: boolean;
  // Daily call modal and preferences removed - now handled by DailyCallWidgetV2
  connectionStatus: ConnectionStatus;
  authStatus: AuthStatus;
  lastStatusCheck: Date;
  statusCheckInterval: NodeJS.Timeout | null;
}

export interface DashboardActions {
  setCalendarTimeRange: (range: '24h' | '7d' | '30d') => void;
  setEmailCount: (count: number) => void;
  setIsVoiceActive: (active: boolean) => void;
  setBackendStatus: (status: 'checking' | 'connected' | 'mock') => void;
  setIsLoadingDailySummary: (loading: boolean) => void;
  setDailySummaryResponse: (response: string) => void;
  // Phone setters removed
  setShowSettingsModal: (show: boolean) => void;
  setIsSigningOut: (signing: boolean) => void;
  setShowBillsModal: (show: boolean) => void;
  setShowDailyBriefingModal: (show: boolean) => void;
  // Daily call modal setter removed
  setDailyCallPreferences: (preferences: DailyCallPreferences | null) => void;
  setIsLoadingPreferences: (loading: boolean) => void;
  setConnectionStatus: (status: ConnectionStatus | ((prev: ConnectionStatus) => ConnectionStatus)) => void;
  setAuthStatus: (status: AuthStatus | ((prev: AuthStatus) => AuthStatus)) => void;
  setLastStatusCheck: (date: Date) => void;
  setStatusCheckInterval: (interval: NodeJS.Timeout | null) => void;
  // Helper functions
  updateDailyCallState: (updates: {
    preferences?: DailyCallPreferences | null;
    isLoading?: boolean;
    phoneConnected?: boolean;
  }) => void;
  updateLoadingStates: (updates: {
    dailySummary?: boolean;
    phoneConnecting?: boolean;
    preferences?: boolean;
    signingOut?: boolean;
  }) => void;
}

export interface CalendarWidgetProps {
  connectionStatus: ConnectionStatus;
  calendarTimeRange: '24h' | '7d' | '30d';
  onAuthenticateCalendar: () => void;
  onTimeRangeChange: (range: '24h' | '7d' | '30d') => void;
}

export interface EmailWidgetProps {
  connectionStatus: ConnectionStatus;
  emailCount: number;
  onAuthenticateGmail: () => void;
  onEmailCountChange: (count: number) => void;
}

// DailyCallWidgetProps removed - now using DailyCallWidgetV2 with simpler interface

export interface BillsWidgetProps {
  connectionStatus: ConnectionStatus;
  showBillsModal: boolean;
  onOpenBillsModal: () => void;
  onCloseBillsModal: () => void;
  onAuthenticateBills: () => void;
}

export interface BriefingPreview {
  id: string;
  content: string;
  generatedAt: string;
  preview: string;
}

export interface DailyBriefingWidgetProps {
  isLoadingDailySummary: boolean;
  dailySummaryResponse: string;
  showDailyBriefingModal: boolean;
  onDailySummaryClick: () => void;
  onCloseDailyBriefingModal: () => void;
}

export interface ChatterboxWidgetProps {
  isVoiceActive: boolean;
  onChatterboxClick: () => void;
}

// Legacy type for backward compatibility
export interface JarvisWidgetProps {
  isVoiceActive: boolean;
  onJarvisClick: () => void;
}

export interface DashboardHeaderProps {
  user: any;
  theme: string;
  connectionStatus: ConnectionStatus;
  authStatus: AuthStatus;
  isSigningOut: boolean;
  onAuthenticateCalendar: () => void;
  onAuthenticateGmail: () => void;
  onAuthenticateBills: () => void;
  onSignOutAllServices: () => void;
  onLogout: () => void;
  onBeginSetup?: () => void;
}

export interface ConnectionStatusMonitorProps {
  connectionStatus: ConnectionStatus;
  authStatus: AuthStatus;
  lastStatusCheck: Date;
  statusCheckInterval: NodeJS.Timeout | null;
  onConnectionStatusChange: (status: ConnectionStatus) => void;
  onAuthStatusChange: (status: AuthStatus) => void;
  onLastStatusCheckChange: (date: Date) => void;
  onStatusCheckIntervalChange: (interval: NodeJS.Timeout | null) => void;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DailyCallPreferencesResponse extends ApiResponse {
  preferences?: DailyCallPreferences | null;
}

// Event Handler Types
export type VoidFunction = () => void;
export type AsyncVoidFunction = () => Promise<void>;
export type StringFunction = (value: string) => void;
export type BooleanFunction = (value: boolean) => void;
export type NumberFunction = (value: number) => void;

// Widget State Types
export interface WidgetState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface CalendarWidgetState extends WidgetState {
  timeRange: '24h' | '7d' | '30d';
  events: any[];
}

export interface EmailWidgetState extends WidgetState {
  count: number;
  unreadCount: number;
  emails: any[];
}

export interface BillsWidgetState extends WidgetState {
  bills: any[];
  totalAmount: number;
  upcomingCount: number;
}

// Modal Props Types
export interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// DailyCallModalProps removed - now using inline editing in DailyCallWidgetV2

export interface BillsModalProps extends BaseModalProps {
  // Bills modal specific props will be added here
}

export interface DailyBriefingModalProps extends BaseModalProps {
  isLoading: boolean;
  response: string;
  onGenerate: () => Promise<void>;
}
