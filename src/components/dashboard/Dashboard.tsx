import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/ClerkAuthContext';
import { useDashboard } from '@/hooks/useDashboard';
import { useDashboardState } from '@/hooks/useDashboardState';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';
import { ChatterboxVoiceInterface } from '@/features/chatterbox/components/ChatterboxVoiceInterface';
import { DashboardHeader } from './DashboardHeader';
import { ConnectionBlocks } from './ConnectionBlocks';
import { DailyCallWidgetV3 } from './widgets/DailyCallWidgetV3';
import { DailyBriefingWidget } from './widgets/DailyBriefingWidget';
import { ChatterboxWidget } from './widgets/ChatterboxWidget';
import { DailyBriefingPreview } from './DailyBriefingPreview';
import { WelcomeBackSection } from './WelcomeBackSection';
import { BillsKPI } from './widgets/BillsKPI';
import { TodaysAppointments } from './widgets/TodaysAppointments';
import { dailyBriefingService } from '@/services/dailyBriefingService';
import toast, { Toaster } from 'react-hot-toast';

interface DashboardProps {
  onBeginSetup?: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onBeginSetup }) => {
  const { user, logout } = useAuth();
  const {
    authenticateCalendar,
    authenticateGmail,
    authenticateBills,
    disconnectService,
    signOutAllServices,
    processVoiceCommand
  } = useDashboard();

  // Use centralized state management
  const dashboardState = useDashboardState();
  const {
    isVoiceActive,
    isLoadingDailySummary,
    dailySummaryResponse,
    showDailyBriefingModal,
    connectionStatus,
    authStatus,
    lastStatusCheck,
    statusCheckInterval,
    isSigningOut,
    // Actions
    setIsVoiceActive,
    setShowDailyBriefingModal,
    setIsSigningOut
  } = dashboardState;

  // Connection status monitoring - moved after state initialization
  const { refreshConnectionStatus } = useConnectionStatus({
    connectionStatus,
    authStatus,
    lastStatusCheck,
    statusCheckInterval,
    userPhoneNumber: user?.phoneNumber,
    userId: user?.id || 'user_314M04o2MAC2IWgqNsdMK9AT7Kw',
    onConnectionStatusChange: dashboardState.setConnectionStatus,
    onAuthStatusChange: dashboardState.setAuthStatus,
    onLastStatusCheckChange: dashboardState.setLastStatusCheck,
    onStatusCheckIntervalChange: dashboardState.setStatusCheckInterval
  });

  // Daily Call Preferences Functions - Now handled by DailyCallWidgetV2

  // Event Handlers

  const handleDailySummaryClick = async () => {
    try {
      // Check if we already have today's briefing
      const hasBriefing = await dailyBriefingService.hasTodaysBriefing();

      if (!hasBriefing) {
        // Generate new briefing
        toast.loading('Generating your daily briefing...', { id: 'daily-briefing' });

        const result = await dailyBriefingService.generateBriefing();

        if (result.success) {
          toast.success('Daily briefing generated successfully', { id: 'daily-briefing' });
        } else {
          toast.error(result.error || 'Failed to generate briefing', { id: 'daily-briefing' });
        }
      }

      // Show the briefing modal
      setShowDailyBriefingModal(true);
    } catch (error) {
      console.error('Failed to handle daily summary click:', error);
      toast.error('Failed to load daily briefing');
      // Still show the modal even if generation failed
      setShowDailyBriefingModal(true);
    }
  };

  const handleChatterboxClick = () => {
    setIsVoiceActive(!isVoiceActive);
  };

  const handleDisconnectService = async (service: 'calendar' | 'email' | 'bills' | 'phone') => {
    try {
      await disconnectService(service);
      // Connection status will be updated automatically by useConnectionStatus hook
    } catch (error) {
      console.error(`Failed to disconnect ${service}:`, error);
      // Error toast will be shown by ConnectionBlocks component
    }
  };

  const handleLogout = async () => {
    try {
      setIsSigningOut(true);
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Logout failed');
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleSignOutAllServices = async () => {
    try {
      setIsSigningOut(true);
      await signOutAllServices();
      await refreshConnectionStatus();
      toast.success('Signed out of all services');
    } catch (error) {
      console.error('Sign out failed:', error);
      toast.error('Sign out failed');
    } finally {
      setIsSigningOut(false);
    }
  };

  // Tabs state with persistence
  const [activeTab, setActiveTab] = useState<'actions' | 'briefing' | 'connections'>(() => {
    try {
      const saved = localStorage.getItem('dashboard.activeTab');
      return saved === 'connections' || saved === 'actions' || saved === 'briefing' ? saved : 'actions';
    } catch {
      return 'actions';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('dashboard.activeTab', activeTab);
    } catch {
      // ignore storage errors
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="max-w-screen-2xl mx-auto p-4 md:p-6 xl:p-8 2xl:p-10">
        {/* Header */}
        <DashboardHeader
          user={user}
          theme="light"
          connectionStatus={connectionStatus}
          authStatus={authStatus}
          isSigningOut={isSigningOut}
          onAuthenticateCalendar={authenticateCalendar}
          onAuthenticateGmail={authenticateGmail}
          onAuthenticateBills={authenticateBills}
          onSignOutAllServices={handleSignOutAllServices}
          onLogout={handleLogout}
          onBeginSetup={onBeginSetup}
        />

        {/* Welcome Back Section */}
        <WelcomeBackSection
          userName={user?.firstName || 'Stefano O'}
          connectionStatus={connectionStatus}
        />

        {/* Tabs: Today's Actions, Daily Briefing Preview, Connections */}
        <div className="mb-8">
          <div className="relative flex border-b border-gray-200 dark:border-gray-800 px-2 md:px-0" role="tablist" aria-label="Dashboard sections">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'actions' ? 'true' : 'false'}
              aria-controls="tabpanel-actions"
              id="tab-actions"
              onClick={() => setActiveTab('actions')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'actions'
                  ? 'text-blue-600 border-blue-500'
                  : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Today's Actions
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'briefing' ? 'true' : 'false'}
              aria-controls="tabpanel-briefing"
              id="tab-briefing"
              onClick={() => setActiveTab('briefing')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'briefing'
                  ? 'text-blue-600 border-blue-500'
                  : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Daily Briefing Preview
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'connections' ? 'true' : 'false'}
              aria-controls="tabpanel-connections"
              id="tab-connections"
              onClick={() => setActiveTab('connections')}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === 'connections'
                  ? 'text-blue-600 border-blue-500'
                  : 'text-gray-600 dark:text-gray-300 border-transparent hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              Connections
            </button>

            {/* Sliding underline indicator */}
            <span
              aria-hidden="true"
              className={`pointer-events-none absolute bottom-0 left-0 h-0.5 w-1/3 bg-[#2563eb] transition-transform duration-300 ease-in-out ${
                activeTab === 'briefing' ? 'translate-x-full' :
                activeTab === 'connections' ? 'translate-x-[200%]' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Tab Panels */}
        <div>
          {/* Actions Panel */}
          <div
            id="tabpanel-actions"
            role="tabpanel"
            aria-labelledby="tab-actions"
            hidden={activeTab !== 'actions'}
            className={`transition-opacity duration-300 ease-in-out ${activeTab === 'actions' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'} transform`}
          >
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 xl:gap-8 2xl:gap-10 mb-6">
              <BillsKPI />
              <TodaysAppointments onAuthenticateCalendar={authenticateCalendar} />
              <DailyBriefingWidget
                isLoadingDailySummary={isLoadingDailySummary}
                dailySummaryResponse={dailySummaryResponse}
                showDailyBriefingModal={showDailyBriefingModal}
                onDailySummaryClick={handleDailySummaryClick}
                onCloseDailyBriefingModal={() => setShowDailyBriefingModal(false)}
              />
            </div>

            {/* Main Widgets Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 md:gap-6 xl:gap-8 2xl:gap-10 mb-10">
              <DailyCallWidgetV3 userId={user?.id || 'user_314M04o2MAC2IWgqNsdMK9AT7Kw'} />
              <ChatterboxWidget isVoiceActive={isVoiceActive} onChatterboxClick={handleChatterboxClick} />
            </div>
          </div>

          {/* Daily Briefing Preview Panel */}
          <div
            id="tabpanel-briefing"
            role="tabpanel"
            aria-labelledby="tab-briefing"
            hidden={activeTab !== 'briefing'}
            className={`transition-opacity duration-300 ease-in-out ${activeTab === 'briefing' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'} transform`}
          >
            <DailyBriefingPreview
              connectionStatus={connectionStatus}
              onAuthenticateCalendar={authenticateCalendar}
              onAuthenticateGmail={authenticateGmail}
              onAuthenticateBills={authenticateBills}
            />
          </div>

          {/* Connections Panel */}
          <div
            id="tabpanel-connections"
            role="tabpanel"
            aria-labelledby="tab-connections"
            hidden={activeTab !== 'connections'}
            className={`transition-opacity duration-300 ease-in-out ${activeTab === 'connections' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-1'} transform`}
          >
            <div className="mb-8">
              <ConnectionBlocks
                connectionStatus={connectionStatus}
                onAuthenticateCalendar={authenticateCalendar}
                onAuthenticateGmail={authenticateGmail}
                onAuthenticateBills={authenticateBills}
                onDisconnectService={handleDisconnectService}
              />
            </div>
          </div>
        </div>

        {/* Chatterbox Voice Interface */}
        {isVoiceActive && (
          <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
            <ChatterboxVoiceInterface
              isActive={isVoiceActive}
              onToggle={() => setIsVoiceActive(!isVoiceActive)}
              onProcessCommand={processVoiceCommand}
            />
          </div>
        )}
      </div>

      {/* Toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          className: 'text-sm',
          style: {
            marginTop: '60px',
            background: 'var(--background)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
          },
        }}
      />


    </div>
  );
};
