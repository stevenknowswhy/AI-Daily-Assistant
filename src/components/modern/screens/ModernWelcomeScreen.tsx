import React from 'react';
import { Sun, Calendar, Mail, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ModernWelcomeScreenProps {
  onNext?: () => void;
}

const ModernWelcomeScreen: React.FC<ModernWelcomeScreenProps> = ({ onNext }) => {
  const features = [
    { icon: Sun, text: "Daily morning calls" },
    { icon: Calendar, text: "Smart calendar management" },
    { icon: Mail, text: "Important email summaries" },
    { icon: DollarSign, text: "Financial reminders" }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-100 via-amber-50 to-yellow-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-6">
          {/* Animated Icon */}
          <div className="relative mx-auto w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-2xl animate-pulse">
            <Sun className="w-12 h-12 text-white" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-500/20 animate-ping"></div>
          </div>

          {/* Title and Subtitle */}
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Your Daily AI Assistant
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
              Start your day right with personalized assistance that learns your routine
            </p>
          </div>
        </div>

        {/* Features Card */}
        <Card className="backdrop-blur-sm bg-white/80 dark:bg-slate-800/80 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-center text-xl font-semibold">
              What you'll get
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <feature.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {feature.text}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="text-center">
          <Button 
            onClick={onNext}
            size="lg"
            className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            Let's Get Started
          </Button>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-primary"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
          <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600"></div>
        </div>
      </div>
    </div>
  );
};

export default ModernWelcomeScreen;
