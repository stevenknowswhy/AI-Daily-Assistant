/**
 * Dashboard Data Queries
 * =====================
 * 
 * TanStack Query hooks for dashboard data fetching and caching
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryOptions } from '../../lib/queryClient';
import dashboardApi, { CalendarEvent, Email, Bill } from '../../services/dashboardApi';

/**
 * Hook for fetching calendar events
 */
export const useCalendarEvents = (timeRange: '24h' | '7d' | '30d' = '24h') => {
  return useQuery({
    queryKey: queryKeys.dashboard.calendar(timeRange),
    queryFn: () => dashboardApi.fetchCalendarEvents(timeRange),
    ...queryOptions.realtime, // Calendar data changes frequently
    staleTime: 2 * 60 * 1000, // 2 minutes for calendar data
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('auth')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for fetching emails
 */
export const useEmails = (maxResults: number = 10) => {
  return useQuery({
    queryKey: queryKeys.dashboard.emails(maxResults),
    queryFn: () => dashboardApi.fetchEmails(maxResults),
    ...queryOptions.realtime, // Email data changes frequently
    staleTime: 1 * 60 * 1000, // 1 minute for email data
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error && error.message.includes('auth')) {
        return false;
      }
      return failureCount < 2;
    },
  });
};

/**
 * Hook for fetching bills
 */
export const useBills = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.bills(),
    queryFn: () => dashboardApi.fetchBills(),
    ...queryOptions.stable, // Bills change less frequently
    staleTime: 5 * 60 * 1000, // 5 minutes for bills data
  });
};

/**
 * Hook for fetching daily summary
 */
export const useDailySummary = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.dailySummary(),
    queryFn: () => dashboardApi.getDailySummary(),
    ...queryOptions.background, // Daily summary is background data
    enabled: false, // Only fetch when explicitly requested
    staleTime: 10 * 60 * 1000, // 10 minutes for daily summary
  });
};

/**
 * Hook for fetching comprehensive dashboard data
 */
export const useDashboardData = () => {
  return useQuery({
    queryKey: queryKeys.dashboard.all,
    queryFn: () => dashboardApi.getDashboardData(),
    ...queryOptions.realtime,
    staleTime: 2 * 60 * 1000, // 2 minutes for comprehensive data
    retry: 2,
  });
};

/**
 * Hook for processing voice commands
 */
export const useVoiceCommand = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: string) => dashboardApi.processVoiceCommand(command),
    onSuccess: (_response, command) => {
      // Invalidate related queries based on command type
      const lowerCommand = command.toLowerCase();
      
      if (lowerCommand.includes('calendar') || lowerCommand.includes('event')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.calendar() });
      }
      
      if (lowerCommand.includes('email') || lowerCommand.includes('mail')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.emails() });
      }
      
      if (lowerCommand.includes('bill') || lowerCommand.includes('subscription')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.bills() });
      }
      
      if (lowerCommand.includes('summary') || lowerCommand.includes('briefing')) {
        queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.dailySummary() });
      }
    },
    retry: 1,
  });
};

/**
 * Hook for authentication status
 */
export const useAuthStatus = () => {
  return useQuery({
    queryKey: queryKeys.connections.status(),
    queryFn: () => dashboardApi.checkBackendAuthentication(),
    ...queryOptions.stable,
    staleTime: 30 * 1000, // 30 seconds for auth status
    refetchInterval: 60 * 1000, // Check every minute
  });
};

/**
 * Hook for getting calendar auth URL
 */
export const useCalendarAuth = () => {
  return useMutation({
    mutationFn: () => dashboardApi.getCalendarAuthUrl(),
    onSuccess: (result) => {
      if (result.success && result.authUrl) {
        // Open auth URL in new window
        window.open(result.authUrl, '_blank', 'width=500,height=600');
      }
    },
  });
};

/**
 * Hook for getting Gmail auth URL
 */
export const useGmailAuth = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => dashboardApi.getGmailAuthUrl(),
    onSuccess: (result) => {
      if (result.success && result.authUrl) {
        // Open auth URL in new window
        window.open(result.authUrl, '_blank', 'width=500,height=600');
      }
    },
    onSettled: () => {
      // Refresh auth status after auth attempt
      queryClient.invalidateQueries({ queryKey: queryKeys.connections.status() });
    },
  });
};

/**
 * Custom hook for refreshing all dashboard data
 */
export const useRefreshDashboard = () => {
  const queryClient = useQueryClient();

  return () => {
    // Invalidate all dashboard queries
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.connections.all });
  };
};

/**
 * Custom hook for optimistic updates
 */
export const useOptimisticUpdate = () => {
  const queryClient = useQueryClient();

  const updateCalendarEvents = (updater: (old: CalendarEvent[]) => CalendarEvent[]) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.dashboard.calendar() },
      updater
    );
  };

  const updateEmails = (updater: (old: Email[]) => Email[]) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.dashboard.emails() },
      updater
    );
  };

  const updateBills = (updater: (old: Bill[]) => Bill[]) => {
    queryClient.setQueriesData(
      { queryKey: queryKeys.dashboard.bills() },
      updater
    );
  };

  return {
    updateCalendarEvents,
    updateEmails,
    updateBills,
  };
};
