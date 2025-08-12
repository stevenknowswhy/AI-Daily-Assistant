import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../utils/test-utils';
import { DailyCallWidgetV2 } from '@/components/dashboard/widgets/DailyCallWidgetV2';

// MSW will handle all fetch requests with proper mocking

function setTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

describe('DailyCallWidgetV2 color classes', () => {
  it('uses correct classes in light mode', async () => {
    setTheme('light');
    render(<DailyCallWidgetV2 userId="test-user" />);

    // Wait for content to load
    const callNow = await screen.findByText(/Tap to test call/i);
    expect(callNow.className).toMatch(/text-gray-600/);

    const phoneLabel = screen.getByText(/^Phone:/i);
    expect(phoneLabel.className).toMatch(/text-gray-600/);

    const voiceLabel = screen.getByText(/^Voice:/i);
    expect(voiceLabel.className).toMatch(/text-gray-600/);

    const statusLabel = screen.getByText(/^Status:/i);
    expect(statusLabel.className).toMatch(/text-gray-600/);

    const statusValue = screen.getByText(/Active|Inactive/);
    expect(statusValue.className).toMatch(/text-green-600|text-red-600/);
  });

  it('uses correct classes in dark mode', async () => {
    setTheme('dark');
    render(<DailyCallWidgetV2 userId="test-user" />);

    const callNow = await screen.findByText(/Tap to test call/i);
    expect(callNow.className).toMatch(/dark:text-muted-foreground/);

    const phoneLabel = screen.getByText(/^Phone:/i);
    expect(phoneLabel.className).toMatch(/dark:text-muted-foreground/);

    const voiceLabel = screen.getByText(/^Voice:/i);
    expect(voiceLabel.className).toMatch(/dark:text-muted-foreground/);

    const statusLabel = screen.getByText(/^Status:/i);
    expect(statusLabel.className).toMatch(/dark:text-muted-foreground/);

    const statusValue = screen.getByText(/Active|Inactive/);
    expect(statusValue.className).toMatch(/dark:text-green-400|dark:text-red-400/);
  });
});

