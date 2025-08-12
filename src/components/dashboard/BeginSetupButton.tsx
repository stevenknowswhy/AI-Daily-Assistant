import React from 'react';
import { Button } from '../ui/button';
import { Settings, ArrowRight } from 'lucide-react';
import { useOnboarding } from '../../contexts/OnboardingContext';

interface BeginSetupButtonProps {
  onBeginSetup: () => void;
  className?: string;
}

export const BeginSetupButton: React.FC<BeginSetupButtonProps> = ({
  onBeginSetup,
  className = ''
}) => {
  const { totalSteps, data } = useOnboarding();
  
  const completedCount = data.completedSteps.length;
  const progressPct = Math.min(100, Math.round((completedCount / totalSteps) * 100));
  
  // Don't show the button if setup is complete
  if (progressPct >= 100) {
    return null;
  }

  return (
    <Button
      onClick={onBeginSetup}
      className={`
        group relative overflow-hidden
        bg-gradient-to-r from-blue-500 to-indigo-600 
        hover:from-blue-600 hover:to-indigo-700
        text-white font-semibold
        border-0 shadow-lg hover:shadow-xl
        transition-all duration-300 ease-out
        transform hover:scale-105
        ${className}
      `}
      size="sm"
    >
      {/* Background animation */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      
      {/* Content */}
      <div className="relative flex items-center space-x-2">
        <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
        <span>Begin Setup</span>
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
      </div>
      
      {/* Progress indicator */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/30 w-full">
        <div 
          className="h-full bg-white/60 transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </Button>
  );
};
