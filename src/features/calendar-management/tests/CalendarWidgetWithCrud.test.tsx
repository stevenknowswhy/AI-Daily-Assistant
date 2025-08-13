import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CalendarWidgetWithCrud } from '../components/CalendarWidgetWithCrud';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock fetch globally
const originalFetch = global.fetch;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('CalendarWidgetWithCrud', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  const baseProps = {
    connectionStatus: { calendar: true },
    calendarTimeRange: '24h' as const,
    onAuthenticateCalendar: vi.fn(),
    onTimeRangeChange: vi.fn(),
  };

  const mockEvent = {
    id: 'event-1',
    summary: 'Test Event',
    description: 'Test Description',
    location: 'Test Location',
    start: { dateTime: new Date().toISOString() },
    end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    attendees: [{ email: 'test@example.com' }],
  };

  const mockFetchEvents = (events: any[] = []) => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, events })
    });
  };

  it('shows connection prompt when calendar is not connected', () => {
    const Wrapper = createWrapper();
    render(
      <Wrapper>
        <CalendarWidgetWithCrud
          {...baseProps}
          connectionStatus={{ calendar: false }}
        />
      </Wrapper>
    );

    expect(screen.getByText(/Connect your Google Calendar/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect calendar/i })).toBeInTheDocument();
  });

  it('renders calendar widget with glassmorphism styling', async () => {
    mockFetchEvents([mockEvent]);
    const Wrapper = createWrapper();
    
    const { container } = render(
      <Wrapper>
        <CalendarWidgetWithCrud {...baseProps} />
      </Wrapper>
    );

    // Check for glassmorphism card class
    expect(container.querySelector('.glass-card-blue')).toBeInTheDocument();
    
    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  it('displays today events count correctly', async () => {
    const todayEvent = {
      ...mockEvent,
      start: { dateTime: new Date().toISOString() },
      end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    };
    
    mockFetchEvents([todayEvent]);
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <CalendarWidgetWithCrud {...baseProps} />
      </Wrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText(/event today/i)).toBeInTheDocument();
    });
  });

  it('opens create event modal when plus button is clicked', async () => {
    mockFetchEvents([]);
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <CalendarWidgetWithCrud {...baseProps} />
      </Wrapper>
    );

    // Wait for component to load
    await waitFor(() => {
      expect(screen.getByTitle('Create new event')).toBeInTheDocument();
    });

    // Click create button
    fireEvent.click(screen.getByTitle('Create new event'));

    // Check modal opens
    await waitFor(() => {
      expect(screen.getByText('Create Event')).toBeInTheDocument();
      expect(screen.getByLabelText(/event title/i)).toBeInTheDocument();
    });
  });

  it('shows edit and delete buttons in detailed view', async () => {
    mockFetchEvents([mockEvent]);
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <CalendarWidgetWithCrud {...baseProps} />
      </Wrapper>
    );

    // Wait for events to load
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    // Toggle detailed view
    fireEvent.click(screen.getByTitle('Toggle detailed view'));

    // Check for edit and delete buttons
    await waitFor(() => {
      expect(screen.getByTitle('Edit event')).toBeInTheDocument();
      expect(screen.getByTitle('Delete event')).toBeInTheDocument();
    });
  });

  it('opens edit modal when edit button is clicked', async () => {
    mockFetchEvents([mockEvent]);
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <CalendarWidgetWithCrud {...baseProps} />
      </Wrapper>
    );

    // Wait for events and toggle detailed view
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTitle('Toggle detailed view'));
    
    await waitFor(() => {
      expect(screen.getByTitle('Edit event')).toBeInTheDocument();
    });

    // Click edit button
    fireEvent.click(screen.getByTitle('Edit event'));

    // Check edit modal opens with pre-filled data
    await waitFor(() => {
      expect(screen.getByText('Edit Event')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
    });
  });

  it('opens delete confirmation modal when delete button is clicked', async () => {
    mockFetchEvents([mockEvent]);
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <CalendarWidgetWithCrud {...baseProps} />
      </Wrapper>
    );

    // Wait for events and toggle detailed view
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
    });
    
    fireEvent.click(screen.getByTitle('Toggle detailed view'));
    
    await waitFor(() => {
      expect(screen.getByTitle('Delete event')).toBeInTheDocument();
    });

    // Click delete button
    fireEvent.click(screen.getByTitle('Delete event'));

    // Check delete modal opens
    await waitFor(() => {
      expect(screen.getByText('Delete Event')).toBeInTheDocument();
      expect(screen.getByText(/are you sure you want to delete/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /delete event/i })).toBeInTheDocument();
    });
  });

  it('handles refresh functionality', async () => {
    mockFetchEvents([mockEvent]);
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <CalendarWidgetWithCrud {...baseProps} />
      </Wrapper>
    );

    // Wait for initial load
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    // Mock second fetch for refresh
    mockFetchEvents([mockEvent]);

    // Click refresh button
    fireEvent.click(screen.getByTitle('Refresh calendar events'));

    // Should call fetch again
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });

  it('displays error state when fetch fails', async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <CalendarWidgetWithCrud {...baseProps} />
      </Wrapper>
    );

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/network error/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
    });
  });

  it('formats event times correctly for today and tomorrow', async () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEvent = {
      ...mockEvent,
      id: 'today-event',
      summary: 'Today Event',
      start: { dateTime: now.toISOString() },
      end: { dateTime: new Date(now.getTime() + 60 * 60 * 1000).toISOString() },
    };

    const tomorrowEvent = {
      ...mockEvent,
      id: 'tomorrow-event',
      summary: 'Tomorrow Event',
      start: { dateTime: tomorrow.toISOString() },
      end: { dateTime: new Date(tomorrow.getTime() + 60 * 60 * 1000).toISOString() },
    };

    mockFetchEvents([todayEvent, tomorrowEvent]);
    const Wrapper = createWrapper();
    
    render(
      <Wrapper>
        <CalendarWidgetWithCrud {...baseProps} />
      </Wrapper>
    );

    // Toggle detailed view to see formatted times
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument(); // Today count
    });
    
    fireEvent.click(screen.getByTitle('Toggle detailed view'));

    // Check formatted times appear
    await waitFor(() => {
      expect(screen.getByText(/Today Event/)).toBeInTheDocument();
      expect(screen.getByText(/Tomorrow Event/)).toBeInTheDocument();
    });
  });
});
