import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BillsWidget } from '@/components/dashboard/widgets/BillsWidget';

vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ([])})));

describe('BillsWidget', () => {
  it('renders header', async () => {
    render(<BillsWidget connectionStatus={{ calendar: false, email: false, phone: false, bills: true }} showBillsModal={false} onOpenBillsModal={() => {}} onCloseBillsModal={() => {}} onAuthenticateBills={() => {}} />);
    expect(await screen.findByText(/Bills & Subscriptions/)).toBeInTheDocument();
  });
});

