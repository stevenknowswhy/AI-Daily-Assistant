import React, { useState, useEffect } from 'react';
import { X, CheckCircle, Calendar, Mail, DollarSign, Phone, ArrowRight, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useOnboarding } from '@/contexts/OnboardingContext';

interface WelcomeSetupProps {
  connectionStatus: {
    calendar: boolean;
    email: boolean;
    bills: boolean;
    phone: boolean;
  };
  onAuthenticateCalendar: () => void;
  onAuthenticateGmail: () => void;
  onAuthenticateBills: () => void;
  onBeginSetup?: () => void;
}

const WELCOME_SETUP_STORAGE_KEY = 'dashboard.welcomeSetup.dismissed';

export const WelcomeSetup: React.FC<WelcomeSetupProps> = ({
  connectionStatus,
  onAuthenticateCalendar,
  onAuthenticateGmail,
  onAuthenticateBills,
  onBeginSetup
}) => {
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_SETUP_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const { totalSteps, data } = useOnboarding();
  const completedCount = data.completedSteps.length;
  const progressPct = Math.min(100, Math.round((completedCount / totalSteps) * 100));

  // Don't show if dismissed or setup is complete
  if (isDismissed || progressPct >= 100) {
    return null;
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(WELCOME_SETUP_STORAGE_KEY, 'true');
      setIsDismissed(true);
    } catch (error) {
      console.error('Failed to save dismissal state:', error);
    }
  };

  const setupItems = [
    {
      icon: Calendar,
      title: 'Connect Calendar',
      description: 'Sync your Google Calendar for daily event summaries',
      isConnected: connectionStatus.calendar,
      action: onAuthenticateCalendar,
      color: 'blue'
    },
    {
      icon: Mail,
      title: 'Connect Email',
      description: 'Get important email summaries in your daily briefing',
      isConnected: connectionStatus.email,
      action: onAuthenticateGmail,
      color: 'red'
    },
    {
      icon: DollarSign,
      title: 'Add Bills & Subscriptions',
      description: 'Track due dates and never miss a payment',
      isConnected: connectionStatus.bills,
      action: onAuthenticateBills,
      color: 'yellow'
    },
    {
      icon: Phone,
      title: 'Setup Daily Calls',
      description: 'Configure your personalized morning briefing calls',
      isConnected: connectionStatus.phone,
      action: onBeginSetup,
      color: 'green'
    }
  ];

  const connectedCount = setupItems.filter(item => item.isConnected).length;

  return (
    <Card className="glass-card-purple mb-6 relative overflow-hidden">
      {/* Dismiss button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDismiss}
        className="absolute top-4 right-4 z-10 h-8 w-8 hover:bg-white/20 dark:hover:bg-black/20"
        title="Dismiss welcome setup"
      >
        <X className="h-4 w-4 text-gray-600 dark:text-gray-300" />
      </Button>

      <CardHeader className="pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold text-gray-900 dark:text-foreground">
              Welcome to Your AI Daily Assistant!
            </CardTitle>
            <p className="text-sm text-gray-600 dark:text-muted-foreground mt-1">
              Let's get you set up for personalized daily briefings
            </p>
          </div>
        </div>
        
        {/* Progress indicator */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-muted-foreground mb-2">
            <span>Setup Progress</span>
            <span>{connectedCount}/{setupItems.length} connected</span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
              style={{ width: `${(connectedCount / setupItems.length) * 100}%` }}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {setupItems.map((item, index) => {
            const IconComponent = item.icon;
            const colorClasses = {
              blue: 'from-blue-500 to-blue-600 text-blue-600',
              red: 'from-red-500 to-red-600 text-red-600',
              yellow: 'from-yellow-500 to-yellow-600 text-yellow-600',
              green: 'from-green-500 to-green-600 text-green-600'
            };

            return (
              <div
                key={index}
                className={`p-4 rounded-lg border transition-all duration-200 ${
                  item.isConnected
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : 'bg-white/50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-gray-800/70'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    item.isConnected 
                      ? 'bg-green-100 dark:bg-green-900' 
                      : `bg-gradient-to-br ${colorClasses[item.color as keyof typeof colorClasses].split(' ')[0]} ${colorClasses[item.color as keyof typeof colorClasses].split(' ')[1]}`
                  }`}>
                    {item.isConnected ? (
                      <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                    ) : (
                      <IconComponent className={`h-5 w-5 text-white`} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold text-gray-900 dark:text-foreground">
                        {item.title}
                      </h3>
                      {item.isConnected && (
                        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-muted-foreground mt-1">
                      {item.description}
                    </p>
                    {!item.isConnected && item.action && (
                      <Button
                        onClick={item.action}
                        size="sm"
                        className="mt-3 h-8 text-xs"
                        variant="outline"
                      >
                        Connect Now
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Call to action */}
        {connectedCount === setupItems.length && (
          <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">
                  🎉 Setup Complete!
                </h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your AI Daily Assistant is ready to help you start each day organized and informed.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
