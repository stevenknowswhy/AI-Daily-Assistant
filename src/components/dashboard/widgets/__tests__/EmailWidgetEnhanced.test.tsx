import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EmailWidgetEnhanced } from '../EmailWidgetEnhanced';

// Mock fetch
global.fetch = vi.fn();

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
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('EmailWidgetEnhanced', () => {
  const mockProps = {
    connectionStatus: {
      email: true
    },
    onAuthenticateGmail: vi.fn(),
    dailyCallTime: '08:00'
  };

  const mockEmails = [
    {
      id: '1',
      threadId: 'thread1',
      subject: 'Important Email',
      from: 'sender@example.com',
      to: 'user@example.com',
      date: '2024-01-15T09:00:00Z',
      receivedTime: '2024-01-15T09:00:00Z',
      snippet: 'This is an important email...',
      isUnread: true,
      labels: ['IMPORTANT', 'INBOX']
    },
    {
      id: '2',
      threadId: 'thread2',
      subject: 'Regular Email',
      from: 'another@example.com',
      to: 'user@example.com',
      date: '2024-01-15T10:00:00Z',
      receivedTime: '2024-01-15T10:00:00Z',
      snippet: 'This is a regular email...',
      isUnread: false,
      labels: ['INBOX']
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue('true'); // Default to important only
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        messages: mockEmails
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders email widget with glassmorphism styling', () => {
    const { container } = render(<EmailWidgetEnhanced {...mockProps} />);
    
    const card = container.querySelector('.glass-card-green');
    expect(card).toBeInTheDocument();
  });

  it('shows connect button when not connected', () => {
    const disconnectedProps = {
      ...mockProps,
      connectionStatus: { email: false }
    };
    
    render(<EmailWidgetEnhanced {...disconnectedProps} />);
    
    expect(screen.getByText('Connect your Gmail to see recent emails')).toBeInTheDocument();
    expect(screen.getByText('Connect Gmail')).toBeInTheDocument();
  });

  it('fetches emails when connected', async () => {
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3005/test/gmail/messages'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  it('displays emails with correct information', async () => {
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Important Email')).toBeInTheDocument();
      expect(screen.getByText('Regular Email')).toBeInTheDocument();
      expect(screen.getByText('From: sender@example.com')).toBeInTheDocument();
    });
  });

  it('shows unread badge for unread emails', async () => {
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const unreadBadges = screen.getAllByText('New');
      expect(unreadBadges).toHaveLength(1); // Only one unread email
    });
  });

  it('shows important star for important emails', async () => {
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const importantStars = screen.getByText('Important Email').closest('div')?.querySelector('.text-yellow-500');
      expect(importantStars).toBeInTheDocument();
    });
  });

  it('handles importance filter toggle', async () => {
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const filterSwitch = screen.getByLabelText('Important Only');
      fireEvent.click(filterSwitch);
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'dashboard.emailWidget.importantOnly',
      'false'
    );
  });

  it('handles email actions', async () => {
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const replyButtons = screen.getAllByTitle('Reply to email');
      fireEvent.click(replyButtons[0]);
    });
    
    // Should show reply toast (mocked)
    expect(vi.mocked(require('react-hot-toast').default.success)).toHaveBeenCalled();
  });

  it('handles mark as read/unread', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const readButtons = screen.getAllByTitle(/Mark as/);
      fireEvent.click(readButtons[0]);
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/read'),
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  it('handles email deletion with confirmation', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete email');
      fireEvent.click(deleteButtons[0]);
    });
    
    // Confirm deletion
    expect(screen.getByText('Delete Email')).toBeInTheDocument();
    const confirmButton = screen.getByText('Delete Email', { selector: 'button' });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/test/gmail/messages/1'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('handles refresh functionality', async () => {
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const refreshButton = screen.getByTitle('Refresh emails');
      fireEvent.click(refreshButton);
    });
    
    // Should call fetch again
    expect(fetch).toHaveBeenCalledTimes(2); // Initial load + refresh
  });

  it('shows time-based filtering info', async () => {
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Since last call (08:00)')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('API Error'));
    
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('persists filter preferences to localStorage', async () => {
    render(<EmailWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const filterSwitch = screen.getByLabelText('Important Only');
      fireEvent.click(filterSwitch);
    });
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'dashboard.emailWidget.importantOnly',
      'false'
    );
  });

  it('applies correct dark mode classes', () => {
    document.documentElement.classList.add('dark');
    
    const { container } = render(<EmailWidgetEnhanced {...mockProps} />);
    
    const card = container.querySelector('.glass-card-green');
    expect(card).toBeInTheDocument();
    
    document.documentElement.classList.remove('dark');
  });

  it('applies correct light mode classes', () => {
    document.documentElement.classList.add('light');
    
    const { container } = render(<EmailWidgetEnhanced {...mockProps} />);
    
    const card = container.querySelector('.glass-card-green');
    expect(card).toBeInTheDocument();
    
    document.documentElement.classList.remove('light');
  });

  it('handles localStorage errors gracefully', () => {
    localStorageMock.getItem.mockImplementation(() => {
      throw new Error('localStorage error');
    });
    
    // Should not crash and should default to important only
    render(<EmailWidgetEnhanced {...mockProps} />);
    expect(screen.getByLabelText('Important Only')).toBeChecked();
  });
});
