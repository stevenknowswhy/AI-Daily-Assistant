import { beforeEach, describe, expect, it, vi } from 'vitest';
import dashboardApi from '@/services/dashboardApi';

const mockFetch = vi.fn();

describe('dashboardApi endpoints', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    (global as any).fetch = mockFetch;
    // Health check OK to force main path
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ status: 'ok' }) });
  });

  it('calls verified calendar voice endpoint with message payload', async () => {
    // Calendar call response
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, calendarResult: { events: [] } }) });

    await dashboardApi.fetchCalendarEvents('24h');

    const [url, options] = mockFetch.mock.calls[1];
    expect(url).toMatch(/\/test\/calendar\/voice/);
    expect(options?.method).toBe('POST');
    expect(typeof options?.body).toBe('string');
    const parsed = JSON.parse(options!.body!);
    expect(parsed.message).toBeDefined();
  });

  it('calls Gmail messages endpoint with GET and maxResults', async () => {
    // Emails response
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ success: true, messages: [] }) });

    await dashboardApi.fetchEmails(5);

    const [url, options] = mockFetch.mock.calls[mockFetch.mock.calls.length - 1]!;
    expect(url).toMatch(/\/test\/gmail\/messages\?maxResults=5/);
    expect(options.method).toBe('GET');
  });
});

