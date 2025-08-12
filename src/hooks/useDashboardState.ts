/**
 * Dashboard State Management Hook
 * ==============================
 * 
 * Centralized state management for dashboard components
 */

import { useState, useCallback } from 'react';
import { DashboardState, DashboardActions, ConnectionStatus, AuthStatus } from '../types/dashboard';

const initialConnectionStatus: ConnectionStatus = {
  calendar: false,
  email: false,
  phone: false,
  bills: false
};

const initialAuthStatus: AuthStatus = {
  authenticated: false,
  calendar: false,
  gmail: false
};

export const useDashboardState = (): DashboardState & DashboardActions => {
  // Core state
  const [calendarTimeRange, setCalendarTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [emailCount, setEmailCount] = useState(10);
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [backendStatus, setBackendStatus] = useState<'checking' | 'connected' | 'mock'>('checking');
  const [isLoadingDailySummary, setIsLoadingDailySummary] = useState(false);
  const [dailySummaryResponse, setDailySummaryResponse] = useState<string>('');
  // Phone-related state removed - now handled by DailyCallWidgetV2
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Modal states
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showBillsModal, setShowBillsModal] = useState(false);
  const [showDailyBriefingModal, setShowDailyBriefingModal] = useState(false);
  // Daily call modal and preferences removed - now handled by DailyCallWidgetV2

  // Connection and auth status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(initialConnectionStatus);
  const [authStatus, setAuthStatus] = useState<AuthStatus>(initialAuthStatus);
  const [lastStatusCheck, setLastStatusCheck] = useState<Date>(new Date());
  const [statusCheckInterval, setStatusCheckInterval] = useState<NodeJS.Timeout | null>(null);

  // Computed values
  const isAuthenticated = authStatus.authenticated;
  const hasPhoneConnected = connectionStatus.phone;
  const hasAnyServiceConnected = connectionStatus.calendar || connectionStatus.email || connectionStatus.bills;

  // Helper functions
  const resetModals = useCallback(() => {
    setShowSettingsModal(false);
    setShowBillsModal(false);
    setShowDailyBriefingModal(false);
  }, []);

  const resetConnectionStatus = useCallback(() => {
    setConnectionStatus(initialConnectionStatus);
    setAuthStatus(initialAuthStatus);
  }, []);

  const updateConnectionStatus = useCallback((updates: Partial<ConnectionStatus>) => {
    setConnectionStatus(prev => ({ ...prev, ...updates }));
  }, []);

  const updateAuthStatus = useCallback((updates: Partial<AuthStatus>) => {
    setAuthStatus(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper functions for loading states
  const updateLoadingStates = useCallback((updates: {
    dailySummary?: boolean;
    signingOut?: boolean;
  }) => {
    if (updates.dailySummary !== undefined) {
      setIsLoadingDailySummary(updates.dailySummary);
    }
    if (updates.signingOut !== undefined) {
      setIsSigningOut(updates.signingOut);
    }
  }, []);

  return {
    // State
    calendarTimeRange,
    emailCount,
    isVoiceActive,
    backendStatus,
    isLoadingDailySummary,
    dailySummaryResponse,
    // Phone-related state removed
    showSettingsModal,
    isSigningOut,
    showBillsModal,
    showDailyBriefingModal,
    // Daily call modal and preferences removed
    connectionStatus,
    authStatus,
    lastStatusCheck,
    statusCheckInterval,

    // Actions
    setCalendarTimeRange,
    setEmailCount,
    setIsVoiceActive,
    setBackendStatus,
    setIsLoadingDailySummary,
    setDailySummaryResponse,
    // Phone setters removed
    setShowSettingsModal,
    setIsSigningOut,
    setShowBillsModal,
    setShowDailyBriefingModal,
    // Daily call setters removed
    setConnectionStatus,
    setAuthStatus,
    setLastStatusCheck,
    setStatusCheckInterval,

    // Computed values
    isAuthenticated,
    hasPhoneConnected,
    hasAnyServiceConnected,

    // Helper functions
    resetModals,
    resetConnectionStatus,
    updateConnectionStatus,
    updateAuthStatus,
    updateLoadingStates
  } as DashboardState & DashboardActions & {
    isAuthenticated: boolean;
    hasPhoneConnected: boolean;
    hasAnyServiceConnected: boolean;
    resetModals: () => void;
    resetConnectionStatus: () => void;
    updateConnectionStatus: (updates: Partial<ConnectionStatus>) => void;
    updateAuthStatus: (updates: Partial<AuthStatus>) => void;
    updateLoadingStates: (updates: {
      dailySummary?: boolean;
      signingOut?: boolean;
    }) => void;
  };
};
