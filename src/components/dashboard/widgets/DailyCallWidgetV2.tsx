import React, { useState, useEffect } from 'react';
import { Phone, Settings, Save, X, Clock, RotateCcw, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Switch } from '../../ui/switch';
import {
  useDailyCallPreferences,
  useUpdateDailyCallPreferences,
  useTestDailyCall,
  DailyCallPreferences
} from '../../../hooks/queries';
import {
  dailyCallPreferencesSchema,
  updateDailyCallPreferencesSchema,
  testDailyCallSchema,
  type UpdateDailyCallPreferences,
  type TestDailyCall
} from '../../../shared/schemas';
import {
  handleFormError,
  clearFormErrors,
  getFieldError,
  hasFieldError,
  formatPhoneNumberForDisplay
} from '../../../shared/utils/formUtils';

interface DailyCallWidgetV2Props {
  userId?: string;
}

export const DailyCallWidgetV2: React.FC<DailyCallWidgetV2Props> = ({
  userId = 'user_314M04o2MAC2IWgqNsdMK9AT7Kw'
}) => {
  // TanStack Query hooks
  const {
    data: preferencesData,
    isLoading,
    error,
    refetch
  } = useDailyCallPreferences(userId);

  const updatePreferencesMutation = useUpdateDailyCallPreferences(userId);
  const testCallMutation = useTestDailyCall(userId);

  // Local state for UI
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [pendingSyncAt] = useState<string | null>(null);
  const [authenticationError, setAuthenticationError] = useState<string | null>(null);

  // Helper function to authenticate with Bills/Supabase
  const authenticateWithBills = async (): Promise<boolean> => {
    try {
      console.log('🔐 DailyCallWidget: Authenticating with Bills/Supabase...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const authResponse = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/bills/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: 'dashboard-user' }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!authResponse.ok) {
        throw new Error(`Authentication request failed: ${authResponse.status} ${authResponse.statusText}`);
      }

      const authResult = await authResponse.json();

      if (authResult.success) {
        console.log('✅ DailyCallWidget: Bills/Supabase authentication successful');
        setAuthenticationError(null);
        return true;
      } else {
        console.error('❌ DailyCallWidget: Bills/Supabase authentication failed:', authResult.error);
        const errorMessage = authResult.error || 'Authentication failed';
        setAuthenticationError(errorMessage);
        return false;
      }
    } catch (error) {
      console.error('❌ DailyCallWidget: Authentication error:', error);
      let errorMessage = 'Authentication failed';

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Authentication request timed out';
        } else {
          errorMessage = error.message;
        }
      }

      setAuthenticationError(errorMessage);
      return false;
    }
  };

  // Extract preferences from query data
  const preferences = preferencesData?.preferences || null;

  // React Hook Form setup for editing preferences
  const editForm = useForm<UpdateDailyCallPreferences>({
    resolver: zodResolver(updateDailyCallPreferencesSchema),
    defaultValues: {
      enabled: false,
      time: '08:00',
      timezone: 'America/Los_Angeles',
      phoneNumber: '',
      voice: 'alloy',
      includeCalendar: true,
      includeEmails: true,
      includeBills: true,
      weekdays: [true, true, true, true, true, false, false],
    },
  });

  // React Hook Form setup for test call
  const testForm = useForm<TestDailyCall>({
    resolver: zodResolver(testDailyCallSchema),
    defaultValues: {
      phoneNumber: '',
      message: 'This is a test call from your AI Daily Assistant.',
    },
  });

  // Update form when preferences change
  useEffect(() => {
    if (preferences && isEditMode) {
      editForm.reset(preferences);
    }
  }, [preferences, isEditMode]); // Removed editForm from dependencies to prevent setState during render

  // Handle test call with form validation
  const handleTestCall = async () => {
    try {
      // Use current phone number from preferences or form
      const phoneNumber = preferences?.phoneNumber || editForm.getValues('phoneNumber');
      if (!phoneNumber) {
        console.error('No phone number available for test call');
        return;
      }

      const testData = { phoneNumber };
      const validatedData = testDailyCallSchema.parse(testData);

      const result = await testCallMutation.mutateAsync(validatedData);
      if (result.success) {
        console.log('Test call initiated successfully:', result.callSid);
      } else {
        console.error('Test call failed:', result.error);
      }
    } catch (error) {
      console.error('Test call error:', error);
    }
  };

  // Handle save preferences with form validation and authentication
  const handleSavePreferences = async (data: UpdateDailyCallPreferences) => {
    try {
      console.log('💾 Saving daily call preferences:', data);

      // Prevent multiple concurrent save operations
      if (updatePreferencesMutation.isPending) {
        console.log('⏳ Save operation already in progress, skipping...');
        return;
      }

      // First ensure authentication with proper error handling
      const isAuthenticated = await authenticateWithBills();
      if (!isAuthenticated) {
        console.error('❌ Cannot save preferences: Authentication failed');
        // Show user-friendly error message
        if (authenticationError) {
          toast.error(`Authentication failed: ${authenticationError}`);
        } else {
          toast.error('Unable to authenticate with the server. Please try again.');
        }
        return;
      }

      clearFormErrors(editForm);

      // Show loading toast
      const loadingToast = toast.loading('Saving your preferences...');

      try {
        const result = await updatePreferencesMutation.mutateAsync(data);

        if (result.success) {
          console.log('✅ Preferences saved successfully');
          toast.success('Daily call preferences saved successfully!', { id: loadingToast });
          setIsEditMode(false);
          // Refetch to get updated data
          refetch();
        } else {
          console.error('❌ Failed to save preferences:', result.error);
          toast.error(`Failed to save preferences: ${result.error || 'Unknown error'}`, { id: loadingToast });
        }
      } catch (mutationError) {
        console.error('❌ Mutation error:', mutationError);
        toast.error(`Failed to save preferences: ${mutationError instanceof Error ? mutationError.message : 'Unknown error'}`, { id: loadingToast });
        throw mutationError; // Re-throw to be caught by outer catch
      }
    } catch (error) {
      handleFormError(error, editForm);
      console.error('Failed to save preferences:', error);
      // Ensure we show an error message if none was shown yet
      if (!toast.loading) {
        toast.error('An unexpected error occurred while saving preferences.');
      }
    }
  };

  // Handle retry when authentication fails
  const handleRetryAuthentication = async () => {
    try {
      const loadingToast = toast.loading('Retrying authentication...');
      const success = await authenticateWithBills();

      if (success) {
        toast.success('Authentication successful!', { id: loadingToast });
        // Refetch data after successful authentication
        refetch();
      } else {
        toast.error(`Authentication failed: ${authenticationError || 'Unknown error'}`, { id: loadingToast });
      }
    } catch (error) {
      console.error('❌ Retry authentication error:', error);
      toast.error('Failed to retry authentication. Please check your connection.');
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Remove all non-digits
    const digits = phone.replace(/\D/g, '');
    // Format as (XXX) XXX-XXXX
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  // Format time for display
  const formatTime = (time: string): string => {
    if (!time) return '8:00 AM';
    try {
      const [hours, minutes] = time.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minutes || '00'} ${ampm}`;
    } catch {
      return '8:00 AM';
    }
  };

  // Handle toggle daily call enabled/disabled (used in future implementation)
  // const handleToggleCall = async (enabled: boolean) => {
  //   try {
  //     await toggleCallMutation.mutateAsync(enabled);
  //   } catch (error) {
  //     console.error('Failed to toggle daily call:', error);
  //   }
  // };

  // Handle edit mode toggle
  const handleEditClick = () => {
    const defaultValues = preferences || {
      enabled: false,
      time: '08:00',
      timezone: 'America/Los_Angeles',
      phoneNumber: '',
      voice: 'alloy' as const,
      includeCalendar: true,
      includeEmails: true,
      includeBills: true,
      weekdays: [true, true, true, true, true, false, false],
    };

    editForm.reset(defaultValues);
    setIsEditMode(true);
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setIsEditMode(false);
    editForm.reset();
    clearFormErrors(editForm);
  };

  // Form options
  const timeOptions = [
    { value: '06:00', label: '6:00 AM' },
    { value: '07:00', label: '7:00 AM' },
    { value: '08:00', label: '8:00 AM' },
    { value: '09:00', label: '9:00 AM' },
    { value: '10:00', label: '10:00 AM' },
    { value: '11:00', label: '11:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '13:00', label: '1:00 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '15:00', label: '3:00 PM' },
    { value: '16:00', label: '4:00 PM' },
    { value: '17:00', label: '5:00 PM' },
    { value: '18:00', label: '6:00 PM' },
  ];

  const voiceOptions = [
    { value: 'alloy' as const, label: 'Alloy' },
    { value: 'echo' as const, label: 'Echo' },
    { value: 'fable' as const, label: 'Fable' },
    { value: 'onyx' as const, label: 'Onyx' },
    { value: 'nova' as const, label: 'Nova' },
    { value: 'shimmer' as const, label: 'Shimmer' },
  ];

  if (isLoading) {
    return (
      <div className="glass-card-purple p-6 xl:p-8 2xl:p-10 text-white">
        <div className="animate-pulse">
          <div className="h-6 bg-purple-700/50 rounded mb-4"></div>
          <div className="h-12 bg-purple-700/50 rounded mb-2"></div>
          <div className="h-4 bg-purple-700/50 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card-purple p-6 xl:p-8 2xl:p-10 text-white">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Daily Call 📞</h3>
          <p className="text-red-300 mb-4">Failed to load preferences</p>
          {authenticationError && (
            <p className="text-yellow-300 mb-4 text-sm">
              Authentication required: {authenticationError}
            </p>
          )}
          <div className="flex flex-col space-y-2">
            <button
              type="button"
              onClick={() => refetch()}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <RotateCcw className="h-4 w-4 mr-2 inline" />
              Retry
            </button>
            {authenticationError && (
              <button
                type="button"
                onClick={handleRetryAuthentication}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors text-sm"
              >
                🔐 Authenticate
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card-purple p-6 xl:p-8 2xl:p-10 text-foreground cursor-pointer touch-manipulation">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-foreground">Daily Call 📞</h3>
        </div>
        <div className="flex items-center space-x-2">
          {isEditMode ? (
            <>
              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={updatePreferencesMutation.isPending}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                title="Cancel editing"
              >
                <X className="h-5 w-5" />
              </button>
              <button
                type="submit"
                form="daily-call-form"
                disabled={updatePreferencesMutation.isPending || !editForm.watch('phoneNumber')?.trim()}
                className="p-1 text-muted-foreground hover:text-foreground cursor-pointer disabled:opacity-50"
                title="Save preferences"
              >
                {updatePreferencesMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Save className="h-5 w-5" />
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleEditClick}
                className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                title="Edit settings"
              >
                <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
              </button>
              <Phone className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      {isEditMode ? (
        /* Edit Mode */
        <form id="daily-call-form" onSubmit={editForm.handleSubmit(handleSavePreferences)} className="space-y-6">
          {/* Phone Number Input */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Phone Number
            </label>
            <input
              type="tel"
              {...editForm.register('phoneNumber')}
              placeholder="+1 (555) 123-4567"
              className={`w-full px-3 py-2 bg-background/60 border rounded-lg text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent ${
                hasFieldError(editForm, 'phoneNumber') ? 'border-red-500' : 'border-border'
              }`}
            />
            {getFieldError(editForm, 'phoneNumber') && (
              <p className="text-sm text-red-500">{getFieldError(editForm, 'phoneNumber')}</p>
            )}
          </div>

          {/* Call Time Select */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              <Clock className="inline h-4 w-4 mr-1" />
              Daily Briefing Time
            </label>
            <select
              {...editForm.register('time')}
              title="Select daily briefing time"
              aria-label="Daily briefing time"
              className={`w-full px-3 py-2 bg-background/60 border rounded-lg text-foreground focus:ring-2 focus:ring-ring focus:border-transparent ${
                hasFieldError(editForm, 'time') ? 'border-red-500' : 'border-border'
              }`}
            >
              {timeOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-background text-foreground">
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Voice Selection */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Voice
            </label>
            <select
              {...editForm.register('voice')}
              title="Select voice for calls"
              aria-label="Voice selection"
              className={`w-full px-3 py-2 bg-background/60 border rounded-lg text-foreground focus:ring-2 focus:ring-ring focus:border-transparent ${
                hasFieldError(editForm, 'voice') ? 'border-red-500' : 'border-border'
              }`}
            >
              {voiceOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-background text-foreground">
                  {option.label}
                </option>
              ))}
            </select>
            {getFieldError(editForm, 'voice') && (
              <p className="text-sm text-red-500">{getFieldError(editForm, 'voice')}</p>
            )}
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between p-3 border border-border rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-900 dark:text-foreground">
                Your AI Assistant calls you
              </label>
              <p className="text-xs text-gray-600 dark:text-muted-foreground">
                Automatic daily briefing calls
              </p>
            </div>
            <Switch
              checked={editForm.watch('enabled') ?? false}
              onCheckedChange={(checked) => editForm.setValue('enabled', checked)}
              aria-label="Enable daily calls"
            />
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={updatePreferencesMutation.isPending || !editForm.formState.isValid}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              {updatePreferencesMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
            <button
              type="button"
              onClick={handleCancelEdit}
              title="Cancel editing"
              aria-label="Cancel editing"
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Form Errors */}
          {editForm.formState.errors.root && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{editForm.formState.errors.root.message}</p>
            </div>
          )}
        </form>
      ) : (
        /* Read-Only Mode */
        <>
          {/* Main Time Display */}
          <div className="text-center mb-6">
            <div
              className="text-4xl font-bold mb-2 cursor-pointer hover:text-foreground/80 transition-colors text-foreground"
              onClick={handleTestCall}
            >
              {formatTime(preferences?.time || '08:00')}
            </div>
            <div className="text-gray-600 dark:text-muted-foreground text-sm">
              Tap to test call
            </div>
          </div>

          {/* Phone Number Display */}
          <div className="space-y-3 text-sm">
            <div>
              <span className="text-gray-600 dark:text-muted-foreground">Phone: </span>
              <span className="text-gray-900 dark:text-foreground">
                {preferences?.phoneNumber ? formatPhoneNumber(preferences.phoneNumber) : 'Not set'}
              </span>
            </div>

            <div>
              <span className="text-gray-600 dark:text-muted-foreground">Voice: </span>
              <span className="text-gray-900 dark:text-foreground capitalize">
                {preferences?.voice || 'Alloy'}
              </span>
            </div>

            <div>
              <span className="text-gray-600 dark:text-muted-foreground">Status: </span>
              <span className={`font-medium ${preferences?.enabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {preferences?.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </>
      )}

      {/* Pending sync badge (outside edit mode) */}
      {pendingSyncAt && !isEditMode && (
        <div className="mt-3">
          <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
            <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.5a.75.75 0 00-1.5 0v4.25c0 .414.336.75.75.75h3a.75.75 0 000-1.5h-2.25V6.5z" clipRule="evenodd"/></svg>
            Pending sync • saved locally {new Date(pendingSyncAt).toLocaleTimeString()}
          </span>
        </div>
      )}

    </div>
  );
};

export default DailyCallWidgetV2;
