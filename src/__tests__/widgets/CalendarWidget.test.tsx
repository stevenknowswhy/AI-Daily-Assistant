import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarWidget } from '@/components/dashboard/widgets/CalendarWidget';

vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true, events: []})})));

describe('CalendarWidget', () => {
  it('renders title', async () => {
    render(<CalendarWidget connectionStatus={{ calendar: true, email: false, phone: false, bills: false }} calendarTimeRange={'24h'} onAuthenticateCalendar={() => {}} onTimeRangeChange={() => {}} />);
    expect(await screen.findByText(/Calendar/)).toBeInTheDocument();
  });
});

