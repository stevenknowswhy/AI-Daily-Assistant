import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, User, CreditCard, Settings, Plug, Bot, Calendar, Mail, FileText, Clock, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import toast from 'react-hot-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { useTheme } from '../providers/ModernThemeProvider';
import { useAgentSettings } from '../../contexts/AgentSettingsContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  connectionStatus: {
    calendar: boolean;
    email: boolean;
    bills: boolean;
    phone: boolean;
  };
  onAuthenticateCalendar: () => void;
  onAuthenticateGmail: () => void;
  onAuthenticateBills: () => void;
  onSignOutAllServices: () => void;
  isSigningOut: boolean;
}

type TabType = 'profile' | 'subscription' | 'preferences' | 'integrations' | 'daily-briefing' | 'agent' | 'onboarding';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  connectionStatus,
  onAuthenticateCalendar,
  onAuthenticateGmail,
  onAuthenticateBills,
  onSignOutAllServices,
  isSigningOut
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('profile');
  // const { theme } = useTheme(); // theme is used inside SettingsTab, not here

  if (!isOpen) return null;

  const tabs = [
    { id: 'profile' as TabType, label: 'Profile', icon: User },
    { id: 'subscription' as TabType, label: 'Subscription', icon: CreditCard },
    { id: 'preferences' as TabType, label: 'Preferences', icon: Settings },
    { id: 'integrations' as TabType, label: 'Integrations', icon: Plug },
    { id: 'daily-briefing' as TabType, label: 'Daily Briefing', icon: FileText },
    { id: 'agent' as TabType, label: 'Agent', icon: Bot },
    { id: 'onboarding' as TabType, label: 'Onboarding Setup', icon: RotateCcw },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black bg-opacity-50" data-testid="settings-overlay" />
      <div
        className="relative z-[10000] bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-hidden"
        role="dialog"
        aria-modal="true"
        data-testid="settings-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          </Button>
        </div>

        <div className="flex h-[calc(90vh-80px)]">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    type="button"
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              {activeTab === 'profile' && <ProfileTab />}
              {activeTab === 'subscription' && <SubscriptionTab />}
              {activeTab === 'preferences' && (
                <PreferencesTab
                  connectionStatus={connectionStatus}
                  onSignOutAllServices={onSignOutAllServices}
                  isSigningOut={isSigningOut}
                />
              )}
              {activeTab === 'integrations' && (
                <IntegrationsTab
                  connectionStatus={connectionStatus}
                  onAuthenticateCalendar={onAuthenticateCalendar}
                  onAuthenticateGmail={onAuthenticateGmail}
                  onAuthenticateBills={onAuthenticateBills}
                />
              )}
              {activeTab === 'daily-briefing' && <DailyBriefingTab />}
              {activeTab === 'agent' && <AgentTab />}
              {activeTab === 'onboarding' && <OnboardingSetupTab />}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

// Profile Tab Component
const ProfileTab: React.FC = () => {
  const [profileData, setProfileData] = useState({
    name: 'Stephen',
    email: 'stephenobamastokes@gmail.com',
    phone: '',
    bio: '',
    preferredName: '',
    timezone: 'America/Los_Angeles',
    pronouns: '',
    contactMethod: 'email'
  });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Profile Settings</h3>

      {/* Profile Image Section */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Profile Image</h4>
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
            <User className="h-10 w-10 text-gray-400" />
          </div>
          <div>
            <Button variant="outline" size="sm">
              Upload Image
            </Button>
            <p className="text-xs text-gray-500 mt-1">JPG, PNG up to 5MB</p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Basic Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-full-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Full Name
            </label>
            <input
              id="profile-full-name"
              type="text"
              aria-label="Full Name"
              value={profileData.name}
              onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div>
            <label htmlFor="profile-preferred-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Preferred Name
            </label>
            <input
              id="profile-preferred-name"
              type="text"
              aria-label="Preferred Name"
              value={profileData.preferredName}
              onChange={(e) => setProfileData(prev => ({ ...prev, preferredName: e.target.value }))}
              placeholder="How should we address you?"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Contact Information</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="profile-email"
              type="email"
              aria-label="Email"
              value={profileData.email}
              disabled
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Phone Number
            </label>
            <div className="flex space-x-2">
              <input
                type="tel"
                value={profileData.phone}
                onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="+1 (555) 123-4567"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
              <Button variant="outline" size="sm">
                Verify
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Additional Information</h4>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              value={profileData.bio}
              onChange={(e) => setProfileData(prev => ({ ...prev, bio: e.target.value }))}
              placeholder="Tell us about yourself..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Timezone
              </label>
              <select
                id="profile-timezone"
                aria-label="Timezone"
                value={profileData.timezone}
                onChange={(e) => setProfileData(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/New_York">Eastern Time</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Pronouns
              </label>
              <input
                type="text"
                value={profileData.pronouns}
                onChange={(e) => setProfileData(prev => ({ ...prev, pronouns: e.target.value }))}
                placeholder="they/them, she/her, he/him"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Preferred Contact
              </label>
              <select
                id="profile-preferred-contact"
                aria-label="Preferred Contact Method"
                value={profileData.contactMethod}
                onChange={(e) => setProfileData(prev => ({ ...prev, contactMethod: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push Notifications</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Save Profile
        </Button>


      </div>
    </div>
  );

};

  // Local helper to map percentage to Tailwind width classes, avoiding inline styles
  const getProgressWidthClass = (percent: number) => {
    const clamped = Math.max(0, Math.min(100, Math.round(percent)));
    if (clamped === 0) return 'w-0';
    if (clamped <= 8) return 'w-1/12';
    if (clamped <= 17) return 'w-2/12';
    if (clamped <= 25) return 'w-3/12';
    if (clamped <= 33) return 'w-4/12';
    if (clamped <= 42) return 'w-5/12';
    if (clamped <= 50) return 'w-6/12';
    if (clamped <= 58) return 'w-7/12';
    if (clamped <= 67) return 'w-8/12';
    if (clamped <= 75) return 'w-9/12';
    if (clamped <= 83) return 'w-10/12';
    if (clamped <= 92) return 'w-11/12';
    return 'w-full';
  };
// Subscription Tab Component
const SubscriptionTab: React.FC = () => {
  const [_currentPlan] = useState('free'); // kept for potential future use
  const [credits] = useState({ used: 45, total: 100 });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Subscription & Billing</h3>

      {/* Current Plan */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Current Plan</h4>
        <div className="p-4 bg-blue-50 dark:bg-blue-900 rounded-lg border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-blue-900 dark:text-blue-100">Free Plan</h5>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Basic features with limited usage
              </p>
            </div>
            <Button variant="outline" size="sm">
              Upgrade
            </Button>
          </div>
        </div>
      </div>

      {/* Usage Tracking */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Usage This Month</h4>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-700 dark:text-gray-300">Voice Credits</span>
              <span className="text-gray-700 dark:text-gray-300">{credits.used} / {credits.total}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2" aria-hidden="true">
              <div
                className={`bg-blue-600 h-2 rounded-full ${getProgressWidthClass((credits.used / credits.total) * 100)}`}
                role="progressbar"
                aria-valuenow={credits.used}
                aria-valuemin={0}
                aria-valuemax={credits.total}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              You're on track to run out in 12 days
            </p>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Available Plans</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Lite Plan */}
          <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="text-center">
              <h5 className="font-medium text-gray-900 dark:text-gray-100">Lite Plan</h5>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">$7</span>
                <span className="text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                Perfect for personal use
              </p>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Web dashboard access</li>
              <li>• Daily briefing calls</li>
              <li>• 60 voice credits/month</li>
              <li>• Calendar & email sync</li>
            </ul>
            <Button className="w-full mt-4" variant="outline">
              Choose Lite
            </Button>
          </div>

          {/* Professional Plan */}
          <div className="p-4 border-2 border-blue-500 rounded-lg relative">
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                Popular
              </span>
            </div>
            <div className="text-center">
              <h5 className="font-medium text-gray-900 dark:text-gray-100">Professional</h5>
              <div className="mt-2">
                <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">$12</span>
                <span className="text-gray-500 dark:text-gray-400">/month</span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                For power users
              </p>
            </div>
            <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Everything in Lite</li>
              <li>• Bi-directional calling</li>
              <li>• 300 voice credits/month</li>
              <li>• Voice CRUD operations</li>
            </ul>
            <Button className="w-full mt-4">
              Choose Professional
            </Button>
          </div>
        </div>
      </div>

      {/* Billing History */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Billing History</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          No billing history available for free plan.
        </div>
      </div>
    </div>
  );
};

// Daily Briefing Settings Tab Component
const DailyBriefingTab: React.FC = () => {
  const [settings, setSettings] = useState({
    calendarFetchTime: '07:00',
    emailFetchTime: '07:15',
    billsFetchTime: '07:30',
    briefingGenerationTime: '07:45',
    dailyCallTime: '08:00',
    enableCalendarFetch: true,
    enableEmailFetch: true,
    enableBillsFetch: true,
    fallbackOnFailure: true
  });

  const handleTimeChange = (field: string, value: string) => {
    const newSettings = { ...settings, [field]: value };

    // Validation: Daily briefing completion time must be before daily call time
    if (field === 'briefingGenerationTime' || field === 'dailyCallTime') {
      const briefingTime = field === 'briefingGenerationTime' ? value : settings.briefingGenerationTime;
      const callTime = field === 'dailyCallTime' ? value : settings.dailyCallTime;

      if (briefingTime >= callTime) {
        toast.error('Daily briefing must be completed before the daily call time');
        return;
      }
    }

    setSettings(newSettings);
  };

  const handleSave = () => {
    // Save settings logic here
    toast.success('Daily briefing settings saved');
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">Daily Briefing Settings</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Configure when data is fetched and briefing is generated for your daily call.
        </p>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="calendar-fetch-time" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Calendar Fetch Time</span>
            </Label>
            <Input
              id="calendar-fetch-time"
              type="time"
              value={settings.calendarFetchTime}
              onChange={(e) => handleTimeChange('calendarFetchTime', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-fetch-time" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Email Fetch Time</span>
            </Label>
            <Input
              id="email-fetch-time"
              type="time"
              value={settings.emailFetchTime}
              onChange={(e) => handleTimeChange('emailFetchTime', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bills-fetch-time" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Bills Fetch Time</span>
            </Label>
            <Input
              id="bills-fetch-time"
              type="time"
              value={settings.billsFetchTime}
              onChange={(e) => handleTimeChange('billsFetchTime', e.target.value)}
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="briefing-generation-time" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Briefing Generation Time</span>
            </Label>
            <Input
              id="briefing-generation-time"
              type="time"
              value={settings.briefingGenerationTime}
              onChange={(e) => handleTimeChange('briefingGenerationTime', e.target.value)}
              className="w-full"
            />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-blue-900 dark:text-blue-100">Daily Call Time</span>
          </div>
          <Input
            type="time"
            value={settings.dailyCallTime}
            onChange={(e) => handleTimeChange('dailyCallTime', e.target.value)}
            className="w-full max-w-xs"
          />
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
            All briefing tasks must complete before this time
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-gray-100">Data Sources</h4>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-calendar" className="flex items-center space-x-2">
              <Calendar className="h-4 w-4" />
              <span>Include Calendar Events</span>
            </Label>
            <Switch
              id="enable-calendar"
              checked={settings.enableCalendarFetch}
              onCheckedChange={(checked) => setSettings({ ...settings, enableCalendarFetch: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-email" className="flex items-center space-x-2">
              <Mail className="h-4 w-4" />
              <span>Include Email Messages</span>
            </Label>
            <Switch
              id="enable-email"
              checked={settings.enableEmailFetch}
              onCheckedChange={(checked) => setSettings({ ...settings, enableEmailFetch: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="enable-bills" className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4" />
              <span>Include Bills & Subscriptions</span>
            </Label>
            <Switch
              id="enable-bills"
              checked={settings.enableBillsFetch}
              onCheckedChange={(checked) => setSettings({ ...settings, enableBillsFetch: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="fallback-failure" className="flex items-center space-x-2">
              <Settings className="h-4 w-4" />
              <span>Fallback on Data Fetch Failure</span>
            </Label>
            <Switch
              id="fallback-failure"
              checked={settings.fallbackOnFailure}
              onCheckedChange={(checked) => setSettings({ ...settings, fallbackOnFailure: checked })}
            />
          </div>
        </div>

        <div className="pt-4">
          <Button onClick={handleSave} className="w-full">
            Save Daily Briefing Settings
          </Button>
        </div>
      </div>
    </div>
  );
};

// Preferences Tab Component (renamed from Settings)
interface PreferencesTabProps {
  connectionStatus: {
    calendar: boolean;
    email: boolean;
    bills: boolean;
    phone: boolean;
  };
  onSignOutAllServices: () => void;
  isSigningOut: boolean;
}

const PreferencesTab: React.FC<PreferencesTabProps> = ({
  // connectionStatus,
  onSignOutAllServices,
  isSigningOut
}) => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">General Settings</h3>

      {/* Theme Preferences */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Appearance</h4>
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Theme Preference
          </label>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`px-4 py-2 rounded-md border transition-colors ${
                theme === 'light'
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Light
            </button>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`px-4 py-2 rounded-md border transition-colors ${
                theme === 'dark'
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('fun')}
              className={`px-4 py-2 rounded-md border transition-colors ${
                theme === 'fun'
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              Fun
            </button>
            <button
              type="button"
              onClick={() => setTheme('system')}
              className={`px-4 py-2 rounded-md border transition-colors ${
                theme === 'system'
                  ? 'bg-blue-100 border-blue-300 text-blue-700'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'
              }`}
            >
              System
            </button>
          </div>
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Notifications</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notif-email" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Email Notifications
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive notifications via email
              </p>
            </div>
            <Switch
              id="notif-email"
              defaultChecked={true}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notif-sms" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                SMS Notifications
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive notifications via SMS
              </p>
            </div>
            <Switch
              id="notif-sms"
              defaultChecked={true}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="notif-push" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Push Notifications
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Receive browser push notifications
              </p>
            </div>
            <Switch
              id="notif-push"
              defaultChecked={true}
            />
          </div>
        </div>
      </div>

      {/* Account Management */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Account Management</h4>
        <div className="space-y-3">
          <Button
            onClick={onSignOutAllServices}
            disabled={isSigningOut}
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50 dark:hover:bg-red-900"
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out of All Services'}
          </Button>
        </div>
      </div>
    </div>
  );
};

// Integrations Tab Component
interface IntegrationsTabProps {
  connectionStatus: {
    calendar: boolean;
    email: boolean;
    bills: boolean;
    phone: boolean;
  };
  onAuthenticateCalendar: () => void;
  onAuthenticateGmail: () => void;
  onAuthenticateBills: () => void;
}

const IntegrationsTab: React.FC<IntegrationsTabProps> = ({
  connectionStatus,
  onAuthenticateCalendar,
  onAuthenticateGmail,
  onAuthenticateBills
}) => {
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Integrations</h3>

      {/* Google Services */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Google Services</h4>

        {/* Google Calendar */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h5 className="font-medium text-gray-900 dark:text-gray-100">Google Calendar</h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sync your calendar events and create new appointments
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus.calendar ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connectionStatus.calendar ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {connectionStatus.calendar ? (
              <Button variant="outline" size="sm">
                Disconnect
              </Button>
            ) : (
              <Button onClick={onAuthenticateCalendar} size="sm">
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Gmail */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <Mail className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h5 className="font-medium text-gray-900 dark:text-gray-100">Gmail</h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Read, send, and manage your email messages
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus.email ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connectionStatus.email ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {connectionStatus.email ? (
              <Button variant="outline" size="sm">
                Disconnect
              </Button>
            ) : (
              <Button onClick={onAuthenticateGmail} size="sm">
                Connect
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Financial Services */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Financial Services</h4>

        {/* Bills & Subscriptions */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <h5 className="font-medium text-gray-900 dark:text-gray-100">Bills & Subscriptions</h5>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Track and manage your recurring payments
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${connectionStatus.bills ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {connectionStatus.bills ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            {connectionStatus.bills ? (
              <Button variant="outline" size="sm">
                Disconnect
              </Button>
            ) : (
              <Button onClick={onAuthenticateBills} size="sm">
                Connect
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Manual Email Setup */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Manual Email Setup</h4>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Configure IMAP/SMTP settings for non-Google email providers
          </p>
          <Button variant="outline" size="sm">
            Configure Email
          </Button>
        </div>
      </div>

      {/* Cal.com Integration */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Calendar Booking</h4>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Connect Cal.com for advanced booking and scheduling features
          </p>
          <Button variant="outline" size="sm">
            Connect Cal.com
          </Button>
        </div>
      </div>
    </div>
  );
};

// Agent Tab Component
const AgentTab: React.FC = () => {
  const { settings, updateSettings } = useAgentSettings();
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [isGeneratingSample, setIsGeneratingSample] = useState(false);
  const [chatterboxStatus, setChatterboxStatus] = useState('connected'); // connected, disconnected, error

  const personalities = [
    {
      id: 'professional',
      name: 'Professional',
      description: 'Formal and business-like tone',
      prompt: 'You are a professional AI assistant. Speak in a formal, business-appropriate manner. Be concise, accurate, and maintain a respectful tone. Focus on efficiency and clarity in all communications.'
    },
    {
      id: 'casual',
      name: 'Casual',
      description: 'Friendly and relaxed conversation',
      prompt: 'You are a friendly, casual AI assistant. Speak in a relaxed, conversational tone like talking to a good friend. Use everyday language, be warm and approachable, and don\'t be afraid to show personality.'
    },
    {
      id: 'outgoing',
      name: 'Outgoing',
      description: 'Enthusiastic and energetic',
      prompt: 'You are an enthusiastic, energetic AI assistant. Be upbeat, positive, and excited about helping. Use exclamation points, express genuine interest, and bring high energy to every interaction.'
    },
    {
      id: 'reserved',
      name: 'Reserved',
      description: 'Calm, thoughtful, and composed responses',
      prompt: 'You are a calm, thoughtful AI assistant. Speak in measured tones, take time to consider responses carefully, and maintain a composed demeanor. Be reflective and deliberate in your communication style.'
    },
    {
      id: 'creative',
      name: 'Creative',
      description: 'Imaginative and expressive',
      prompt: 'You are a creative, imaginative AI assistant. Use colorful language, metaphors, and creative expressions. Think outside the box, offer unique perspectives, and bring artistic flair to conversations.'
    },
    {
      id: 'admirer',
      name: 'Admirer',
      description: 'Supportive persona that thinks highly of the user',
      prompt: 'You are an admiring, supportive AI assistant who genuinely thinks highly of the user. Express appreciation for their decisions, acknowledge their capabilities, and offer encouragement. Be genuinely impressed by their accomplishments and potential.'
    },
  ];

  const voiceOptions = [
    { value: 'alloy', label: 'Alloy', description: 'Balanced and clear voice' },
    { value: 'echo', label: 'Echo', description: 'Warm and friendly tone' },
    { value: 'fable', label: 'Fable', description: 'Expressive and engaging' },
    { value: 'onyx', label: 'Onyx', description: 'Deep and authoritative' },
    { value: 'nova', label: 'Nova', description: 'Bright and energetic' },
    { value: 'shimmer', label: 'Shimmer', description: 'Smooth and professional' },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI Agent Settings</h3>

      {/* Voice Provider */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Voice Provider</h4>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
          <div className="flex items-center justify-between">
            <div>
              <h5 className="font-medium text-gray-900 dark:text-gray-100">Chatterbox</h5>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Integrated voice processing system
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${
                chatterboxStatus === 'connected' ? 'bg-green-500' :
                chatterboxStatus === 'error' ? 'bg-red-500' : 'bg-yellow-500'
              }`} />
              <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                {chatterboxStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Personality Settings */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Personality</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {personalities.map((personality) => (
            <button
              key={personality.id}
              type="button"
              onClick={() => updateSettings({ selectedPersonality: personality.id })}
              className={`p-4 rounded-lg border text-left transition-colors ${
                settings.selectedPersonality === personality.id
                  ? 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                  : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }`}
            >
              <div className="font-medium text-sm mb-2">{personality.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                {personality.description}
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 p-2 rounded">
                {personality.prompt}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Instructions */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Custom Behavior Instructions</h4>
        <div className="space-y-2">
          <Textarea
            value={settings.customInstructions}
            onChange={(e) => updateSettings({ customInstructions: e.target.value })}
            placeholder="Add custom instructions for how your AI agent should behave..."
            rows={4}
            className="w-full"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400">
            These instructions will be used to customize your AI agent's responses and behavior.
          </p>
        </div>
      </div>

      {/* Voice Selection */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Voice Selection</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {voiceOptions.map((voice) => (
            <button
              key={voice.value}
              type="button"
              onClick={() => updateSettings({ selectedVoice: voice.value })}
              className={`p-4 rounded-lg border-2 text-left transition-all hover:shadow-md ${
                settings.selectedVoice === voice.value
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h5 className="font-medium text-gray-900 dark:text-gray-100">{voice.label}</h5>
                {settings.selectedVoice === voice.value && (
                  <div className="w-2 h-2 bg-blue-500 rounded-full" />
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">{voice.description}</p>
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Select the voice that will be used for your daily calls and voice interactions.
        </p>
      </div>

      {/* Voice Preview */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Voice Testing</h4>
        <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Test how your AI agent will sound with the current settings
          </p>
          <div className="flex space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsPlayingPreview(true);
                try {
                  // Play current voice settings
                  await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
                  toast.success('Voice preview played');
                } catch (error) {
                  toast.error('Failed to play voice preview');
                } finally {
                  setIsPlayingPreview(false);
                }
              }}
              disabled={isPlayingPreview}
            >
              {isPlayingPreview ? 'Playing...' : 'Play Preview'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                setIsGeneratingSample(true);
                try {
                  const selectedPersonalityData = personalities.find(p => p.id === selectedPersonality);
                  const sampleText = `Hello! I'm your AI assistant with a ${selectedPersonalityData?.name.toLowerCase()} personality. ${selectedPersonalityData?.description} This is how I'll sound during our daily calls.`;

                  // Generate new sample with current personality
                  await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate API call
                  toast.success('New voice sample generated');
                } catch (error) {
                  toast.error('Failed to generate voice sample');
                } finally {
                  setIsGeneratingSample(false);
                }
              }}
              disabled={isGeneratingSample}
            >
              {isGeneratingSample ? 'Generating...' : 'Generate New Sample'}
            </Button>
          </div>
        </div>
      </div>

      {/* Save Settings */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          Save Agent Settings
        </Button>
      </div>
    </div>
  );
};

// Onboarding Setup Tab Component
const OnboardingSetupTab: React.FC = () => {
  const handleResetWelcomeSetup = () => {
    try {
      // Clear the welcome setup dismissal state
      localStorage.removeItem('dashboard.welcomeSetup.dismissed');

      // Show success message
      toast.success('Welcome setup has been reset. You will see the welcome component again on the dashboard.');
    } catch (error) {
      console.error('Failed to reset welcome setup:', error);
      toast.error('Failed to reset welcome setup');
    }
  };

  const handleResetOnboarding = () => {
    try {
      // Clear all onboarding-related localStorage items
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('onboarding') || key.includes('setup') || key.includes('welcome'))) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));

      // Show success message
      toast.success('All onboarding data has been reset. Please refresh the page to restart the onboarding flow.');
    } catch (error) {
      console.error('Failed to reset onboarding:', error);
      toast.error('Failed to reset onboarding data');
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Onboarding Setup</h3>

      {/* Welcome Setup Section */}
      <div className="space-y-4">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Welcome Component</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Reset the welcome setup component to show helpful setup tips and quick actions on the dashboard.
        </p>
        <Button
          onClick={handleResetWelcomeSetup}
          variant="outline"
          className="w-full sm:w-auto"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Show Welcome Setup Again
        </Button>
      </div>

      {/* Full Onboarding Reset Section */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Complete Onboarding Reset</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Reset all onboarding progress and preferences. This will clear all setup data and restart the entire onboarding flow.
        </p>
        <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-600 dark:text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h5 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warning</h5>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                This action will clear all your onboarding progress and preferences. You'll need to go through the setup process again.
              </p>
            </div>
          </div>
        </div>
        <Button
          onClick={handleResetOnboarding}
          variant="destructive"
          className="w-full sm:w-auto"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset All Onboarding Data
        </Button>
      </div>

      {/* Instructions Section */}
      <div className="space-y-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <h4 className="text-md font-medium text-gray-900 dark:text-gray-100">Instructions</h4>
        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
          <p>• <strong>Welcome Setup:</strong> Shows the welcome component with setup tips and quick connection buttons</p>
          <p>• <strong>Complete Reset:</strong> Clears all onboarding data and restarts the entire setup flow</p>
          <p>• After resetting, refresh the page to see the changes take effect</p>
        </div>
      </div>
    </div>
  );
};
