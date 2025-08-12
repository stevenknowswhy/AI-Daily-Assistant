import { useState, useEffect, useCallback } from 'react';
import { dashboardApi, CalendarEvent, Email, Bill, DashboardData } from '../services/dashboardApi';

export interface DashboardState {
  data: DashboardData | null;
  isLoading: boolean;
  error: string | null;
  calendarEvents: CalendarEvent[];
  emails: Email[];
  bills: Bill[];
  isLoadingCalendar: boolean;
  isLoadingEmails: boolean;
  isLoadingBills: boolean;
  isLoadingCall: boolean;
}

export const useDashboard = () => {
  const [state, setState] = useState<DashboardState>({
    data: null,
    isLoading: false,
    error: null,
    calendarEvents: [],
    emails: [],
    bills: [],
    isLoadingCalendar: false,
    isLoadingEmails: false,
    isLoadingBills: false,
    isLoadingCall: false
  });

  /**
   * Load initial dashboard data with rate limiting protection
   */
  const loadDashboardData = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (state.isLoading) {
      console.log('🔄 Dashboard data already loading, skipping...');
      return;
    }

    console.log('🔄 useDashboard: Loading dashboard data...');
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await dashboardApi.getDashboardData();
      console.log('✅ useDashboard: Dashboard data loaded successfully:', {
        calendar: data.calendar.length,
        emails: data.emails.length,
        bills: data.bills.length
      });

      setState(prev => ({
        ...prev,
        data,
        calendarEvents: data.calendar,
        emails: data.emails,
        bills: data.bills,
        isLoading: false
      }));
    } catch (error) {
      console.error('❌ useDashboard: Failed to load dashboard data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load dashboard data',
        isLoading: false
      }));
    }
  }, [state.isLoading]); // Add isLoading as dependency to prevent multiple calls

  /**
   * Load dashboard data on mount
   */
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  /**
   * Fetch calendar events with time range
   */
  const fetchCalendarEvents = useCallback(async (timeRange: '24h' | '7d' | '30d' = '24h') => {
    setState(prev => ({ ...prev, isLoadingCalendar: true }));
    
    try {
      const events = await dashboardApi.fetchCalendarEvents(timeRange);
      setState(prev => ({
        ...prev,
        calendarEvents: events,
        isLoadingCalendar: false,
        data: prev.data ? {
          ...prev.data,
          calendar: events,
          stats: {
            ...prev.data.stats,
            eventsToday: events.length,
            totalEvents: events.length
          }
        } : prev.data
      }));
      return events;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch calendar events',
        isLoadingCalendar: false
      }));
      throw error;
    }
  }, []);

  /**
   * Fetch emails
   */
  const fetchEmails = useCallback(async (maxResults: number = 10) => {
    setState(prev => ({ ...prev, isLoadingEmails: true }));
    
    try {
      const emails = await dashboardApi.fetchEmails(maxResults);
      setState(prev => ({
        ...prev,
        emails,
        isLoadingEmails: false,
        data: prev.data ? {
          ...prev.data,
          emails,
          stats: {
            ...prev.data.stats,
            unreadEmails: emails.filter(e => e.isUnread).length,
            totalEmails: emails.length
          }
        } : prev.data
      }));
      return emails;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch emails',
        isLoadingEmails: false
      }));
      throw error;
    }
  }, []);

  /**
   * Fetch bills
   */
  const fetchBills = useCallback(async () => {
    setState(prev => ({ ...prev, isLoadingBills: true }));

    try {
      const bills = await dashboardApi.fetchBills();
      setState(prev => ({
        ...prev,
        bills,
        isLoadingBills: false,
        data: prev.data ? {
          ...prev.data,
          bills,
          stats: {
            ...prev.data.stats,
            totalBills: bills.length,
            upcomingBills: bills.filter(bill => {
              const now = new Date();
              const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
              const dueDate = new Date(bill.dueDate);
              return dueDate >= now && dueDate <= sevenDaysFromNow;
            }).length
          }
        } : prev.data
      }));
      return bills;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch bills',
        isLoadingBills: false
      }));
      throw error;
    }
  }, []);

  /**
   * Create calendar event
   */
  const createCalendarEvent = useCallback(async (eventData: Partial<CalendarEvent>) => {
    try {
      const newEvent = await dashboardApi.createCalendarEvent(eventData);
      setState(prev => ({
        ...prev,
        calendarEvents: [newEvent, ...prev.calendarEvents]
      }));
      return newEvent;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to create calendar event'
      }));
      throw error;
    }
  }, []);

  /**
   * Initiate phone call
   */
  const initiatePhoneCall = useCallback(async (to: string, message?: string) => {
    setState(prev => ({ ...prev, isLoadingCall: true }));
    
    try {
      const result = await dashboardApi.initiatePhoneCall({ to, message });
      setState(prev => ({ ...prev, isLoadingCall: false }));
      return result;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initiate phone call',
        isLoadingCall: false
      }));
      throw error;
    }
  }, []);

  /**
   * Process Chatterbox voice command
   */
  const processVoiceCommand = useCallback(async (command: string) => {
    try {
      const response = await dashboardApi.processVoiceCommand(command);
      return response;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to process voice command'
      }));
      throw error;
    }
  }, []);

  /**
   * Get comprehensive daily summary
   */
  const getDailySummary = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const summary = await dashboardApi.getDailySummary();
      setState(prev => ({ ...prev, isLoading: false }));
      return summary;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to get daily summary',
        isLoading: false
      }));
      throw error;
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  /**
   * Authenticate with Google Calendar
   */
  const authenticateCalendar = useCallback(async () => {
    try {
      const result = await dashboardApi.getCalendarAuthUrl();
      if (result.success && result.authUrl) {
        localStorage.setItem('dashboard-auth-type', 'calendar');
        window.location.href = result.authUrl;
      } else {
        throw new Error(result.error || 'Failed to get Calendar OAuth URL');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Calendar authentication failed'
      }));
    }
  }, []);

  /**
   * Authenticate with Gmail
   */
  const authenticateGmail = useCallback(async () => {
    try {
      const result = await dashboardApi.getGmailAuthUrl();
      if (result.success && result.authUrl) {
        localStorage.setItem('dashboard-auth-type', 'gmail');
        window.location.href = result.authUrl;
      } else {
        throw new Error(result.error || 'Failed to get Gmail OAuth URL');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Gmail authentication failed'
      }));
    }
  }, []);

  /**
   * Authenticate with Bills (Supabase) - Internal helper
   */
  const authenticateBillsInternal = useCallback(async () => {
    try {
      console.log('🔄 useDashboard: Authenticating bills...');

      // Authenticate with Bills/Supabase through backend
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/bills/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: 'dashboard-user' })
      });
      const result = await response.json();

      if (result.success) {
        console.log('✅ useDashboard: Bills authentication successful');
        return true;
      } else {
        throw new Error(result.error || 'Failed to authenticate with Supabase');
      }
    } catch (error) {
      console.error('❌ useDashboard: Bills authentication failed:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Bills authentication failed'
      }));
      return false;
    }
  }, []);

  /**
   * Check authentication status for all services
   */
  const checkAuthStatus = useCallback(async () => {
    // Lightweight health pre-check to suppress noisy logs when offline
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      clearTimeout(id);
      if (!res.ok) {
        console.log('⚠️ Backend health check failed; suppressing auth logs this cycle');
        return { calendar: false, gmail: false, bills: false };
      }
    } catch {
      console.log('⚠️ Backend unreachable; suppressing auth logs this cycle');
      return { calendar: false, gmail: false, bills: false };
    }
    try {
      await dashboardApi.checkBackendAuthentication();

      // Test Calendar API directly to verify authentication
      let calendarStatus = false;
      try {
        const calendarResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/calendar/events?timeMin=2025-08-10T00:00:00Z&timeMax=2025-08-11T00:00:00Z&maxResults=5`);
        const calendarResult = await calendarResponse.json();
        calendarStatus = calendarResult.success;
      } catch (calendarError) {
        console.log('Calendar API test failed:', calendarError);
        calendarStatus = false;
      }

      // Test Gmail API directly to verify authentication
      let gmailStatus = false;
      try {
        const gmailResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/gmail/messages?maxResults=5&query=newer_than:1d`);
        const gmailResult = await gmailResponse.json();
        gmailStatus = gmailResult.success;
      } catch (gmailError) {
        console.log('Gmail API test failed:', gmailError);
        gmailStatus = false;
      }

      // Check Bills/Supabase authentication status
      let billsStatus = false;
      try {
        const billsResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/bills/status`);
        const billsResult = await billsResponse.json();
        billsStatus = billsResult.success && billsResult.authenticated;

        // If Bills is not authenticated, automatically authenticate it
        if (!billsStatus) {
          console.log('🔄 Bills not authenticated, attempting automatic authentication...');
          const authSuccess = await authenticateBillsInternal();
          if (authSuccess) {
            billsStatus = true;
            console.log('✅ Bills automatically authenticated');
          }
        }
      } catch (billsError) {
        console.log('Bills authentication check failed:', billsError);
        billsStatus = false;
      }

      console.log('🔍 Authentication status check results:', {
        calendar: calendarStatus,
        gmail: gmailStatus,
        bills: billsStatus
      });

      return {
        calendar: calendarStatus,
        gmail: gmailStatus,
        bills: billsStatus
      };
    } catch (error) {
      console.error('Failed to check auth status:', error);
      return { calendar: false, gmail: false, bills: false };
    }
  }, [authenticateBillsInternal]);

  /**
   * Authenticate with Bills (Supabase) - Public API
   */
  const authenticateBills = useCallback(async () => {
    try {
      const success = await authenticateBillsInternal();

      if (success) {
        // Trigger a status check to update connection status
        setTimeout(async () => {
          const status = await checkAuthStatus();
          console.log('🔄 useDashboard: Status check after bills auth:', status);
        }, 500);
      }

      return success;
    } catch (error) {
      console.error('❌ useDashboard: Bills authentication failed:', error);
      return false;
    }
  }, [authenticateBillsInternal, checkAuthStatus]);

  /**
   * Disconnect a specific service
   */
  const disconnectService = useCallback(async (service: 'calendar' | 'email' | 'bills' | 'phone') => {
    try {
      console.log(`🔄 useDashboard: Disconnecting ${service}...`);

      // Map service names to backend endpoints
      const serviceEndpoints = {
        calendar: 'calendar',
        email: 'gmail',
        bills: 'bills',
        phone: 'phone'
      };

      const endpoint = serviceEndpoints[service];
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/auth/disconnect/${endpoint}`, {
        method: 'POST'
      });

      const result = await response.json();

      if (result.success) {
        console.log(`✅ useDashboard: ${service} disconnected successfully`);

        // Trigger a status check to update connection status
        setTimeout(async () => {
          const status = await checkAuthStatus();
          console.log(`🔄 useDashboard: Status check after ${service} disconnect:`, status);
        }, 500);

        return true;
      } else {
        throw new Error(result.error || `Failed to disconnect ${service}`);
      }
    } catch (error) {
      console.error(`❌ useDashboard: Failed to disconnect ${service}:`, error);
      throw error;
    }
  }, [checkAuthStatus]);

  /**
   * Sign out of all services
   */
  const signOutAllServices = useCallback(async () => {
    try {
      // Call backend to sign out of all OAuth services
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/auth/signout`, {
        method: 'POST'
      });
      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to sign out of services:', error);
      return false;
    }
  }, []);

  /**
   * Refresh all data
   */
  const refreshData = useCallback(async () => {
    await loadDashboardData();
  }, [loadDashboardData]);

  // Load initial data on mount
  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return {
    ...state,
    fetchCalendarEvents,
    fetchEmails,
    fetchBills,
    createCalendarEvent,
    initiatePhoneCall,
    processVoiceCommand,
    getDailySummary,
    clearError,
    refreshData,
    loadDashboardData,
    authenticateCalendar,
    authenticateGmail,
    authenticateBills,
    checkAuthStatus,
    disconnectService,
    signOutAllServices
  };
};
