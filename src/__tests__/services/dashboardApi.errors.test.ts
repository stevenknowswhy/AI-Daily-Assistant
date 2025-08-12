import { describe, it, expect, beforeEach } from 'vitest';
import { server } from '../mocks/server';
import { http, HttpResponse } from 'msw';
import dashboardApi from '../../services/dashboardApi';

describe('dashboardApi errors', () => {
  beforeEach(() => {
    // Reset MSW handlers before each test
    server.resetHandlers();
  });

  it('handles network error on calendar events', async () => {
    // Override MSW handler to simulate network error
    server.use(
      http.post('*/test/calendar/voice', () => {
        return HttpResponse.error();
      })
    );

    const events = await dashboardApi.fetchCalendarEvents('24h');
    expect(Array.isArray(events)).toBe(true);
  });

  it('handles invalid email response', async () => {
    // Override MSW handler to simulate invalid response
    server.use(
      http.get('*/test/gmail/messages', () => {
        return HttpResponse.json({});
      })
    );

    const emails = await dashboardApi.fetchEmails(5);
    expect(Array.isArray(emails)).toBe(true);
  });
});

