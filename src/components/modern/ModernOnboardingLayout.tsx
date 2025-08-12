import React from 'react';
import { Progress } from '../ui/progress';
import { Button } from '../ui/button';
import { ArrowLeft, ArrowRight, X } from 'lucide-react';

interface ModernOnboardingLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  totalSteps: number;
  onNext?: () => void;
  onBack?: () => void;
  onSkip?: () => void;
  nextLabel?: string;
  backLabel?: string;
  showBack?: boolean;
  showNext?: boolean;
  showSkip?: boolean;
  showProgress?: boolean;
  isNextDisabled?: boolean;
}

const ModernOnboardingLayout: React.FC<ModernOnboardingLayoutProps> = ({
  children,
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSkip,
  nextLabel = "Next",
  backLabel = "Back",
  showBack = true,
  showNext = true,
  showSkip = true,
  showProgress = true,
  isNextDisabled = false
}) => {
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-700">
      {/* Header with Progress */}
      {showProgress && (
        <div className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Step {currentStep + 1} of {totalSteps}
              </div>
              {showSkip && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSkip}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  title="Skip onboarding"
                  aria-label="Skip onboarding"
                >
                  <X className="w-4 h-4 mr-1" />
                  Skip
                </Button>
              )}
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl">
            {children}
          </div>
        </div>

        {/* Navigation Footer */}
        {(showBack || showNext) && (
          <div className="sticky bottom-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700">
            <div className="max-w-2xl mx-auto px-4 py-4">
              <div className="flex justify-between items-center">
                {showBack ? (
                  <Button
                    variant="outline"
                    onClick={onBack}
                    disabled={currentStep === 0}
                    className="flex items-center space-x-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>{backLabel}</span>
                  </Button>
                ) : (
                  <div></div>
                )}

                {showNext && (
                  <Button
                    onClick={onNext}
                    disabled={isNextDisabled}
                    className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                  >
                    <span>{nextLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ModernOnboardingLayout;
