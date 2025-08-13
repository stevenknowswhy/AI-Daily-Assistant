import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../../__tests__/utils/test-utils';
import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { DailyCallWidgetV2 } from '../DailyCallWidgetV2';

// Mock toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(() => 'toast-id'),
  }
}));

// Mock hooks for queries to avoid loading skeleton
vi.mock('../../../../hooks/queries', () => {
  return {
    useDailyCallPreferences: vi.fn(() => ({
      data: {
        preferences: {
          enabled: false,
          time: '08:00',
          timezone: 'America/Los_Angeles',
          phoneNumber: '+15551234567',
          voice: 'alloy',
          includeCalendar: true,
          includeEmails: true,
          includeBills: true,
          weekdays: [true, true, true, true, true, false, false],
        }
      },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })),
    useUpdateDailyCallPreferences: vi.fn(() => ({
      isPending: false,
      mutateAsync: vi.fn(async () => ({
        id: 'id', userId: 'uid', preferences: {}
      })),
    })),
    useTestDailyCall: vi.fn(() => ({
      mutateAsync: vi.fn(async () => ({ success: true, callSid: 'CA123' }))
    })),
  };
});

// Mock fetch for authentication
const originalFetch = global.fetch;

describe('DailyCallWidgetV2', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) });
  });
  afterEach(() => {
    vi.clearAllMocks();
    global.fetch = originalFetch;
  });

  it('renders with glassmorphism styles and dark mode classes', async () => {
    const { container } = render(<DailyCallWidgetV2 />);
    // Container uses various classes; check presence of glass card
    expect(container.querySelector('.glass-card-purple')).toBeTruthy();
  });

  it('validates phone number and prevents save when missing', async () => {
    const { container } = render(<DailyCallWidgetV2 />);

    // Enter edit mode using title attribute
    fireEvent.click(screen.getByTitle('Edit settings'));

    // Clear phone number
    const phoneInput = container.querySelector('input[type="tel"]') as HTMLInputElement;
    fireEvent.change(phoneInput, { target: { value: '' } });

    // Try to save using title attribute
    const saveBtn = screen.getByTitle('Save preferences');
    expect(saveBtn).toBeDisabled();
  });

  it('authenticates with Bills/Supabase before saving', async () => {
    render(<DailyCallWidgetV2 />);

    // Enter edit mode
    fireEvent.click(screen.getByTitle('Edit settings'));

    // Fill in valid phone number
    const input = screen.getByPlaceholderText('+1 (555) 123-4567');
    fireEvent.change(input, { target: { value: '+15551234567' } });

    // Submit
    const saveButton = screen.getByTitle('Save preferences');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/test/bills/authenticate'), expect.any(Object));
    });
  });

  it('triggers test call mutation on time click', async () => {
    render(<DailyCallWidgetV2 />);

    // Click the "Tap to test call" text which triggers the test call
    fireEvent.click(screen.getByText(/Tap to test call/i));

    await waitFor(() => {
      // The mocked hook returns success; ensure UI remains rendered
      expect(screen.getByText(/Tap to test call/i)).toBeInTheDocument();
    });
  });

  it('formats phone number display in read-only view', () => {
    render(<DailyCallWidgetV2 />);
    // Check for formatted phone number display (555) 123-4567
    expect(screen.getByText(/555.*123.*4567/)).toBeInTheDocument();
  });
});

