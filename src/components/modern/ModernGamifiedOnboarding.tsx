import React, { useState, useEffect } from 'react';
import { OnboardingStep } from '../../data/enums';
import ModernWelcomeScreen from './screens/ModernWelcomeScreen';
import ModernOnboardingLayout from './ModernOnboardingLayout';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { googleOAuthService } from '../../services/googleOAuth';
import { supabaseService } from '../../services/supabaseService';

export interface ModernOnboardingUserData {
  preferredCallTime: string;
  phoneNumber?: string;
  importantContacts: string[];
  calendarCommands: string[];
  calendarConnected?: boolean;
  emailConnected?: boolean;
  billsConnected?: boolean;
  completedAt: Date;
}

export interface ModernGamifiedOnboardingProps {
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onComplete?: (userData: ModernOnboardingUserData) => void;
  onSkip?: () => void;
  showProgressBar?: boolean;
  enableAnimations?: boolean;
  collectUserPreferences?: boolean;
}

const ModernGamifiedOnboarding: React.FC<ModernGamifiedOnboardingProps> = ({
  initialStep = 0,
  onStepChange,
  onComplete,
  onSkip,
  showProgressBar = true,
  enableAnimations: _enableAnimations = true,
  collectUserPreferences: _collectUserPreferences = true
}) => {
  // Note: enableAnimations and collectUserPreferences are available for future use
  // Persist current step across OAuth redirects
  const [currentStep, setCurrentStep] = useState(() => {
    // Check if we're returning from OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');

    console.log('🚀 ModernGamifiedOnboarding initializing...', {
      initialStep,
      hasAuthSuccess: authSuccess === 'success',
      currentUrl: window.location.href,
      windowLocationSearch: window.location.search,
      windowLocationPathname: window.location.pathname,
      urlParamsString: window.location.search,
      authParam: authSuccess,
      authParamType: typeof authSuccess
    });

    if (authSuccess === 'success') {
      // Restore step from localStorage if returning from OAuth
      const savedStep = localStorage.getItem('onboarding-current-step');
      if (savedStep) {
        const stepNumber = parseInt(savedStep, 10);
        console.log('🔄 Restoring onboarding step after OAuth:', stepNumber, 'from localStorage');
        return stepNumber;
      } else {
        console.log('⚠️ OAuth callback detected but no saved step found in localStorage');
      }
    }

    console.log('📍 Using initial step:', initialStep);
    // Save the initial step to localStorage for future OAuth callbacks
    localStorage.setItem('onboarding-current-step', initialStep.toString());
    return initialStep;
  });
  const [userData, setUserData] = useState<Partial<ModernOnboardingUserData>>({
    preferredCallTime: '8:00 AM',
    phoneNumber: '',
    importantContacts: [],
    calendarCommands: [],
    calendarConnected: false,
    emailConnected: false,
    billsConnected: false
  });

  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  const [isConnectingEmail, setIsConnectingEmail] = useState(false);
  const [isConnectingBills, setIsConnectingBills] = useState(false);

  const totalSteps = 7;

  const handleStepChange = (step: number) => {
    setCurrentStep(step);
    // Persist step for OAuth callback restoration
    localStorage.setItem('onboarding-current-step', step.toString());
    onStepChange?.(step);
  };

  const handleNext = () => {
    const nextStep = currentStep + 1;
    if (nextStep < totalSteps) {
      handleStepChange(nextStep);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      handleStepChange(currentStep - 1);
    }
  };

  const handleComplete = () => {
    const completeUserData: ModernOnboardingUserData = {
      preferredCallTime: userData.preferredCallTime || '8:00 AM',
      phoneNumber: userData.phoneNumber,
      importantContacts: userData.importantContacts || [],
      calendarCommands: userData.calendarCommands || [],
      calendarConnected: userData.calendarConnected || false,
      emailConnected: userData.emailConnected || false,
      billsConnected: userData.billsConnected || false,
      completedAt: new Date()
    };

    // Clean up localStorage when onboarding is completed
    localStorage.removeItem('onboarding-current-step');

    onComplete?.(completeUserData);
  };

  const updateUserData = (updates: Partial<ModernOnboardingUserData>) => {
    setUserData(prev => ({ ...prev, ...updates }));
  };

  // Detect OAuth callback success (moved after updateUserData definition)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const authSuccess = urlParams.get('auth');

    console.log('🔍 OAuth detection useEffect triggered', {
      windowLocationHref: window.location.href,
      windowLocationSearch: window.location.search,
      windowLocationPathname: window.location.pathname,
      urlParamsString: window.location.search,
      authSuccess,
      authSuccessType: typeof authSuccess,
      currentStep,
      currentStepName: OnboardingStep[currentStep]
    });

    if (authSuccess === 'success') {
      console.log('✅ OAuth authentication successful, updating connection status...');
      console.log('🔍 Current step during OAuth callback:', currentStep, OnboardingStep[currentStep]);

      // Update connection status based on current step
      if (currentStep === OnboardingStep.CALENDAR_MANAGEMENT) {
        updateUserData({ calendarConnected: true });
        setIsConnectingCalendar(false);
        console.log('📅 Calendar connected successfully - staying on Step 4 (CALENDAR_MANAGEMENT)');
      } else if (currentStep === OnboardingStep.EMAIL_SUMMARIES) {
        updateUserData({ emailConnected: true });
        setIsConnectingEmail(false);
        console.log('📧 Gmail connected successfully - staying on Step 5 (EMAIL_SUMMARIES)');
      } else if (currentStep === OnboardingStep.FINANCIAL_REMINDERS) {
        updateUserData({ billsConnected: true });
        setIsConnectingBills(false);
        console.log('💰 Bills connected successfully - staying on Step 6 (FINANCIAL_REMINDERS)');
      }

      // Clean up URL parameters without changing step
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
      console.log('🧹 Cleaned up OAuth URL parameters, staying on current step');
    }
  }, [currentStep, updateUserData]);

  const renderCurrentScreen = () => {
    switch (currentStep) {
      case OnboardingStep.WELCOME:
        return <ModernWelcomeScreen onNext={handleNext} />;
      
      case OnboardingStep.DAILY_CALL:
        return (
          <ModernOnboardingLayout
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={onSkip}
            showProgress={showProgressBar}
          >
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Daily Call Setup
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                When would you like to receive your daily briefing call?
              </p>

              <div className="max-w-md mx-auto space-y-6">
                {/* Preset Time Options */}
                <div>
                  <Label className="text-base font-medium mb-3 block">Quick Select</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {['6:00 AM', '8:00 AM', '10:00 AM'].map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => updateUserData({ preferredCallTime: time })}
                        className={`p-3 rounded-lg border-2 transition-all ${
                          userData.preferredCallTime === time
                            ? 'border-primary bg-primary/10 text-primary font-semibold'
                            : 'border-gray-200 dark:border-gray-700 hover:border-primary/50'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Time Picker */}
                <div>
                  <Label htmlFor="custom-time" className="text-base font-medium mb-3 block">
                    Or Choose Custom Time
                  </Label>
                  <Input
                    id="custom-time"
                    type="time"
                    value={userData.preferredCallTime?.includes(':') && !userData.preferredCallTime?.includes('AM') && !userData.preferredCallTime?.includes('PM')
                      ? userData.preferredCallTime
                      : '08:00'}
                    onChange={(e) => {
                      const timeValue = e.target.value;
                      const [hours, minutes] = timeValue.split(':');
                      const hour24 = parseInt(hours);
                      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
                      const ampm = hour24 >= 12 ? 'PM' : 'AM';
                      const formattedTime = `${hour12}:${minutes} ${ampm}`;
                      updateUserData({ preferredCallTime: formattedTime });
                    }}
                    className="text-center text-lg"
                  />
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Selected: <span className="font-medium text-primary">{userData.preferredCallTime}</span>
                  </p>
                </div>
              </div>
            </div>
          </ModernOnboardingLayout>
        );

      case OnboardingStep.PHONE_SETUP:
        return (
          <ModernOnboardingLayout
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={onSkip}
            showProgress={showProgressBar}
          >
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                📞 Phone Number Setup
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Provide your phone number for daily call reminders
              </p>

              <div className="max-w-md mx-auto space-y-4">
                <div>
                  <Label htmlFor="phone-number" className="text-base font-medium mb-3 block">
                    Your Phone Number
                  </Label>
                  <Input
                    id="phone-number"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={userData.phoneNumber || ''}
                    onChange={(e) => updateUserData({ phoneNumber: e.target.value })}
                    className="text-center text-lg"
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    We'll use this number to call you with daily briefings
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    Phone: <span className="font-medium text-primary">{userData.phoneNumber || 'Not provided'}</span>
                  </p>
                </div>
              </div>
            </div>
          </ModernOnboardingLayout>
        );

      case OnboardingStep.CALENDAR_MANAGEMENT:
        return (
          <ModernOnboardingLayout
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={onSkip}
            showProgress={showProgressBar}
          >
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Calendar Integration
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Connect your calendar to get personalized daily summaries
              </p>

              <div className="max-w-md mx-auto space-y-4">
                <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Google Calendar</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect your Google Calendar to receive personalized daily briefings
                  </p>
                  <button
                    type="button"
                    disabled={isConnectingCalendar}
                    className={`px-4 py-2 rounded-lg transition-colors shadow-sm ${
                      userData.calendarConnected
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : isConnectingCalendar
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                    }`}
                    onClick={async () => {
                      if (userData.calendarConnected || isConnectingCalendar) return;

                      try {
                        setIsConnectingCalendar(true);
                        console.log('Initiating Google Calendar connection...');

                        // Save current step before OAuth redirect
                        localStorage.setItem('onboarding-current-step', currentStep.toString());

                        const result = await googleOAuthService.connectCalendar();

                        if (result.success) {
                          updateUserData({ calendarConnected: true });
                          console.log('Google Calendar connected successfully');
                        } else {
                          throw new Error(result.error || 'Failed to connect');
                        }
                      } catch (error) {
                        console.error('❌ Failed to connect Google Calendar:', error);
                        // TODO: Show proper UI error notification instead of alert
                      } finally {
                        setIsConnectingCalendar(false);
                      }
                    }}
                  >
                    {isConnectingCalendar ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                        Connecting...
                      </>
                    ) : userData.calendarConnected ? (
                      'Connected ✓'
                    ) : (
                      'Connect Calendar'
                    )}
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    We'll only access your calendar events to provide better daily summaries
                  </p>
                </div>
              </div>
            </div>
          </ModernOnboardingLayout>
        );
      
      case OnboardingStep.EMAIL_SUMMARIES:
        return (
          <ModernOnboardingLayout
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={onSkip}
            showProgress={showProgressBar}
          >
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Email Summaries
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Get important email highlights in your daily briefing
              </p>

              <div className="max-w-md mx-auto space-y-4">
                <div className="p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Gmail Integration</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect Gmail to get AI-powered email summaries in your daily briefing
                  </p>
                  <button
                    type="button"
                    disabled={isConnectingEmail}
                    className={`px-4 py-2 rounded-lg transition-colors shadow-sm ${
                      userData.emailConnected
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : isConnectingEmail
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-[0_0_12px_rgba(37,99,235,0.4)]'
                    }`}
                    onClick={async () => {
                      if (userData.emailConnected || isConnectingEmail) return;

                      try {
                        setIsConnectingEmail(true);
                        console.log('Initiating Gmail connection...');

                        // Save current step before OAuth redirect
                        localStorage.setItem('onboarding-current-step', currentStep.toString());

                        const result = await googleOAuthService.connectGmail();

                        if (result.success) {
                          updateUserData({ emailConnected: true });
                          console.log('Gmail connected successfully');
                        } else {
                          throw new Error(result.error || 'Failed to connect');
                        }
                      } catch (error) {
                        console.error('❌ Failed to connect Gmail:', error);
                        // TODO: Show proper UI error notification instead of alert
                      } finally {
                        setIsConnectingEmail(false);
                      }
                    }}
                  >
                    {isConnectingEmail ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                        Connecting...
                      </>
                    ) : userData.emailConnected ? (
                      'Connected ✓'
                    ) : (
                      'Connect Gmail'
                    )}
                  </button>
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium text-center">Important Contacts</h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {userData.importantContacts?.map((contact, index) => (
                      <span key={index} className="px-2 py-1 bg-primary/10 text-primary text-sm rounded">
                        {contact}
                      </span>
                    ))}
                    {(!userData.importantContacts || userData.importantContacts.length === 0) && (
                      <p className="text-sm text-muted-foreground">No important contacts added yet</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </ModernOnboardingLayout>
        );
      
      case OnboardingStep.FINANCIAL_REMINDERS:
        return (
          <ModernOnboardingLayout
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={onSkip}
            showProgress={showProgressBar}
          >
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                Financial Reminders
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Never miss important bills and financial deadlines
              </p>

              <div className="max-w-md mx-auto space-y-6">
                <div className="grid grid-cols-1 gap-4">
                  {[
                    { icon: '💳', title: 'Credit Card Bills', desc: 'Monthly payment reminders' },
                    { icon: '🏠', title: 'Rent/Mortgage', desc: 'Housing payment alerts' },
                    { icon: '⚡', title: 'Utilities', desc: 'Electricity, water, gas bills' },
                    { icon: '📱', title: 'Subscriptions', desc: 'Netflix, Spotify, etc.' }
                  ].map((item, index) => (
                    <div key={index} className="flex items-center p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="text-2xl mr-3">{item.icon}</div>
                      <div className="flex-1">
                        <h4 className="font-medium">{item.title}</h4>
                        <p className="text-sm text-muted-foreground">{item.desc}</p>
                      </div>
                      <div className="w-5 h-5 border-2 border-primary rounded bg-primary/10"></div>
                    </div>
                  ))}
                </div>

                <div className="text-center space-y-4">
                  <button
                    type="button"
                    disabled={isConnectingBills}
                    className={`px-6 py-3 rounded-lg transition-colors shadow-sm ${
                      userData.billsConnected
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : isConnectingBills
                        ? 'bg-gray-400 text-white cursor-not-allowed'
                        : 'bg-orange-600 text-white hover:bg-orange-700 hover:shadow-[0_0_12px_rgba(234,88,12,0.4)]'
                    }`}
                    onClick={async () => {
                      if (userData.billsConnected || isConnectingBills) return;

                      try {
                        setIsConnectingBills(true);
                        console.log('Connecting to Supabase for bills management...');

                        const result = await supabaseService.connectSupabase('dashboard-user');

                        if (result.success) {
                          updateUserData({ billsConnected: true });
                          console.log('Supabase bills connected successfully');
                        } else {
                          throw new Error(result.error || 'Failed to connect');
                        }
                      } catch (error) {
                        console.error('❌ Failed to connect Supabase bills:', error);
                        // TODO: Show proper UI error notification instead of alert
                      } finally {
                        setIsConnectingBills(false);
                      }
                    }}
                  >
                    {isConnectingBills ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2 inline-block"></div>
                        Connecting...
                      </>
                    ) : userData.billsConnected ? (
                      'Connected ✓'
                    ) : (
                      'Connect Bills'
                    )}
                  </button>

                  <p className="text-sm text-muted-foreground">
                    We'll remind you 3 days before each due date
                  </p>
                </div>
              </div>
            </div>
          </ModernOnboardingLayout>
        );
      
      case OnboardingStep.GET_STARTED:
        return (
          <ModernOnboardingLayout
            currentStep={currentStep}
            totalSteps={totalSteps}
            onNext={handleComplete}
            onBack={handleBack}
            onSkip={onSkip}
            nextLabel="Complete Setup"
            showProgress={showProgressBar}
          >
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
                You're All Set!
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300">
                Your AI Daily Assistant is ready to help you start each day organized and informed
              </p>

              <div className="max-w-md mx-auto space-y-6">
                {/* Setup Summary */}
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 dark:text-green-200 mb-3">Setup Complete!</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span>Daily Call Time:</span>
                      <span className="font-medium text-green-700 dark:text-green-300">{userData.preferredCallTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Phone Number:</span>
                      <span className="font-medium text-green-700 dark:text-green-300">
                        {userData.phoneNumber || 'Not provided'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Calendar:</span>
                      <span className={`font-medium ${userData.calendarConnected ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                        {userData.calendarConnected ? 'Connected ✓' : 'Ready to connect'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Email:</span>
                      <span className={`font-medium ${userData.emailConnected ? 'text-green-700 dark:text-green-300' : 'text-yellow-700 dark:text-yellow-300'}`}>
                        {userData.emailConnected ? 'Connected ✓' : 'Ready to connect'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Financial Reminders:</span>
                      <span className="font-medium text-green-700 dark:text-green-300">Configured</span>
                    </div>
                  </div>
                </div>

                {/* Next Steps */}
                <div className="text-center space-y-3">
                  <h3 className="font-semibold">What happens next?</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• {userData.calendarConnected ? '✅' : '📅'} Calendar integration {userData.calendarConnected ? 'connected' : 'ready to connect'}</p>
                    <p>• {userData.emailConnected ? '✅' : '📧'} Email summaries {userData.emailConnected ? 'connected' : 'ready to connect'}</p>
                    <p>• {userData.billsConnected ? '✅' : '💰'} Financial reminders {userData.billsConnected ? 'connected' : 'ready to connect'}</p>
                    <p>• 📞 Receive your first daily briefing call tomorrow at {userData.preferredCallTime}</p>
                    <p>• 🎤 Use JARVIS voice commands for hands-free assistance</p>
                  </div>
                </div>

                {/* Celebration */}
                <div className="text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-sm font-medium text-primary">Welcome to your smarter daily routine!</p>
                </div>
              </div>
            </div>
          </ModernOnboardingLayout>
        );
      
      default:
        return <ModernWelcomeScreen onNext={handleNext} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderCurrentScreen()}
    </div>
  );
};

export default ModernGamifiedOnboarding;
