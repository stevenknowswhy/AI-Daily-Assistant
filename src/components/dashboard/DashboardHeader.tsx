import React from 'react';
import { LogOut, User, Bot } from 'lucide-react';
import { Button } from '../ui/button';
import { SettingsDropdown } from './SettingsDropdown';
import { ThemeToggle } from '../ui/theme-toggle';
import { DashboardHeaderProps } from '../../types/dashboard';


export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  connectionStatus,
  isSigningOut,
  onAuthenticateCalendar,
  onAuthenticateGmail,
  onAuthenticateBills,
  onSignOutAllServices,
  onLogout,
  onBeginSetup
}) => {

  const handleLogout = async () => {
    try {
      await onLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const logoUrl = 'https://xdjt53kfvx.ufs.sh/f/cAVKl903gHqFtRDQHNFOMj6O1YcF8oyxqaGrXpUQz72ufBHS';

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="mb-6 md:mb-8">
      {/* Tier 1: Thin top bar */}
      <div className="flex items-center justify-between h-11 px-3 sm:px-4 rounded-xl border border-gray-200/60 dark:border-gray-800/80 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
        {/* Left: Logo (clickable) */}
        <a href="/" className="flex items-center space-x-2">
          <img src={logoUrl} alt="AI Daily Assistant" className="h-6 w-6 rounded" />
          <span className="hidden sm:inline text-sm font-semibold text-gray-800 dark:text-gray-200">AI Daily Assistant</span>
        </a>

        {/* Center: Date */}
        <div className="hidden md:flex items-baseline space-x-2 text-sm">
          <span className="text-blue-600 dark:text-blue-400 font-semibold">Today:</span>
          <span className="text-gray-800 dark:text-gray-200">{todayLabel}</span>
        </div>

        {/* Right: Theme, Settings, Logout */}
        <div className="flex items-center space-x-2">
          <ThemeToggle />
          <SettingsDropdown
            connectionStatus={connectionStatus}
            onAuthenticateCalendar={onAuthenticateCalendar}
            onAuthenticateGmail={onAuthenticateGmail}
            onAuthenticateBills={onAuthenticateBills}
            onSignOutAllServices={onSignOutAllServices}
            isSigningOut={isSigningOut}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="hidden lg:flex items-center space-x-2 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleLogout}
            className="lg:hidden text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Tier 2: Hero header */}
      <div className="mt-4 p-5 sm:p-6 xl:p-8 2xl:p-10 rounded-2xl border border-gray-200/60 dark:border-gray-800/80 bg-gradient-to-br from-white/70 via-blue-50/60 to-indigo-50/60 dark:from-slate-900/70 dark:via-slate-800/60 dark:to-slate-800/40 backdrop-blur-xl glass-card">
        <div className="flex items-start justify-between gap-4">
          {/* Greeting */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Bot className="h-5 w-5 text-blue-500" />
              <span className="text-xs uppercase tracking-wide text-blue-600 dark:text-blue-400">Your AI Daily Assistant</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-gray-100">
              Welcome back, {user?.firstName || user?.name || 'User'}! <span className="align-middle">👋</span>
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-300 text-base sm:text-lg">
              Your AI assistant is ready to help you stay organized.
            </p>
          </div>

          {/* Avatar and progress */}
          <div className="flex flex-col items-end gap-3 flex-shrink-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-white/40 dark:border-white/10 shadow">
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                  <User className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
