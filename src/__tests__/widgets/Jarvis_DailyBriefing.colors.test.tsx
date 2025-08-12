import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { JarvisWidget } from '@/components/dashboard/widgets/JarvisWidget';
import { DailyBriefingWidget } from '@/components/dashboard/widgets/DailyBriefingWidget';

function setTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

describe('Jarvis and DailyBriefing widgets color classes', () => {
  it('Jarvis uses consistent classes', async () => {
    setTheme('light');
    render(<JarvisWidget isVoiceActive={false} onJarvisClick={() => {}} />);
    expect(await screen.findByText(/JARVIS/)).toHaveClass('text-gray-900');
  });

  it('DailyBriefing uses consistent classes', async () => {
    setTheme('dark');
    render(
      <DailyBriefingWidget
        isLoadingDailySummary={false}
        dailySummaryResponse={''}
        showDailyBriefingModal={false}
        onDailySummaryClick={() => {}}
        onCloseDailyBriefingModal={() => {}}
      />
    );
    expect(await screen.findByText(/Daily Briefing/)).toHaveClass('dark:text-foreground');
  });
});

