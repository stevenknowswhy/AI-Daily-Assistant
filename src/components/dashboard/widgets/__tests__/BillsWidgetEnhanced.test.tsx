import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BillsWidgetEnhanced } from '../BillsWidgetEnhanced';

// Mock fetch
global.fetch = vi.fn();

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
  }
}));

// Mock BillsModal
vi.mock('../../BillsModal', () => ({
  BillsModal: ({ isOpen, onClose, onBillSaved, editingBill }: any) => (
    isOpen ? (
      <div data-testid="bills-modal">
        <div>Bills Modal</div>
        <div>{editingBill ? 'Edit Mode' : 'Create Mode'}</div>
        <button onClick={onClose}>Close</button>
        <button onClick={onBillSaved}>Save</button>
      </div>
    ) : null
  )
}));

describe('BillsWidgetEnhanced', () => {
  const mockProps = {
    connectionStatus: {
      bills: true
    },
    onAuthenticateBills: vi.fn()
  };

  const mockBills = [
    {
      id: '1',
      name: 'Netflix Subscription',
      amount: 15.99,
      dueDate: '2024-01-20',
      frequency: 'monthly' as const,
      category: 'entertainment',
      type: 'subscription' as const,
      isPaid: false,
      auto_pay: false
    },
    {
      id: '2',
      name: 'Electric Bill',
      amount: 120.50,
      dueDate: '2024-01-15',
      frequency: 'monthly' as const,
      category: 'utilities',
      type: 'bill' as const,
      isPaid: true,
      auto_pay: true
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        bills: mockBills
      })
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders bills widget with glassmorphism styling', () => {
    const { container } = render(<BillsWidgetEnhanced {...mockProps} />);
    
    const card = container.querySelector('.glass-card-yellow');
    expect(card).toBeInTheDocument();
  });

  it('shows connect button when not connected', () => {
    const disconnectedProps = {
      ...mockProps,
      connectionStatus: { bills: false }
    };
    
    render(<BillsWidgetEnhanced {...disconnectedProps} />);
    
    expect(screen.getByText('Connect to Supabase to manage bills and subscriptions')).toBeInTheDocument();
    expect(screen.getByText('Connect Bills')).toBeInTheDocument();
  });

  it('fetches bills when connected', async () => {
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3005/api/bills',
        expect.objectContaining({
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
  });

  it('displays bills with correct information', async () => {
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Netflix Subscription')).toBeInTheDocument();
      expect(screen.getByText('Electric Bill')).toBeInTheDocument();
      expect(screen.getByText('$15.99')).toBeInTheDocument();
      expect(screen.getByText('$120.50')).toBeInTheDocument();
    });
  });

  it('shows paid badge for paid bills', async () => {
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const paidBadges = screen.getAllByText('Paid');
      expect(paidBadges).toHaveLength(1); // Only Electric Bill is paid
    });
  });

  it('shows overdue badge for overdue bills', async () => {
    // Mock a bill that's overdue
    const overdueBills = [
      {
        ...mockBills[0],
        dueDate: '2024-01-10', // Past date
        isPaid: false
      }
    ];
    
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        bills: overdueBills
      })
    });
    
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('1 overdue')).toBeInTheDocument();
    });
  });

  it('opens create bill modal', async () => {
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const createButton = screen.getByTitle('Add new bill');
      fireEvent.click(createButton);
    });
    
    expect(screen.getByTestId('bills-modal')).toBeInTheDocument();
    expect(screen.getByText('Create Mode')).toBeInTheDocument();
  });

  it('opens edit bill modal', async () => {
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const editButtons = screen.getAllByTitle('Edit bill');
      fireEvent.click(editButtons[0]);
    });
    
    expect(screen.getByTestId('bills-modal')).toBeInTheDocument();
    expect(screen.getByText('Edit Mode')).toBeInTheDocument();
  });

  it('handles mark as paid', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const markPaidButtons = screen.getAllByTitle('Mark as paid');
      fireEvent.click(markPaidButtons[0]); // Netflix (unpaid)
    });
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3005/api/bills/1',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isPaid: true })
        })
      );
    });
  });

  it('handles bill deletion with confirmation', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
    
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const deleteButtons = screen.getAllByTitle('Delete bill');
      fireEvent.click(deleteButtons[0]);
    });
    
    // Confirm deletion
    expect(screen.getByText('Delete Bill')).toBeInTheDocument();
    const confirmButton = screen.getByText('Delete Bill', { selector: 'button' });
    fireEvent.click(confirmButton);
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3005/api/bills/1',
        expect.objectContaining({ method: 'DELETE' })
      );
    });
  });

  it('handles refresh functionality', async () => {
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      const refreshButton = screen.getByTitle('Refresh bills');
      fireEvent.click(refreshButton);
    });
    
    // Should call fetch again
    expect(fetch).toHaveBeenCalledTimes(2); // Initial load + refresh
  });

  it('shows empty state with add button', async () => {
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        bills: []
      })
    });
    
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('No bills or subscriptions')).toBeInTheDocument();
      expect(screen.getByText('Add Your First Bill')).toBeInTheDocument();
    });
  });

  it('formats due dates correctly', async () => {
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      // Should show formatted due dates
      expect(screen.getByText('Netflix Subscription')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('API Error'));
    
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Try Again')).toBeInTheDocument();
    });
  });

  it('applies correct dark mode classes', () => {
    document.documentElement.classList.add('dark');
    
    const { container } = render(<BillsWidgetEnhanced {...mockProps} />);
    
    const card = container.querySelector('.glass-card-yellow');
    expect(card).toBeInTheDocument();
    
    document.documentElement.classList.remove('dark');
  });

  it('applies correct light mode classes', () => {
    document.documentElement.classList.add('light');
    
    const { container } = render(<BillsWidgetEnhanced {...mockProps} />);
    
    const card = container.querySelector('.glass-card-yellow');
    expect(card).toBeInTheDocument();
    
    document.documentElement.classList.remove('light');
  });

  it('shows loading state', () => {
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    // Should show loading initially
    expect(screen.getByTitle('Refresh bills')).toBeInTheDocument();
  });

  it('handles modal close and save events', async () => {
    render(<BillsWidgetEnhanced {...mockProps} />);
    
    // Open modal
    await waitFor(() => {
      const createButton = screen.getByTitle('Add new bill');
      fireEvent.click(createButton);
    });
    
    // Close modal
    const closeButton = screen.getByText('Close');
    fireEvent.click(closeButton);
    
    expect(screen.queryByTestId('bills-modal')).not.toBeInTheDocument();
  });
});
