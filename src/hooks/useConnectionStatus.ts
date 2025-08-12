/**
 * Connection Status Monitor Hook
 * =============================
 * 
 * Manages authentication and connection status monitoring
 */

import { useEffect, useCallback, useRef } from 'react';
import { ConnectionStatus, AuthStatus } from '../types/dashboard';
import { useDashboard } from './useDashboard';
import toast from 'react-hot-toast';

interface UseConnectionStatusProps {
  connectionStatus: ConnectionStatus;
  authStatus: AuthStatus;
  lastStatusCheck: Date;
  statusCheckInterval: NodeJS.Timeout | null;
  userPhoneNumber?: string;
  userId?: string;
  onConnectionStatusChange: (status: ConnectionStatus | ((prev: ConnectionStatus) => ConnectionStatus)) => void;
  onAuthStatusChange: (status: AuthStatus | ((prev: AuthStatus) => AuthStatus)) => void;
  onLastStatusCheckChange: (date: Date) => void;
  onStatusCheckIntervalChange: (interval: NodeJS.Timeout | null) => void;
}

export const useConnectionStatus = ({
  connectionStatus,
  authStatus,
  lastStatusCheck,
  statusCheckInterval,
  userPhoneNumber,
  userId,
  onConnectionStatusChange,
  onAuthStatusChange,
  onLastStatusCheckChange,
  onStatusCheckIntervalChange
}: UseConnectionStatusProps) => {
  const { checkAuthStatus } = useDashboard();

  // Backend health/backoff state (module-local to this hook instance)
  const backoffRef = useRef({
    isOffline: false,
    delayMs: 30000, // start at 30s
    maxDelayMs: 5 * 60 * 1000, // cap at 5m
    lastCheck: 0,
  });

  const apiBase = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3005';

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${apiBase}/health`, { signal: controller.signal });
      clearTimeout(id);
      return res.ok;
    } catch {
      return false;
    }
  }, [apiBase]);

  // Check phone connection status by querying daily call preferences
  const checkPhoneConnectionStatus = useCallback(async (): Promise<boolean> => {
    try {
      // Use the provided userId or fallback to default
      const currentUserId = userId || 'user_314M04o2MAC2IWgqNsdMK9AT7Kw';

      // Check if user has valid phone number in daily call preferences
      const prefsResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/api/daily-call-preferences/${currentUserId}`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (prefsResponse.ok) {
        const data = await prefsResponse.json();
        const hasValidPhoneNumber = data.success && data.preferences?.phone_number && data.preferences.phone_number.length > 0;
        console.log('📞 Phone connection status:', {
          userId: currentUserId,
          hasValidPhoneNumber,
          phoneNumber: data.preferences?.phone_number ? '***-***-' + data.preferences.phone_number.slice(-4) : 'none'
        });
        return hasValidPhoneNumber;
      }

      return false;
    } catch (error) {
      console.error('Failed to check phone connection status:', error);
      return false;
    }
  }, [userId]);

  // Check and update authentication status
  const checkAndUpdateAuthStatus = useCallback(async () => {
    try {
      console.log('🔍 Checking authentication status...');
      const status = await checkAuthStatus();
      console.log('🔍 Authentication status updated:', status);

      // Check phone connection status dynamically
      const phoneConnected = await checkPhoneConnectionStatus();

      const newConnectionStatus = {
        calendar: status.calendar,
        email: status.gmail,
        phone: phoneConnected, // Dynamic phone connection status based on daily call preferences
        bills: status.bills
      };

      // Only update state if there are actual changes to prevent unnecessary re-renders
      onConnectionStatusChange(prev => {
        const hasChanges = 
          prev.calendar !== newConnectionStatus.calendar ||
          prev.email !== newConnectionStatus.email ||
          prev.phone !== newConnectionStatus.phone ||
          prev.bills !== newConnectionStatus.bills;

        if (hasChanges) {
          console.log('📊 Connection status changed:', {
            from: prev,
            to: newConnectionStatus
          });

          // Show toast notification for significant changes
          if (!prev.calendar && newConnectionStatus.calendar) {
            toast.success('Google Calendar connected', { id: 'connection-status' });
          } else if (prev.calendar && !newConnectionStatus.calendar) {
            toast.error('Google Calendar disconnected', { id: 'connection-status' });
          }

          if (!prev.email && newConnectionStatus.email) {
            toast.success('Gmail connected', { id: 'connection-status' });
          } else if (prev.email && !newConnectionStatus.email) {
            toast.error('Gmail disconnected', { id: 'connection-status' });
          }

          if (!prev.bills && newConnectionStatus.bills) {
            toast.success('Bills & Subscriptions connected', { id: 'connection-status' });
          } else if (prev.bills && !newConnectionStatus.bills) {
            toast.error('Bills & Subscriptions disconnected', { id: 'connection-status' });
          }

          return newConnectionStatus;
        }
        return prev;
      });

      onAuthStatusChange(prev => {
        const newAuthStatus = {
          authenticated: status.calendar || status.gmail,
          calendar: status.calendar,
          gmail: status.gmail
        };

        // Only update if changed
        if (prev.authenticated !== newAuthStatus.authenticated ||
            prev.calendar !== newAuthStatus.calendar ||
            prev.gmail !== newAuthStatus.gmail) {
          return newAuthStatus;
        }
        return prev;
      });

      onLastStatusCheckChange(new Date());
      return status;
    } catch (error) {
      console.error('❌ Failed to check authentication status:', error);
      // Don't show error toast on every check to avoid spam
      return { calendar: false, gmail: false, bills: false };
    }
  }, [checkAuthStatus, checkPhoneConnectionStatus, userPhoneNumber, onConnectionStatusChange, onAuthStatusChange, onLastStatusCheckChange]);

  // Check authentication status on mount and set up periodic checking
  useEffect(() => {
    let isMounted = true;
    let hasInitialCheck = false;

    // Initial check with delay to prevent setState during render
    const performInitialCheck = async () => {
      if (isMounted && !hasInitialCheck) {
        hasInitialCheck = true;
        console.log('🔄 Performing initial auth status check');
        await checkAndUpdateAuthStatus();
      }
    };

    // Delay initial check to prevent setState during render warning
    const initialTimeout = setTimeout(performInitialCheck, 100);

    // Periodic checking with health pre-check and exponential backoff
    let interval: NodeJS.Timeout;

    const scheduleNext = (delay: number) => {
      if (!isMounted) return;
      clearInterval(interval);
      interval = setInterval(async () => {
        if (!isMounted) return;
        const healthy = await checkHealth();
        if (!healthy) {
          // Suppress auth logs when offline; increase backoff
          const b = backoffRef.current;
          b.isOffline = true;
          b.delayMs = Math.min(b.delayMs * 2, b.maxDelayMs);
          console.log(`⚠️ Backend offline. Next auth check in ${Math.round(b.delayMs / 1000)}s`);
          scheduleNext(b.delayMs);
          return;
        }
        // Backend healthy: reset backoff and perform check with standard log
        const b = backoffRef.current;
        if (b.isOffline) console.log('✅ Backend reachable again. Restoring normal polling.');
        b.isOffline = false;
        b.delayMs = 30000; // 30s normal period
        console.log('🔄 Performing periodic auth status check');
        await checkAndUpdateAuthStatus();
        scheduleNext(b.delayMs);
      }, delay);
      onStatusCheckIntervalChange(interval);
    };

    scheduleNext(30000);

    return () => {
      isMounted = false;
      clearTimeout(initialTimeout);
      clearInterval(interval);
      onStatusCheckIntervalChange(null);
    };
  }, []); // Remove dependencies to prevent re-running effect

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [statusCheckInterval]);

  // Manual refresh function
  const refreshConnectionStatus = useCallback(async () => {
    console.log('🔄 Manual connection status refresh');
    await checkAndUpdateAuthStatus();
  }, [checkAndUpdateAuthStatus]);

  // Check if any service is connected
  const hasAnyServiceConnected = connectionStatus.calendar || connectionStatus.email || connectionStatus.bills;

  // Check if user is authenticated
  const isAuthenticated = authStatus.authenticated;

  // Get connection summary
  const getConnectionSummary = useCallback(() => {
    const connected = [];
    const disconnected = [];

    if (connectionStatus.calendar) connected.push('Calendar');
    else disconnected.push('Calendar');

    if (connectionStatus.email) connected.push('Email');
    else disconnected.push('Email');

    if (connectionStatus.phone) connected.push('Phone');
    else disconnected.push('Phone');

    if (connectionStatus.bills) connected.push('Bills');
    else disconnected.push('Bills');

    return { connected, disconnected };
  }, [connectionStatus]);

  return {
    checkAndUpdateAuthStatus,
    refreshConnectionStatus,
    hasAnyServiceConnected,
    isAuthenticated,
    getConnectionSummary,
    lastStatusCheck
  };
};
