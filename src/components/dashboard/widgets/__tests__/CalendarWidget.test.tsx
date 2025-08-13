import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { CalendarWidget } from '../CalendarWidget';

// Mock fetch globally
const originalFetch = global.fetch;

describe('CalendarWidget (simplified)', () => {
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
  };

  const makeEvent = (overrides: any = {}) => ({
    id: Math.random().toString(36).slice(2),
    summary: 'Test Event',
    start: { dateTime: new Date().toISOString() },
    end: { dateTime: new Date(Date.now() + 60 * 60 * 1000).toISOString() },
    ...overrides,
  });

  const mockFetchEvents = (events: any[]) => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, events })
    });
  };

  it('shows connection prompt when calendar is not connected', () => {
    render(
      <CalendarWidget
        connectionStatus={{ calendar: false }}
        calendarTimeRange="24h"
        onAuthenticateCalendar={vi.fn()}
      />
    );

    expect(screen.getByText(/Connect your Google Calendar/i)).toBeInTheDocument();
    // Card styling presence (glassmorphism)
    expect(document.querySelector('.glass-card-blue')).toBeInTheDocument();
  });

  it('renders today events count based on fetched events', async () => {
    const now = new Date();
    const todayEvent = makeEvent({
      start: { dateTime: now.toISOString() },
      end: { dateTime: new Date(now.getTime() + 30 * 60 * 1000).toISOString() },
      summary: 'Today Event'
    });
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowEvent = makeEvent({
      start: { dateTime: tomorrow.toISOString() },
      end: { dateTime: new Date(tomorrow.getTime() + 30 * 60 * 1000).toISOString() },
      summary: 'Tomorrow Event'
    });

    mockFetchEvents([todayEvent, tomorrowEvent]);

    render(<CalendarWidget {...baseProps} />);

    // Wait for fetch and UI update
    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText(/event today|events today/i)).toBeInTheDocument();
    });
  });

  it('formats event times for today and all-day/tomorrow cases', async () => {
    const now = new Date();
    const todayTimed = makeEvent({ summary: 'Meeting Today' });

    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowAllDay = makeEvent({
      summary: 'Holiday',
      start: { date: tomorrow.toISOString().split('T')[0] },
      end: { date: tomorrow.toISOString().split('T')[0] }
    });

    mockFetchEvents([todayTimed, tomorrowAllDay]);

    render(<CalendarWidget {...baseProps} />);

    // Upcoming section renders formatted labels using internal formatEventTime
    await waitFor(() => {
      expect(screen.getByText(/Upcoming:/i)).toBeInTheDocument();
      // Make non-ambiguous assertions using getAllByText
      expect(screen.getAllByText(/Today/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Tomorrow/i).length).toBeGreaterThan(0);
    });

    // Verify Tailwind dark mode class presence on icon container
    const icon = document.querySelector('.text-blue-600.dark\\:text-blue-400');
    expect(icon).toBeTruthy();
  });
});

