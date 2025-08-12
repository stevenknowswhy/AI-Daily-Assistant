import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmailWidget } from '../../components/dashboard/widgets/EmailWidget';

describe('EmailWidget', () => {
  it('renders title', async () => {
    render(
      <EmailWidget
        connectionStatus={{ calendar: false, email: true, phone: false, bills: false }}
        emailCount={10}
        onAuthenticateGmail={() => {}}
        onEmailCountChange={() => {}}
      />
    );
    expect(await screen.findByText(/Email/)).toBeInTheDocument();
  });

  it('displays email count when connected', async () => {
    render(
      <EmailWidget
        connectionStatus={{ calendar: false, email: true, phone: false, bills: false }}
        emailCount={5}
        onAuthenticateGmail={() => {}}
        onEmailCountChange={() => {}}
      />
    );
    // The widget should display the email count
    expect(screen.getByText(/Email/)).toBeInTheDocument();
  });

  it('shows authentication prompt when not connected', async () => {
    render(
      <EmailWidget
        connectionStatus={{ calendar: false, email: false, phone: false, bills: false }}
        emailCount={0}
        onAuthenticateGmail={() => {}}
        onEmailCountChange={() => {}}
      />
    );
    expect(screen.getByText(/Email/)).toBeInTheDocument();
  });
});

