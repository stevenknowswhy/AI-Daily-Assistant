import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SettingsModal } from '../SettingsModal';

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  key: vi.fn(),
  length: 0
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('SettingsModal - Onboarding Setup Tab', () => {
  const mockProps = {
    isOpen: true,
    onClose: vi.fn(),
    user: {
      id: '1',
      email: 'test@example.com',
      name: 'Test User'
    },
    connectionStatus: {
      calendar: true,
      email: true,
      bills: true
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.length = 3;
    localStorageMock.key.mockImplementation((index) => {
      const keys = ['dashboard.welcomeSetup.dismissed', 'onboarding.step1', 'setup.preferences'];
      return keys[index] || null;
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders onboarding setup tab', async () => {
    render(<SettingsModal {...mockProps} />);
    
    // Click on Onboarding Setup tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      expect(screen.getByText('Welcome Component')).toBeInTheDocument();
      expect(screen.getByText('Complete Onboarding Reset')).toBeInTheDocument();
    });
  });

  it('shows welcome setup reset functionality', async () => {
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      expect(screen.getByText('Show Welcome Setup Again')).toBeInTheDocument();
      expect(screen.getByText('Reset the welcome setup component to show helpful setup tips and quick actions on the dashboard.')).toBeInTheDocument();
    });
  });

  it('handles welcome setup reset', async () => {
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      const resetButton = screen.getByText('Show Welcome Setup Again');
      fireEvent.click(resetButton);
    });
    
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('dashboard.welcomeSetup.dismissed');
    expect(vi.mocked(require('react-hot-toast').default.success)).toHaveBeenCalledWith(
      'Welcome setup has been reset. You will see the welcome component again on the dashboard.'
    );
  });

  it('handles complete onboarding reset', async () => {
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      const resetButton = screen.getByText('Reset All Onboarding Data');
      fireEvent.click(resetButton);
    });
    
    // Should remove all onboarding-related keys
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('dashboard.welcomeSetup.dismissed');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('onboarding.step1');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('setup.preferences');
    
    expect(vi.mocked(require('react-hot-toast').default.success)).toHaveBeenCalledWith(
      'All onboarding data has been reset. Please refresh the page to restart the onboarding flow.'
    );
  });

  it('shows warning message for complete reset', async () => {
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(screen.getByText('This action will clear all your onboarding progress and preferences. You\'ll need to go through the setup process again.')).toBeInTheDocument();
    });
  });

  it('shows instructions section', async () => {
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      expect(screen.getByText('Instructions')).toBeInTheDocument();
      expect(screen.getByText(/Welcome Setup:/)).toBeInTheDocument();
      expect(screen.getByText(/Complete Reset:/)).toBeInTheDocument();
      expect(screen.getByText(/After resetting, refresh the page/)).toBeInTheDocument();
    });
  });

  it('handles localStorage errors gracefully for welcome reset', async () => {
    localStorageMock.removeItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      const resetButton = screen.getByText('Show Welcome Setup Again');
      fireEvent.click(resetButton);
    });
    
    expect(vi.mocked(require('react-hot-toast').default.error)).toHaveBeenCalledWith(
      'Failed to reset welcome setup'
    );
  });

  it('handles localStorage errors gracefully for complete reset', async () => {
    localStorageMock.key.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      const resetButton = screen.getByText('Reset All Onboarding Data');
      fireEvent.click(resetButton);
    });
    
    expect(vi.mocked(require('react-hot-toast').default.error)).toHaveBeenCalledWith(
      'Failed to reset onboarding data'
    );
  });

  it('has proper button styling and accessibility', async () => {
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      const welcomeResetButton = screen.getByText('Show Welcome Setup Again');
      const completeResetButton = screen.getByText('Reset All Onboarding Data');
      
      expect(welcomeResetButton).toBeVisible();
      expect(completeResetButton).toBeVisible();
      
      // Check button variants
      expect(welcomeResetButton.closest('button')).toHaveClass('border'); // outline variant
      expect(completeResetButton.closest('button')).toHaveClass('bg-red-600'); // destructive variant
    });
  });

  it('shows correct icons in buttons', async () => {
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      const buttons = screen.getAllByText(/Reset/);
      buttons.forEach(button => {
        // Each button should have a RotateCcw icon
        const buttonElement = button.closest('button');
        expect(buttonElement?.querySelector('svg')).toBeInTheDocument();
      });
    });
  });

  it('applies responsive design classes', async () => {
    render(<SettingsModal {...mockProps} />);
    
    // Navigate to onboarding tab
    const onboardingTab = screen.getByText('Onboarding Setup');
    fireEvent.click(onboardingTab);
    
    await waitFor(() => {
      const buttons = screen.getAllByText(/Reset/);
      buttons.forEach(button => {
        const buttonElement = button.closest('button');
        expect(buttonElement).toHaveClass('w-full', 'sm:w-auto');
      });
    });
  });
});
