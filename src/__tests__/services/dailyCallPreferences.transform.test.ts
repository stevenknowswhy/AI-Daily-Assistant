import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dailyCallPreferencesService } from '../../services/dailyCallPreferences';

const mockFetch = vi.fn();

describe('dailyCallPreferences transform', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    (global as any).fetch = mockFetch;
    const store: Record<string, string> = {};
    (global as any).localStorage = {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
      removeItem: vi.fn((k: string) => { delete store[k]; }),
    };
  });

  it('converts snake_case API response to camelCase', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ success: true, preferences: {
        phone_number: '+15551234567', call_time: '07:30', timezone: 'UTC', no_answer_action: 'email_briefing', retry_count: 3, is_active: false
      }})
    });

    const res = await dailyCallPreferencesService.getUserPreferences('u1');
    expect(res.preferences?.phoneNumber).toBe('+15551234567');
    expect(res.preferences?.callTime).toBe('07:30');
    expect(res.preferences?.noAnswerAction).toBe('email_briefing');
    expect(res.preferences?.retryCount).toBe(3);
    expect(res.preferences?.isActive).toBe(false);
  });
});

