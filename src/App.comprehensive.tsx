import React, { Suspense } from 'react';
import { ModernThemeProvider } from './components/providers/ModernThemeProvider';
import { QueryProvider } from './components/providers/QueryProvider';
import { ClerkAuthProvider as AuthProvider, useAuth } from './contexts/ClerkAuthContext';
import { OnboardingProvider, useOnboarding } from './contexts/OnboardingContext';
import { AgentSettingsProvider } from './contexts/AgentSettingsContext';
import ErrorBoundary from './components/common/ErrorBoundary';

// Lazy load components for code splitting
const ClerkAuthPage = React.lazy(() => import('./components/auth/ClerkAuthPage').then(module => ({ default: module.ClerkAuthPage })));
const ModernGamifiedOnboarding = React.lazy(() => import('./components/modern/ModernGamifiedOnboarding'));
const Dashboard = React.lazy(() => import('./components/dashboard/Dashboard').then(module => ({ default: module.Dashboard })));
const DailyCallPreferencesTest = React.lazy(() => import('./components/test/DailyCallPreferencesTest').then(module => ({ default: module.DailyCallPreferencesTest })));
const DailyCallWidgetV2Test = React.lazy(() => import('./components/test/DailyCallWidgetV2Test').then(module => ({ default: module.DailyCallWidgetV2Test })));
const ChatterboxTestPage = React.lazy(() => import('./features/chatterbox/components/ChatterboxTestPage').then(module => ({ default: module.ChatterboxTestPage })));

// Loading component for Suspense fallback
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
      <p className="text-muted-foreground">Loading...</p>
    </div>
  </div>
);

// Main App Content Component
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, user, updateProfile } = useAuth();
  const { completeOnboarding, isComplete: onboardingComplete } = useOnboarding();
  const [showOnboarding, setShowOnboarding] = React.useState(false);

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication page if not authenticated
  if (!isAuthenticated) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ClerkAuthPage />
      </Suspense>
    );
  }

  // Show onboarding if explicitly requested or if not completed and first time
  if (showOnboarding || (!onboardingComplete && showOnboarding)) {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ModernGamifiedOnboarding
          initialStep={0}
          onComplete={async (userData) => {
            console.log('🎉 Onboarding completion started:', userData);
            console.log('👤 Current user state:', { user: !!user, userId: user?.id });

            // Save phone number to user profile if provided
            if (userData.phoneNumber && user) {
              try {
                console.log('📱 Updating user profile with phone number...');
                await updateProfile({
                  phoneNumber: userData.phoneNumber,
                  preferences: {
                    theme: user?.preferences?.theme ?? 'system',
                    notifications: user?.preferences?.notifications ?? true,
                    timezone: user?.preferences?.timezone ?? 'America/Los_Angeles',
                    callTime: userData.preferredCallTime || (user?.preferences?.callTime ?? '08:00:00')
                  }
                });
                console.log('✅ User profile updated with phone number');
              } catch (error) {
                console.error('❌ Failed to update user profile:', error);
              }
            } else {
              console.log('⚠️ Skipping profile update - no phone number or user not available');
            }

            console.log('🏁 Completing onboarding...');
            completeOnboarding();
            setShowOnboarding(false);
            console.log('✅ Onboarding completed successfully');
          }}
          onStepChange={(step) => {
            console.log('Step changed to:', step);
          }}
          onSkip={() => {
            console.log('Onboarding skipped');
            completeOnboarding();
            setShowOnboarding(false);
          }}
          showProgressBar={true}
          enableAnimations={true}
          collectUserPreferences={true}
        />
      </Suspense>
    );
  }

  // Check for test mode
  const urlParams = new URLSearchParams(window.location.search);
  const testMode = urlParams.get('test');

  if (testMode === 'daily-call-preferences') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <DailyCallPreferencesTest />
      </Suspense>
    );
  }

  if (testMode === 'daily-call-widget-v2') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <DailyCallWidgetV2Test />
      </Suspense>
    );
  }

  if (testMode === 'chatterbox') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ChatterboxTestPage />
      </Suspense>
    );
  }

  // Show main dashboard if authenticated
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Dashboard onBeginSetup={() => setShowOnboarding(true)} />
    </Suspense>
  );
};

// Wrapper component with providers
const AppWithProviders: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('Application Error:', error);
        console.error('Error Info:', errorInfo);
      }}
    >
      <QueryProvider>
        <AuthProvider>
          <OnboardingProvider>
            <AgentSettingsProvider>
              <AppContent />
            </AgentSettingsProvider>
          </OnboardingProvider>
        </AuthProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <ModernThemeProvider defaultTheme="system" storageKey="ai-assistant-theme">
      <AppWithProviders />
    </ModernThemeProvider>
  );
};

export default App;
