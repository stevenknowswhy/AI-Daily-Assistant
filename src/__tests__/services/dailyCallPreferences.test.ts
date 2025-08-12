import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dailyCallPreferencesService } from '../../services/dailyCallPreferences';

const USER_ID = 'test-user';

describe('dailyCallPreferencesService', () => {
  beforeEach(() => {
    // Mock localStorage
    const store: Record<string, string> = {};
    (global as any).localStorage = {
      getItem: vi.fn((k: string) => store[k] ?? null),
      setItem: vi.fn((k: string, v: string) => { store[k] = v; }),
      removeItem: vi.fn((k: string) => { delete store[k]; }),
    };
  });

  it('gets preferences with MSW mocked response', async () => {
    const res = await dailyCallPreferencesService.getUserPreferences(USER_ID);
    expect(res.success).toBe(true);
    expect(res.preferences).toBeDefined();
    if (res.preferences) {
      expect(res.preferences.phoneNumber).toBeDefined();
      expect(res.preferences.callTime).toBeDefined();
      expect(res.preferences.timezone).toBeDefined();
    }
  });

  it('saves preferences and updates localStorage', async () => {
    const prefs = {
      phoneNumber: '+1555',
      callTime: '09:00',
      timezone: 'UTC',
      noAnswerAction: 'text_briefing',
      retryCount: 1,
      isActive: true
    } as any;

    const res = await dailyCallPreferencesService.saveUserPreferences(USER_ID, prefs);
    expect(res.success).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    // This test will use the fallback behavior when API fails
    const res = await dailyCallPreferencesService.getUserPreferences('nonexistent-user');
    // Service should still return a response, possibly from localStorage or defaults
    expect(res).toBeDefined();
    expect(typeof res.success).toBe('boolean');
  });
});

