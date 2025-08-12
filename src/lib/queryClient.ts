/**
 * TanStack Query Configuration
 * ===========================
 * 
 * Centralized configuration for React Query client with optimized defaults
 * for the AI Daily Assistant application.
 */

import { QueryClient } from '@tanstack/react-query';

/**
 * Create and configure the QueryClient with application-specific defaults
 */
export const createQueryClient = (): QueryClient => {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Cache data for 5 minutes by default
        staleTime: 5 * 60 * 1000, // 5 minutes
        
        // Keep data in cache for 10 minutes after component unmounts
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        
        // Retry failed requests up to 3 times with exponential backoff
        retry: (failureCount, error) => {
          // Don't retry on 4xx errors (client errors)
          if (error instanceof Error && 'status' in error) {
            const status = (error as any).status;
            if (status >= 400 && status < 500) {
              return false;
            }
          }
          
          // Retry up to 3 times for other errors
          return failureCount < 3;
        },
        
        // Exponential backoff delay
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        
        // Don't refetch on window focus by default (can be overridden per query)
        refetchOnWindowFocus: false,
        
        // Refetch on reconnect
        refetchOnReconnect: true,
        
        // Don't refetch on mount if data is fresh
        refetchOnMount: true,
      },
      mutations: {
        // Retry mutations once on failure
        retry: 1,
        
        // Shorter retry delay for mutations
        retryDelay: 1000,
      },
    },
  });
};

/**
 * Query key factory for consistent key generation
 */
export const queryKeys = {
  // Dashboard data
  dashboard: {
    all: ['dashboard'] as const,
    calendar: (timeRange?: string) => ['dashboard', 'calendar', timeRange] as const,
    emails: (maxResults?: number) => ['dashboard', 'emails', maxResults] as const,
    bills: () => ['dashboard', 'bills'] as const,
    dailySummary: () => ['dashboard', 'daily-summary'] as const,
  },
  
  // Daily call preferences
  dailyCall: {
    all: ['daily-call'] as const,
    preferences: (userId: string) => ['daily-call', 'preferences', userId] as const,
  },
  
  // Voice commands and processing
  voice: {
    all: ['voice'] as const,
    command: (command: string) => ['voice', 'command', command] as const,
  },
  
  // Connection status
  connections: {
    all: ['connections'] as const,
    status: () => ['connections', 'status'] as const,
    auth: (service: string) => ['connections', 'auth', service] as const,
  },
  
  // User data
  user: {
    all: ['user'] as const,
    profile: (userId: string) => ['user', 'profile', userId] as const,
    preferences: (userId: string) => ['user', 'preferences', userId] as const,
  },
} as const;

/**
 * Common query options for different types of data
 */
export const queryOptions = {
  // Fast-changing data (refresh more frequently)
  realtime: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
  },
  
  // Slow-changing data (cache longer)
  stable: {
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  },
  
  // User preferences (cache very long, manual invalidation)
  preferences: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Background data (low priority)
  background: {
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 20 * 60 * 1000, // 20 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  },
} as const;
