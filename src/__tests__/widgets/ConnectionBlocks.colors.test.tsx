import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectionBlocks } from '../../components/dashboard/ConnectionBlocks';

function setTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}

describe('ConnectionBlocks colors', () => {
  it('uses consistent label and icon colors', async () => {
    setTheme('light');
    render(
      <ConnectionBlocks
        connectionStatus={{ calendar: true, email: true, bills: true, phone: false }}
        onAuthenticateCalendar={async () => {}}
        onAuthenticateGmail={async () => {}}
        onAuthenticateBills={async () => true}
        onDisconnectService={async () => {}}
      />
    );
    // Expect headings
    expect(await screen.findByText(/Your Services/)).toHaveClass('text-gray-900');
    expect(await screen.findByText(/Financial Tools/)).toHaveClass('text-gray-900');
  });
});

