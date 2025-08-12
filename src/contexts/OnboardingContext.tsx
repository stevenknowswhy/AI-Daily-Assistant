import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface OnboardingData {
  // Personal preferences
  preferredCallTime: string;
  phoneNumber?: string;
  timezone: string;
  notificationPreferences: {
    email: boolean;
    push: boolean;
    sms: boolean;
  };
  
  // Calendar integration
  calendarConnected: boolean;
  calendarProvider: 'google' | 'outlook' | null;
  calendarPermissions: string[];
  
  // Email integration
  emailConnected: boolean;
  emailProvider: 'gmail' | 'outlook' | null;
  emailPermissions: string[];
  importantContacts: string[];
  
  // Financial reminders
  financialRemindersEnabled: boolean;
  billReminders: Array<{
    name: string;
    amount: number;
    dueDate: string;
    frequency: 'monthly' | 'quarterly' | 'yearly';
  }>;
  
  // Voice preferences
  voicePreferences: {
    speed: number;
    pitch: number;
    language: string;
  };
  
  // Completion tracking
  completedSteps: string[];
  completedAt?: Date;
}

export interface OnboardingContextType {
  data: OnboardingData;
  currentStep: number;
  totalSteps: number;
  isComplete: boolean;
  updateData: (updates: Partial<OnboardingData>) => void;
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  completeOnboarding: () => void;
  skipStep: (stepId: string) => void;
  markStepComplete: (stepId: string) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

interface OnboardingProviderProps {
  children: ReactNode;
}

const initialData: OnboardingData = {
  preferredCallTime: '8:00 AM',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  notificationPreferences: {
    email: true,
    push: true,
    sms: false,
  },
  calendarConnected: false,
  calendarProvider: null,
  calendarPermissions: [],
  emailConnected: false,
  emailProvider: null,
  emailPermissions: [],
  importantContacts: [],
  financialRemindersEnabled: false,
  billReminders: [],
  voicePreferences: {
    speed: 1.0,
    pitch: 1.0,
    language: 'en-US',
  },
  completedSteps: [],
};

export const OnboardingProvider: React.FC<OnboardingProviderProps> = ({ children }) => {
  const [data, setData] = useState<OnboardingData>(initialData);
  const [currentStep, setCurrentStep] = useState(0);
  const totalSteps = 6; // Welcome, Call Setup, Calendar, Email, Financial, Complete

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < totalSteps) {
      setCurrentStep(step);
    }
  };

  const markStepComplete = (stepId: string) => {
    setData(prev => ({
      ...prev,
      completedSteps: [...prev.completedSteps.filter(id => id !== stepId), stepId]
    }));
  };

  const skipStep = (stepId: string) => {
    markStepComplete(stepId);
    nextStep();
  };

  const completeOnboarding = () => {
    setData(prev => ({
      ...prev,
      completedAt: new Date(),
      completedSteps: [...prev.completedSteps, 'onboarding-complete']
    }));
  };

  const isComplete = data.completedSteps.includes('onboarding-complete');

  const value: OnboardingContextType = {
    data,
    currentStep,
    totalSteps,
    isComplete,
    updateData,
    nextStep,
    previousStep,
    goToStep,
    completeOnboarding,
    skipStep,
    markStepComplete,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};
