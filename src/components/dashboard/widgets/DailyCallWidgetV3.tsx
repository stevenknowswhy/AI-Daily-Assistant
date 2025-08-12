import React, { useState, useEffect } from 'react';
import { Phone, Save, Edit2, Loader2, AlertCircle, Clock, Settings, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Switch } from '../../ui/switch';

// Enhanced validation schema for all Daily Call preferences
const dailyCallPreferencesSchema = z.object({
  phoneNumber: z
    .string()
    .min(1, 'Phone number is required')
    .regex(
      /^\+?[1-9]\d{1,14}$/,
      'Please enter a valid phone number (e.g., +1 555-123-4567)'
    ),
  enabled: z.boolean().default(true),
  time: z.string().default('08:00'),
  timezone: z.string().default('America/Los_Angeles'),
  voice: z.enum(['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']).default('alloy'),
  includeCalendar: z.boolean().default(true),
  includeEmails: z.boolean().default(true),
  includeBills: z.boolean().default(true),
  weekdays: z.array(z.boolean()).length(7).default([true, true, true, true, true, false, false]),
});

type DailyCallPreferencesForm = z.infer<typeof dailyCallPreferencesSchema>;

interface DailyCallWidgetV3Props {
  userId: string;
}

interface DailyCallPreferencesData {
  id?: string;
  user_id: string;
  enabled: boolean;
  call_time: string;
  timezone: string;
  phone_number: string;
  voice: string;
  include_calendar: boolean;
  include_email: boolean;
  include_bills: boolean;
  weekdays?: boolean[];
  created_at?: string;
  updated_at?: string;
  is_active?: boolean;
  no_answer_action?: string;
  retry_count?: number;
}

export const DailyCallWidgetV3: React.FC<DailyCallWidgetV3Props> = ({ userId }) => {
  // Component state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [savedPreferences, setSavedPreferences] = useState<DailyCallPreferencesData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTestingCall, setIsTestingCall] = useState(false);
  const [callDaysMode, setCallDaysMode] = useState<'daily' | 'weekdays' | 'custom'>('weekdays');

  // Form setup with all preferences
  const form = useForm<DailyCallPreferencesForm>({
    resolver: zodResolver(dailyCallPreferencesSchema),
    defaultValues: {
      phoneNumber: '',
      enabled: true,
      time: '08:00',
      timezone: 'America/Los_Angeles',
      includeCalendar: true,
      includeEmails: true,
      includeBills: true,
      weekdays: [true, true, true, true, true, false, false],
    },
  });

  // Authentication helper
  const authenticateWithBills = async (): Promise<boolean> => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/test/bills/authenticate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: 'dashboard-user' }),
        }
      );

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Authentication error:', error);
      return false;
    }
  };

  // Load existing phone number on mount
  useEffect(() => {
    const loadPhoneNumber = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Authenticate first
        const isAuthenticated = await authenticateWithBills();
        if (!isAuthenticated) {
          throw new Error('Authentication failed');
        }

        // Fetch existing phone number
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/api/daily-call-preferences/${userId}`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (response.ok) {
          const data = await response.json();
          // API returns snake_case fields from database
          if (data.success && data.preferences) {
            const prefs = data.preferences;
            setSavedPreferences(prefs);

            // Map database fields to form fields
            form.setValue('phoneNumber', prefs.phone_number || '');
            form.setValue('enabled', prefs.enabled ?? true);
            form.setValue('time', prefs.call_time || '08:00');
            form.setValue('timezone', prefs.timezone || 'America/Los_Angeles');
            form.setValue('voice', prefs.voice || 'alloy');
            form.setValue('includeCalendar', prefs.include_calendar ?? true);
            form.setValue('includeEmails', prefs.include_email ?? true);
            form.setValue('includeBills', prefs.include_bills ?? true);

            // Handle weekdays array (default to weekdays only if not set)
            if (prefs.weekdays && Array.isArray(prefs.weekdays)) {
              form.setValue('weekdays', prefs.weekdays);
            }
          }
        } else if (response.status !== 404) {
          // 404 is expected if no preferences exist yet
          throw new Error(`Failed to load phone number: ${response.status}`);
        }
      } catch (error) {
        console.error('Failed to load phone number:', error);
        setError(error instanceof Error ? error.message : 'Failed to load phone number');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      loadPhoneNumber();
    }
  }, [userId]); // Only depend on userId, not form object

  // Handle form submission
  const handleSave = async (data: DailyCallPreferencesForm) => {
    try {
      setIsSaving(true);
      setError(null);

      // Authenticate before saving
      const isAuthenticated = await authenticateWithBills();
      if (!isAuthenticated) {
        throw new Error('Authentication failed. Please try again.');
      }

      // Save all preferences
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/api/daily-call-preferences/${userId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone_number: data.phoneNumber,
            enabled: data.enabled,
            call_time: data.time + ':00', // Add seconds for database format
            timezone: data.timezone,
            voice: data.voice,
            include_calendar: data.includeCalendar,
            include_email: data.includeEmails,
            include_bills: data.includeBills,
            weekdays: data.weekdays,
            no_answer_action: 'text_briefing',
            retry_count: 1,
            is_active: data.enabled,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save preferences: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save preferences');
      }

      // Success - update saved preferences
      setSavedPreferences({
        ...savedPreferences,
        phone_number: data.phoneNumber,
        enabled: data.enabled,
        call_time: data.time + ':00',
        timezone: data.timezone,
        voice: data.voice,
        include_calendar: data.includeCalendar,
        include_email: data.includeEmails,
        include_bills: data.includeBills,
        weekdays: data.weekdays,
        is_active: data.enabled,
      } as DailyCallPreferencesData);

      setIsEditing(false);
      toast.success('Daily call preferences saved successfully!');
    } catch (error) {
      console.error('Save error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save preferences';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle test call
  const handleTestCall = async () => {
    if (!savedPreferences?.phone_number) {
      toast.error('Please save your phone number first');
      return;
    }

    try {
      setIsTestingCall(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3005'}/api/test-call`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phoneNumber: savedPreferences.phone_number,
            message: 'This is a test call from your AI Daily Assistant.',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Test call failed: ${response.status}`);
      }

      const result = await response.json();
      if (result.success) {
        toast.success('Test call initiated! You should receive a call shortly.');
      } else {
        throw new Error(result.error || 'Test call failed');
      }
    } catch (error) {
      console.error('Test call error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate test call';
      toast.error(errorMessage);
    } finally {
      setIsTestingCall(false);
    }
  };

  // Handle edit mode
  const handleEdit = () => {
    setIsEditing(true);
    setError(null);

    // Populate form with current preferences
    if (savedPreferences) {
      const weekdays = savedPreferences.weekdays || [true, true, true, true, true, false, false];
      form.setValue('phoneNumber', savedPreferences.phone_number || '');
      form.setValue('enabled', savedPreferences.enabled ?? true);
      form.setValue('time', savedPreferences.call_time?.substring(0, 5) || '08:00');
      form.setValue('timezone', savedPreferences.timezone || 'America/Los_Angeles');
      form.setValue('voice', savedPreferences.voice || 'alloy');
      form.setValue('includeCalendar', savedPreferences.include_calendar ?? true);
      form.setValue('includeEmails', savedPreferences.include_email ?? true);
      form.setValue('includeBills', savedPreferences.include_bills ?? true);
      form.setValue('weekdays', weekdays);

      // Set the call days mode based on current weekdays
      setCallDaysMode(getCallDaysMode(weekdays));
    }
  };

  // Handle cancel edit
  const handleCancel = () => {
    setIsEditing(false);
    setError(null);
    form.reset();

    // Reset form to saved values
    if (savedPreferences) {
      const weekdays = savedPreferences.weekdays || [true, true, true, true, true, false, false];
      form.setValue('phoneNumber', savedPreferences.phone_number || '');
      form.setValue('enabled', savedPreferences.enabled ?? true);
      form.setValue('time', savedPreferences.call_time?.substring(0, 5) || '08:00');
      form.setValue('timezone', savedPreferences.timezone || 'America/Los_Angeles');
      form.setValue('voice', savedPreferences.voice || 'alloy');
      form.setValue('includeCalendar', savedPreferences.include_calendar ?? true);
      form.setValue('includeEmails', savedPreferences.include_email ?? true);
      form.setValue('includeBills', savedPreferences.include_bills ?? true);
      form.setValue('weekdays', weekdays);

      // Reset the call days mode
      setCallDaysMode(getCallDaysMode(weekdays));
    }
  };

  // Format phone number for display
  const formatPhoneNumber = (phone: string): string => {
    if (!phone) return '';
    // Simple formatting for US numbers
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  };

  // Format time for display
  const formatTime = (time: string): string => {
    if (!time) return '8:00 AM';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Options for dropdowns
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

  const timezoneOptions = [
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
  ];



  const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Helper functions for call days mode
  const getCallDaysMode = (weekdays: boolean[]): 'daily' | 'weekdays' | 'custom' => {
    const allDays = [true, true, true, true, true, true, true];
    const weekdaysOnly = [true, true, true, true, true, false, false];

    if (JSON.stringify(weekdays) === JSON.stringify(allDays)) {
      return 'daily';
    } else if (JSON.stringify(weekdays) === JSON.stringify(weekdaysOnly)) {
      return 'weekdays';
    } else {
      return 'custom';
    }
  };

  const setWeekdaysFromMode = (mode: 'daily' | 'weekdays' | 'custom') => {
    switch (mode) {
      case 'daily':
        form.setValue('weekdays', [true, true, true, true, true, true, true]);
        break;
      case 'weekdays':
        form.setValue('weekdays', [true, true, true, true, true, false, false]);
        break;
      case 'custom':
        // Keep current weekdays array as is
        break;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/30 rounded-xl p-6 shadow-lg">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
          <span className="text-sm text-gray-600 dark:text-gray-300">Loading phone number...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/20 dark:to-indigo-950/20 backdrop-blur-sm border border-blue-200/50 dark:border-blue-800/30 rounded-xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Phone className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Daily Call
          </h3>
        </div>
        <div className="flex items-center space-x-2">
          {savedPreferences && !isEditing && (
            <>
              <button
                type="button"
                onClick={handleTestCall}
                disabled={isTestingCall}
                className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white cursor-pointer disabled:opacity-50"
                title="Test call"
              >
                {isTestingCall ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Phone className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={handleEdit}
                className="p-1 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white cursor-pointer"
                title="Edit preferences"
              >
                <Edit2 className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/30 rounded-lg flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
        </div>
      )}

      {/* Content */}
      {!savedPreferences || isEditing ? (
        <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
          {/* Phone Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              {...form.register('phoneNumber')}
              placeholder="+1 (555) 123-4567"
              className="w-full px-3 py-2 bg-white/60 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isSaving}
            />
            {form.formState.errors.phoneNumber && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {form.formState.errors.phoneNumber.message}
              </p>
            )}
          </div>

          {/* Enable/Disable */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Enable Daily Calls
            </label>
            <Switch
              checked={form.watch('enabled')}
              onCheckedChange={(checked) => form.setValue('enabled', checked)}
              disabled={isSaving}
            />
          </div>

          {/* Call Time and Timezone */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Call Time
              </label>
              <select
                {...form.register('time')}
                className="w-full px-3 py-2 bg-white/60 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving}
              >
                {timeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Timezone
              </label>
              <select
                {...form.register('timezone')}
                className="w-full px-3 py-2 bg-white/60 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving}
              >
                {timezoneOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>



          {/* Call Days */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Call Days
            </label>

            {/* Call Days Mode Dropdown */}
            <div className="mb-3">
              <select
                value={callDaysMode}
                onChange={(e) => {
                  const mode = e.target.value as 'daily' | 'weekdays' | 'custom';
                  setCallDaysMode(mode);
                  setWeekdaysFromMode(mode);
                }}
                className="w-full px-3 py-2 bg-white/60 dark:bg-gray-800/60 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSaving}
                aria-label="Select call days mode"
              >
                <option value="daily">Daily (All 7 days)</option>
                <option value="weekdays">Weekdays (Monday-Friday)</option>
                <option value="custom">Custom Selection</option>
              </select>
            </div>

            {/* Individual Day Buttons (only show for custom mode) */}
            {callDaysMode === 'custom' && (
              <div className="flex space-x-2">
                {weekdayLabels.map((day, index) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      const currentWeekdays = form.getValues('weekdays');
                      const newWeekdays = [...currentWeekdays];
                      newWeekdays[index] = !newWeekdays[index];
                      form.setValue('weekdays', newWeekdays);
                    }}
                    className={
                      form.watch('weekdays')[index]
                        ? 'px-3 py-2 text-xs font-medium rounded-lg transition-colors bg-blue-600 text-white'
                        : 'px-3 py-2 text-xs font-medium rounded-lg transition-colors bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }
                    disabled={isSaving}
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Content Preferences */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Content to Include
            </label>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Calendar Events</span>
                <Switch
                  checked={form.watch('includeCalendar')}
                  onCheckedChange={(checked) => form.setValue('includeCalendar', checked)}
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Email Summary</span>
                <Switch
                  checked={form.watch('includeEmails')}
                  onCheckedChange={(checked) => form.setValue('includeEmails', checked)}
                  disabled={isSaving}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Bills & Subscriptions</span>
                <Switch
                  checked={form.watch('includeBills')}
                  onCheckedChange={(checked) => form.setValue('includeBills', checked)}
                  disabled={isSaving}
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{savedPreferences ? 'Update' : 'Save'} Preferences</span>
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                title="Cancel editing"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="text-center space-y-6">
          {/* Large Call Time Display */}
          <div>
            <div className="text-6xl font-bold text-black dark:text-white fun:text-purple-700 mb-2">
              {formatTime(savedPreferences?.call_time?.substring(0, 5) || '08:00')}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-black dark:text-white fun:text-purple-700 hover:bg-white/20 dark:hover:bg-gray-800/50"
              onClick={handleTestCall}
              disabled={isTestingCall}
            >
              {isTestingCall ? 'Calling...' : 'Tap to call now'}
            </Button>
          </div>

          {/* Key Information */}
          <div className="space-y-3 text-left">
            <div className="text-black dark:text-white fun:text-purple-700">
              <span className="font-medium">Phone:</span> {savedPreferences?.phone_number ? formatPhoneNumber(savedPreferences.phone_number) : 'Not set'}
            </div>
            <div className="text-black dark:text-white fun:text-purple-700">
              <span className="font-medium">If no answer:</span> Send text briefing
            </div>
            <div className="text-black dark:text-white fun:text-purple-700">
              <span className="font-medium">Status:</span>
              <span className={`ml-1 ${
                savedPreferences?.enabled
                  ? 'text-green-500'
                  : 'text-red-500'
              }`}>
                {savedPreferences?.enabled ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
