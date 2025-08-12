/**
 * Daily Call Preferences Queries
 * ==============================
 * 
 * TanStack Query hooks for daily call preferences and settings
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, queryOptions } from '@/lib/queryClient';

// Types for daily call preferences
export interface DailyCallPreferences {
  enabled: boolean;
  time: string; // HH:MM format
  timezone: string;
  phoneNumber: string;
  voice: 'alloy' | 'echo' | 'fable' | 'onyx' | 'nova' | 'shimmer';
  includeCalendar: boolean;
  includeEmails: boolean;
  includeBills: boolean;
  customMessage?: string;
  weekdays: boolean[];
}

export interface DailyCallSettings {
  id: string;
  userId: string;
  preferences: DailyCallPreferences;
  createdAt: string;
  updatedAt: string;
}

// Mock API service for daily call preferences
class DailyCallApiService {
  private baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005';

  async getPreferences(userId: string): Promise<DailyCallSettings> {
    try {
      const response = await fetch(`${this.baseUrl}/api/daily-call-preferences/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch preferences: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch daily call preferences:', error);
      
      // Return default preferences if API fails
      return {
        id: 'default',
        userId,
        preferences: {
          enabled: false,
          time: '09:00',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          phoneNumber: '',
          voice: 'alloy',
          includeCalendar: true,
          includeEmails: true,
          includeBills: true,
          weekdays: [true, true, true, true, true, false, false], // Mon-Fri
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  async updatePreferences(userId: string, preferences: Partial<DailyCallPreferences>): Promise<DailyCallSettings> {
    try {
      // Transform frontend format to backend API format
      const apiData = {
        phone_number: preferences.phoneNumber,
        call_time: preferences.time,
        timezone: preferences.timezone,
        no_answer_action: 'text_briefing', // Default value
        retry_count: 1, // Default value
        is_active: preferences.enabled ?? true
      };

      const response = await fetch(`${this.baseUrl}/api/daily-call-preferences/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        throw new Error(`Failed to update preferences: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to update daily call preferences:', error);
      throw error;
    }
  }

  async testCall(userId: string): Promise<{ success: boolean; callSid?: string; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/daily-call-preferences/test/${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to initiate test call: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to initiate test call:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

const dailyCallApi = new DailyCallApiService();

/**
 * Hook for fetching daily call preferences
 */
export const useDailyCallPreferences = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.dailyCall.preferences(userId),
    queryFn: () => dailyCallApi.getPreferences(userId),
    ...queryOptions.preferences, // Cache for a long time
    enabled: !!userId, // Only fetch if userId is provided
  });
};

/**
 * Hook for updating daily call preferences
 */
export const useUpdateDailyCallPreferences = (userId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: Partial<DailyCallPreferences>) =>
      dailyCallApi.updatePreferences(userId, preferences),
    onMutate: async (newPreferences) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.dailyCall.preferences(userId) });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData(queryKeys.dailyCall.preferences(userId));

      // Optimistically update to the new value
      queryClient.setQueryData(queryKeys.dailyCall.preferences(userId), (old: DailyCallSettings | undefined) => {
        if (!old) return old;
        return {
          ...old,
          preferences: { ...old.preferences, ...newPreferences },
          updatedAt: new Date().toISOString(),
        };
      });

      // Return a context object with the snapshotted value
      return { previousPreferences };
    },
    onError: (_err, _newPreferences, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      if (context?.previousPreferences) {
        queryClient.setQueryData(queryKeys.dailyCall.preferences(userId), context.previousPreferences);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      queryClient.invalidateQueries({ queryKey: queryKeys.dailyCall.preferences(userId) });
    },
  });
};

/**
 * Hook for testing daily call functionality
 */
export const useTestDailyCall = (userId: string) => {
  return useMutation({
    mutationFn: () => dailyCallApi.testCall(userId),
    retry: false, // Don't retry test calls
  });
};

/**
 * Hook for toggling daily call enabled status
 */
export const useToggleDailyCall = (userId: string) => {
  const updatePreferences = useUpdateDailyCallPreferences(userId);

  return useMutation({
    mutationFn: async (enabled: boolean) => {
      return updatePreferences.mutateAsync({ enabled });
    },
    onSuccess: (_data, enabled) => {
      console.log(`Daily call ${enabled ? 'enabled' : 'disabled'} successfully`);
    },
  });
};

/**
 * Hook for updating call time
 */
export const useUpdateCallTime = (userId: string) => {
  const updatePreferences = useUpdateDailyCallPreferences(userId);

  return useMutation({
    mutationFn: async ({ time, timezone }: { time: string; timezone?: string }) => {
      const updates: Partial<DailyCallPreferences> = { time };
      if (timezone) {
        updates.timezone = timezone;
      }
      return updatePreferences.mutateAsync(updates);
    },
  });
};

/**
 * Hook for updating content preferences
 */
export const useUpdateContentPreferences = (userId: string) => {
  const updatePreferences = useUpdateDailyCallPreferences(userId);

  return useMutation({
    mutationFn: async (contentPrefs: {
      includeCalendar?: boolean;
      includeEmails?: boolean;
      includeBills?: boolean;
    }) => {
      return updatePreferences.mutateAsync(contentPrefs);
    },
  });
};

/**
 * Hook for getting default preferences
 */
export const useDefaultDailyCallPreferences = (): DailyCallPreferences => {
  return {
    enabled: false,
    time: '09:00',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    phoneNumber: '',
    voice: 'alloy',
    includeCalendar: true,
    includeEmails: true,
    includeBills: true,
    weekdays: [true, true, true, true, true, false, false], // Mon-Fri
  };
};
