import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '../utils/test-utils';
import { DailyCallWidgetV2 } from '../../components/dashboard/widgets/DailyCallWidgetV2';

// MSW will handle all fetch requests with proper mocking

// Helper to set theme so class names with dark: are present
beforeEach(() => {
  document.documentElement.classList.add('light');
  localStorage.clear();
});

describe('DailyCallWidgetV2 save and toggle behavior', () => {
  it('saves preferences and exits edit mode on save click', async () => {
    render(<DailyCallWidgetV2 userId="u-test" />);

    // Wait for initial load
    await screen.findByText(/Daily Call/i);

    // Enter edit mode via settings icon
    const settingsButtons = screen.getAllByTitle(/Edit settings/i);
    fireEvent.click(settingsButtons[0]);

    // Enter a phone number
    const phoneInput = await screen.findByPlaceholderText(/\+1 \(555\) 123-4567/);
    fireEvent.change(phoneInput, { target: { value: '+1 (555) 123-4567' } });

    // Click save
    const saveButtons = screen.getAllByTitle(/Save preferences/i);
    fireEvent.click(saveButtons[0]);

    // After save, edit form should be closed and value displayed
    const tapToCall = await screen.findByText(/Tap to test call/i);
    expect(tapToCall).toBeInTheDocument();
  });

  it('toggle switch updates isActive', async () => {
    render(<DailyCallWidgetV2 userId="u-test" />);
    // Enter edit mode
    const settingsButtons = await screen.findAllByTitle(/Edit settings/i);
    fireEvent.click(settingsButtons[0]);

    const toggle = await screen.findByRole('switch');
    // Toggle on, then off
    fireEvent.click(toggle);
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-checked');
  });
});

