import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CalendarWidgetEnhanced } from '../CalendarWidgetEnhanced';

// Mock fetch
global.fetch = vi.fn();

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

describe('CalendarWidgetEnhanced', () => {
  const mockProps = {
    connectionStatus: {
      calendar: true
    },
    calendarTimeRange: '24h' as const,
    onAuthenticateCalendar: vi.fn()
  };

  const mockEvents = [
    {
      id: '1',
      summary: 'Test Event 1',
      start: { dateTime: '2024-01-15T09:00:00Z' },
      end: { dateTime: '2024-01-15T10:00:00Z' },
      location: 'Test Location',
      description: 'Test Description',
      attendees: [{ email: 'test@example.com' }]
    },
    {
      id: '2',
      summary: 'Test Event 2',
      start: { dateTime: '2024-01-15T14:00:00Z' },
      end: { dateTime: '2024-01-15T15:00:00Z' }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        events: mockEvents
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders calendar widget with glassmorphism styling', () => {
    const { container } = render(<CalendarWidgetEnhanced {...mockProps} />);
    
    const card = container.querySelector('.glass-card-blue');
    expect(card).toBeInTheDocument();
  });

  it('shows connect button when not connected', () => {
    const disconnectedProps = {
      ...mockProps,
      connectionStatus: { calendar: false }
    };
    
    render(<CalendarWidgetEnhanced {...disconnectedProps} />);
    
    expect(screen.getByText('Connect your Google Calendar to see events')).toBeInTheDocument();
    expect(screen.getByText('Connect Calendar')).toBeInTheDocument();
  });

  it('fetches events when connected', async () => {
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:3005/test/calendar/events'),
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  it('displays events in summary view', async () => {
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument(); // Event count
      expect(screen.getByText('events today')).toBeInTheDocument();
    });
  });

  it('toggles to detailed view', async () => {
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const detailButton = screen.getByTitle('Show detailed view');
      fireEvent.click(detailButton);
    });
    
    await waitFor(() => {
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
      expect(screen.getByText('Test Event 2')).toBeInTheDocument();
    });
  });

  it('opens create event form', async () => {
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const createButton = screen.getByTitle('Create new event');
      fireEvent.click(createButton);
    });
    
    expect(screen.getByText('Create New Event')).toBeInTheDocument();
    expect(screen.getByLabelText('Title *')).toBeInTheDocument();
  });

  it('handles event creation', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    // Open create form
    await waitFor(() => {
      const createButton = screen.getByTitle('Create new event');
      fireEvent.click(createButton);
    });
    
    // Fill form
    const titleInput = screen.getByLabelText('Title *');
    fireEvent.change(titleInput, { target: { value: 'New Test Event' } });
    
    // Submit form
    const submitButton = screen.getByText('Create Event');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3005/test/calendar/events',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('New Test Event')
        })
      );
    });
  });

  it('handles event editing', async () => {
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    // Switch to detailed view first
    await waitFor(() => {
      const detailButton = screen.getByTitle('Show detailed view');
      fireEvent.click(detailButton);
    });
    
    // Click edit button for first event
    await waitFor(() => {
      const editButtons = screen.getAllByTitle('Edit event');
      fireEvent.click(editButtons[0]);
    });
    
    expect(screen.getByText('Edit Event')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Event 1')).toBeInTheDocument();
  });

  it('handles event deletion with confirmation', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    // Switch to detailed view
    await waitFor(() => {
      const detailButton = screen.getByTitle('Show detailed view');
      fireEvent.click(detailButton);
    });
    
    // Click delete button
    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete event');
      fireEvent.click(deleteButtons[0]);
    });
    
    // Confirm deletion
    expect(screen.getByText('Delete Event')).toBeInTheDocument();
    const confirmButton = screen.getByText('Delete Event', { selector: 'button' });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3005/test/calendar/events/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('handles refresh functionality', async () => {
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const refreshButton = screen.getByTitle('Refresh calendar events');
      fireEvent.click(refreshButton);
    });
    
    // Should call fetch again
    expect(fetch).toHaveBeenCalledTimes(2); // Initial load + refresh
  });

  it('shows loading state', () => {
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    // Should show loading initially
    expect(screen.getByTitle('Refresh calendar events')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('API Error'));
    
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('formats event times correctly', async () => {
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    // Switch to detailed view to see formatted times
    await waitFor(() => {
      const detailButton = screen.getByTitle('Show detailed view');
      fireEvent.click(detailButton);
    });
    
    await waitFor(() => {
      // Should show formatted time for events
      expect(screen.getByText('Test Event 1')).toBeInTheDocument();
    });
  });

  it('validates form input', async () => {
    render(<CalendarWidgetEnhanced {...mockProps} />);
    
    // Open create form
    await waitFor(() => {
      const createButton = screen.getByTitle('Create new event');
      fireEvent.click(createButton);
    });
    
    // Try to submit without title
    const submitButton = screen.getByText('Create Event');
    expect(submitButton).toBeDisabled(); // Should be disabled without title
  });

  it('applies correct dark mode classes', () => {
    // Mock dark mode
    document.documentElement.classList.add('dark');
    
    const { container } = render(<CalendarWidgetEnhanced {...mockProps} />);
    
    const card = container.querySelector('.glass-card-blue');
    expect(card).toBeInTheDocument();
    
    // Clean up
    document.documentElement.classList.remove('dark');
  });

  it('applies correct light mode classes', () => {
    // Mock light mode
    document.documentElement.classList.add('light');
    
    const { container } = render(<CalendarWidgetEnhanced {...mockProps} />);
    
    const card = container.querySelector('.glass-card-blue');
    expect(card).toBeInTheDocument();
    
    // Clean up
    document.documentElement.classList.remove('light');
  });
});
