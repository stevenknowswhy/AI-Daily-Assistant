// Format progress percentage
export const formatProgress = (currentStep: number, totalSteps: number): string => {
  const percentage = Math.round((currentStep / totalSteps) * 100);
  return `${percentage}%`;
};

// Format step indicator
export const formatStepIndicator = (currentStep: number, totalSteps: number): string => {
  return `${currentStep + 1} of ${totalSteps}`;
};

// Format time display
export const formatCallTime = (time: string): string => {
  return time.replace(/([AP]M)/, ' $1');
};

// Format completion message
export const formatCompletionMessage = (userName?: string): string => {
  return userName ? `Great job, ${userName}! You're all set.` : "Great job! You're all set.";
};