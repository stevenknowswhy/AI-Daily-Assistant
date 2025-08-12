import React from 'react';
import { Sparkles, Calendar, Mail, DollarSign } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';

interface WelcomeBackSectionProps {
  userName?: string;
  connectionStatus: {
    calendar: boolean;
    email: boolean;
    bills: boolean;
    phone: boolean;
  };
}

export const WelcomeBackSection: React.FC<WelcomeBackSectionProps> = ({
  userName = 'Stefano O',
  connectionStatus
}) => {
  const connectedServices = [
    { name: 'Calendar', connected: connectionStatus.calendar, icon: Calendar },
    { name: 'Email', connected: connectionStatus.email, icon: Mail },
    { name: 'Bills', connected: connectionStatus.bills, icon: DollarSign },
  ].filter(service => service.connected);

  return (
    <Card className="bg-gradient-to-br from-indigo-50/80 to-purple-50/80 dark:from-indigo-950/20 dark:to-purple-950/20 backdrop-blur-sm border border-indigo-200/50 dark:border-indigo-800/30 shadow-lg mb-6">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          {/* Icon */}
          <div className="p-2 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>

          {/* Welcome Content */}
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 dark:text-foreground mb-1">
              Your AI Daily Assistant
            </h2>
            <p className="text-sm text-gray-600 dark:text-muted-foreground mb-2">
              Welcome back, {userName}! 👋 Your AI assistant is ready to help you stay organized.
            </p>

            {/* Connected Services */}
            {connectedServices.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">Connected:</span>
                <div className="flex items-center space-x-1">
                  {connectedServices.map((service) => {
                    const IconComponent = service.icon;
                    return (
                      <Badge
                        key={service.name}
                        variant="secondary"
                        className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs flex items-center space-x-1 px-2 py-1"
                      >
                        <IconComponent className="h-2.5 w-2.5" />
                        <span>{service.name}</span>
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
