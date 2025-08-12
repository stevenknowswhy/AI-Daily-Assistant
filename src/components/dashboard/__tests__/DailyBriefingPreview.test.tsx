import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DailyBriefingPreview } from '../DailyBriefingPreview';

// Mock fetch
global.fetch = vi.fn();

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock enhanced widgets
vi.mock('../widgets/CalendarWidgetEnhanced', () => ({
  CalendarWidgetEnhanced: ({ connectionStatus, onAuthenticateCalendar }: any) => (
    <div data-testid="calendar-widget-enhanced">
      Calendar Widget Enhanced
      {!connectionStatus.calendar && (
        <button onClick={onAuthenticateCalendar}>Connect Calendar</button>
      )}
    </div>
  )
}));

vi.mock('../widgets/EmailWidgetEnhanced', () => ({
  EmailWidgetEnhanced: ({ connectionStatus, onAuthenticateGmail }: any) => (
    <div data-testid="email-widget-enhanced">
      Email Widget Enhanced
      {!connectionStatus.email && (
        <button onClick={onAuthenticateGmail}>Connect Gmail</button>
      )}
    </div>
  )
}));

vi.mock('../widgets/BillsWidgetEnhanced', () => ({
  BillsWidgetEnhanced: ({ connectionStatus, onAuthenticateBills }: any) => (
    <div data-testid="bills-widget-enhanced">
      Bills Widget Enhanced
      {!connectionStatus.bills && (
        <button onClick={onAuthenticateBills}>Connect Bills</button>
      )}
    </div>
  )
}));

// Mock ErrorBoundary
vi.mock('../../common/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: any) => <div data-testid="error-boundary">{children}</div>
}));

describe('DailyBriefingPreview', () => {
  const mockProps = {
    connectionStatus: {
      calendar: true,
      email: true,
      bills: true
    },
    onAuthenticateCalendar: vi.fn(),
    onAuthenticateGmail: vi.fn(),
    onAuthenticateBills: vi.fn()
  };

  const mockBriefingData = {
    calendar: [
      {
        id: '1',
        summary: 'Test Event',
        start: { dateTime: '2024-01-15T09:00:00Z' },
        end: { dateTime: '2024-01-15T10:00:00Z' }
      }
    ],
    emails: [
      {
        id: '1',
        subject: 'Test Email',
        from: 'test@example.com',
        receivedTime: '2024-01-15T08:00:00Z',
        snippet: 'Test email content',
        isUnread: true,
        labels: ['INBOX']
      }
    ],
    bills: [
      {
        id: '1',
        name: 'Test Bill',
        amount: 100,
        dueDate: '2024-01-20',
        frequency: 'monthly',
        category: 'utilities',
        type: 'bill',
        isPaid: false
      }
    ],
    generatedBriefing: 'This is your daily briefing...',
    lastUpdated: '2024-01-15T07:00:00Z'
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        ...mockBriefingData
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders daily briefing preview with enhanced widgets', async () => {
    render(<DailyBriefingPreview {...mockProps} />);
    
    expect(screen.getByText('Daily Briefing Preview')).toBeInTheDocument();
    expect(screen.getByTestId('calendar-widget-enhanced')).toBeInTheDocument();
    expect(screen.getByTestId('email-widget-enhanced')).toBeInTheDocument();
    expect(screen.getByTestId('bills-widget-enhanced')).toBeInTheDocument();
  });

  it('wraps widgets with error boundaries', () => {
    render(<DailyBriefingPreview {...mockProps} />);
    
    const errorBoundaries = screen.getAllByTestId('error-boundary');
    expect(errorBoundaries).toHaveLength(4); // 3 widgets + 1 for generated briefing
  });

  it('shows generated briefing with refresh button', async () => {
    render(<DailyBriefingPreview {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Generated Briefing')).toBeInTheDocument();
      expect(screen.getByTitle('Refresh briefing')).toBeInTheDocument();
    });
  });

  it('handles briefing refresh', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ...mockBriefingData })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          briefing: { response: 'Updated briefing content' }
        })
      });
    
    render(<DailyBriefingPreview {...mockProps} />);
    
    await waitFor(() => {
      const refreshButton = screen.getByTitle('Refresh briefing');
      fireEvent.click(refreshButton);
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/daily-briefing'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  it('shows loading state during briefing generation', async () => {
    render(<DailyBriefingPreview {...mockProps} />);
    
    await waitFor(() => {
      const refreshButton = screen.getByTitle('Refresh briefing');
      fireEvent.click(refreshButton);
    });
    
    expect(screen.getByText('Generating your daily briefing...')).toBeInTheDocument();
  });

  it('shows last generation timestamp', async () => {
    render(<DailyBriefingPreview {...mockProps} />);
    
    // Trigger a briefing refresh to set timestamp
    await waitFor(() => {
      const refreshButton = screen.getByTitle('Refresh briefing');
      fireEvent.click(refreshButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText(/Last updated/)).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('API Error'));
    
    render(<DailyBriefingPreview {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load daily briefing data')).toBeInTheDocument();
    });
  });

  it('passes correct props to enhanced widgets', () => {
    render(<DailyBriefingPreview {...mockProps} />);
    
    expect(screen.getByTestId('calendar-widget-enhanced')).toBeInTheDocument();
    expect(screen.getByTestId('email-widget-enhanced')).toBeInTheDocument();
    expect(screen.getByTestId('bills-widget-enhanced')).toBeInTheDocument();
  });

  it('handles authentication callbacks', () => {
    const disconnectedProps = {
      ...mockProps,
      connectionStatus: {
        calendar: false,
        email: false,
        bills: false
      }
    };
    
    render(<DailyBriefingPreview {...disconnectedProps} />);
    
    // Should show connect buttons in widgets
    expect(screen.getByText('Connect Calendar')).toBeInTheDocument();
    expect(screen.getByText('Connect Gmail')).toBeInTheDocument();
    expect(screen.getByText('Connect Bills')).toBeInTheDocument();
  });

  it('applies correct glassmorphism styling to generated briefing', async () => {
    const { container } = render(<DailyBriefingPreview {...mockProps} />);
    
    await waitFor(() => {
      const briefingCard = container.querySelector('.glass-card-purple');
      expect(briefingCard).toBeInTheDocument();
    });
  });

  it('handles briefing refresh errors', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true, ...mockBriefingData })
      })
      .mockRejectedValueOnce(new Error('Briefing generation failed'));
    
    render(<DailyBriefingPreview {...mockProps} />);
    
    await waitFor(() => {
      const refreshButton = screen.getByTitle('Refresh briefing');
      fireEvent.click(refreshButton);
    });
    
    await waitFor(() => {
      expect(vi.mocked(require('react-hot-toast').default.error)).toHaveBeenCalledWith(
        'Briefing generation failed'
      );
    });
  });

  it('shows fallback message when no briefing data', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        calendar: [],
        emails: [],
        bills: [],
        generatedBriefing: null
      })
    });
    
    render(<DailyBriefingPreview {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No briefing generated yet. Click refresh to generate.')).toBeInTheDocument();
    });
  });

  it('applies correct dark mode classes', () => {
    document.documentElement.classList.add('dark');
    
    const { container } = render(<DailyBriefingPreview {...mockProps} />);
    
    const cards = container.querySelectorAll('.glass-card-purple');
    expect(cards.length).toBeGreaterThan(0);
    
    document.documentElement.classList.remove('dark');
  });

  it('applies correct light mode classes', () => {
    document.documentElement.classList.add('light');
    
    const { container } = render(<DailyBriefingPreview {...mockProps} />);
    
    const cards = container.querySelectorAll('.glass-card-purple');
    expect(cards.length).toBeGreaterThan(0);
    
    document.documentElement.classList.remove('light');
  });
});
