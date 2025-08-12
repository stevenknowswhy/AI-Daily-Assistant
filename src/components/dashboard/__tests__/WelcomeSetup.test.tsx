import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { WelcomeSetup } from '../WelcomeSetup';

// Mock the OnboardingContext
const mockOnboardingContext = {
  totalSteps: 6,
  data: {
    completedSteps: ['step1', 'step2']
  }
};

vi.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => mockOnboardingContext
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('WelcomeSetup', () => {
  const mockProps = {
    connectionStatus: {
      calendar: false,
      email: false,
      bills: false,
      phone: false
    },
    onAuthenticateCalendar: vi.fn(),
    onAuthenticateGmail: vi.fn(),
    onAuthenticateBills: vi.fn(),
    onBeginSetup: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders welcome setup component when not dismissed', () => {
    render(<WelcomeSetup {...mockProps} />);
    
    expect(screen.getByText('Welcome to Your AI Daily Assistant!')).toBeInTheDocument();
    expect(screen.getByText('Let\'s get you set up for personalized daily briefings')).toBeInTheDocument();
  });

  it('does not render when dismissed', () => {
    localStorageMock.getItem.mockReturnValue('true');
    
    const { container } = render(<WelcomeSetup {...mockProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when setup is complete', () => {
    mockOnboardingContext.data.completedSteps = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];
    
    const { container } = render(<WelcomeSetup {...mockProps} />);
    expect(container.firstChild).toBeNull();
  });

  it('shows correct progress percentage', () => {
    render(<WelcomeSetup {...mockProps} />);
    
    // 2 completed out of 6 total = 33%
    const progressBar = screen.getByText('2/4 connected').closest('div')?.querySelector('.bg-gradient-to-r');
    expect(progressBar).toHaveStyle({ width: '50%' }); // 2 out of 4 setup items
  });

  it('handles dismiss button click', async () => {
    render(<WelcomeSetup {...mockProps} />);
    
    const dismissButton = screen.getByTitle('Dismiss welcome setup');
    fireEvent.click(dismissButton);
    
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('dashboard.welcomeSetup.dismissed', 'true');
    });
  });

  it('shows connected status for connected services', () => {
    const connectedProps = {
      ...mockProps,
      connectionStatus: {
        calendar: true,
        email: true,
        bills: false,
        phone: false
      }
    };
    
    render(<WelcomeSetup {...connectedProps} />);
    
    const connectedBadges = screen.getAllByText('Connected');
    expect(connectedBadges).toHaveLength(2); // Calendar and Email
  });

  it('shows connect buttons for unconnected services', () => {
    render(<WelcomeSetup {...mockProps} />);
    
    const connectButtons = screen.getAllByText('Connect Now');
    expect(connectButtons).toHaveLength(4); // All services unconnected
  });

  it('calls authentication functions when connect buttons are clicked', () => {
    render(<WelcomeSetup {...mockProps} />);
    
    const connectButtons = screen.getAllByText('Connect Now');
    
    fireEvent.click(connectButtons[0]); // Calendar
    expect(mockProps.onAuthenticateCalendar).toHaveBeenCalled();
    
    fireEvent.click(connectButtons[1]); // Email
    expect(mockProps.onAuthenticateGmail).toHaveBeenCalled();
    
    fireEvent.click(connectButtons[2]); // Bills
    expect(mockProps.onAuthenticateBills).toHaveBeenCalled();
    
    fireEvent.click(connectButtons[3]); // Phone
    expect(mockProps.onBeginSetup).toHaveBeenCalled();
  });

  it('shows completion message when all services are connected', () => {
    const allConnectedProps = {
      ...mockProps,
      connectionStatus: {
        calendar: true,
        email: true,
        bills: true,
        phone: true
      }
    };
    
    render(<WelcomeSetup {...allConnectedProps} />);
    
    expect(screen.getByText('🎉 Setup Complete!')).toBeInTheDocument();
    expect(screen.getByText('Your AI Daily Assistant is ready to help you start each day organized and informed.')).toBeInTheDocument();
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    // Should not crash and should default to not dismissed
    render(<WelcomeSetup {...mockProps} />);
    expect(screen.getByText('Welcome to Your AI Daily Assistant!')).toBeInTheDocument();
  });

  it('applies correct glassmorphism styling', () => {
    const { container } = render(<WelcomeSetup {...mockProps} />);
    
    const card = container.querySelector('.glass-card-purple');
    expect(card).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    render(<WelcomeSetup {...mockProps} />);
    
    const dismissButton = screen.getByTitle('Dismiss welcome setup');
    expect(dismissButton).toHaveAttribute('title', 'Dismiss welcome setup');
    
    const connectButtons = screen.getAllByText('Connect Now');
    connectButtons.forEach(button => {
      expect(button).toBeVisible();
    });
  });
});
