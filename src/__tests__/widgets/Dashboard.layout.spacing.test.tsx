import { describe, it, expect, vi } from 'vitest';
import { render } from '../utils/test-utils';
import { Dashboard } from '@/components/dashboard/Dashboard';

// Mock hooks used by Dashboard to render without external dependencies
vi.mock('@/contexts/ClerkAuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1', firstName: 'Test' }, logout: async () => {} })
}));
vi.mock('@/hooks/useDashboard', () => ({
  useDashboard: () => ({ authenticateCalendar: vi.fn(), authenticateGmail: vi.fn(), authenticateBills: vi.fn(), disconnectService: vi.fn(), signOutAllServices: vi.fn() })
}));
vi.mock('@/hooks/useDashboardState', () => ({
  useDashboardState: () => ({
    isVoiceActive: false,
    isLoadingDailySummary: false,
    dailySummaryResponse: '',
    showDailyBriefingModal: false,
    connectionStatus: { calendar: false, email: false, bills: false, phone: false },
    authStatus: { authenticated: true, calendar: false, gmail: false },
    lastStatusCheck: new Date(),
    statusCheckInterval: null,
    isSigningOut: false,
    setIsVoiceActive: vi.fn(),
    setShowDailyBriefingModal: vi.fn(),
    setIsSigningOut: vi.fn(),
    setConnectionStatus: vi.fn(),
    setAuthStatus: vi.fn(),
    setLastStatusCheck: vi.fn(),
    setStatusCheckInterval: vi.fn(),
  })
}));
vi.mock('@/hooks/useConnectionStatus', () => ({
  useConnectionStatus: () => ({ refreshConnectionStatus: vi.fn() })
}));
vi.mock('@/contexts/OnboardingContext', () => ({
  useOnboarding: () => ({ totalSteps: 6, data: { completedSteps: [] } })
}));

// Basic smoke test that checks container classes were applied

describe('Dashboard layout spacing', () => {
  it('applies max width and spacing utilities', () => {
    const { container } = render(<Dashboard />);
    const wrappers = container.querySelectorAll('div.max-w-screen-2xl');
    expect(wrappers.length).toBeGreaterThan(0);

    const grids = container.querySelectorAll('div.grid');
    let foundExtendedGaps = false;
    grids.forEach((el) => {
      const className = el.getAttribute('class') || '';
      if (/xl:gap-8/.test(className) && /2xl:gap-10/.test(className)) {
        foundExtendedGaps = true;
      }
    });
    expect(foundExtendedGaps).toBe(true);
  });
});

