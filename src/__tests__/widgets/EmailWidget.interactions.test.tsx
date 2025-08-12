import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmailWidget } from '@/components/dashboard/widgets/EmailWidget';

vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ success: true, messages: []})})));

describe('EmailWidget interactions', () => {
  it('shows connect CTA when disconnected', async () => {
    const onAuthenticateGmail = vi.fn();
    render(
      <EmailWidget
        connectionStatus={{ calendar: false, email: false, phone: false, bills: false }}
        emailCount={10}
        onAuthenticateGmail={onAuthenticateGmail}
        onEmailCountChange={() => {}}
      />
    );

    const cta = await screen.findByText(/Connect your Gmail to see messages/i);
    expect(cta).toBeInTheDocument();
  });

  it('calls onAuthenticateGmail when button clicked', async () => {
    const onAuthenticateGmail = vi.fn();
    render(
      <EmailWidget
        connectionStatus={{ calendar: false, email: false, phone: false, bills: false }}
        emailCount={10}
        onAuthenticateGmail={onAuthenticateGmail}
        onEmailCountChange={() => {}}
      />
    );

    const btn = await screen.findByRole('button', { name: /Connect Gmail/i });
    btn.click();
    expect(onAuthenticateGmail).toHaveBeenCalled();
  });
});

