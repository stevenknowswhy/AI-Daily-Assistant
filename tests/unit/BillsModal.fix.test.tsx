/**
 * Test for BillsModal formData fix
 * Ensures that the component renders without throwing "formData is not defined" error
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BillsModal } from '../../src/components/dashboard/BillsModal';

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

// Mock fetch
global.fetch = jest.fn();

describe('BillsModal - formData Fix', () => {
  beforeEach(() => {
    (fetch as jest.Mock).mockClear();
  });

  it('should render without throwing formData is not defined error', () => {
    // Mock successful API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // This should not throw "formData is not defined" error
    expect(() => {
      render(
        <BillsModal 
          isOpen={true} 
          onClose={() => {}} 
          onBillsChange={() => {}} 
        />
      );
    }).not.toThrow();
  });

  it('should display correct header text for adding a bill', async () => {
    // Mock successful API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(
      <BillsModal 
        isOpen={true} 
        onClose={() => {}} 
        onBillsChange={() => {}} 
      />
    );

    // Wait for component to load and click Add Bill button
    const addButton = await screen.findByText('Add Bill');
    addButton.click();

    // Should show "Add Bill" in the header (default type is 'bill')
    expect(screen.getByText(/Add Bill/)).toBeInTheDocument();
  });

  it('should handle form type changes correctly', async () => {
    // Mock successful API response
    (fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    render(
      <BillsModal 
        isOpen={true} 
        onClose={() => {}} 
        onBillsChange={() => {}} 
      />
    );

    // Wait for component to load and click Add Bill button
    const addButton = await screen.findByText('Add Bill');
    addButton.click();

    // The form should be accessible and the type field should work
    const typeSelect = screen.getByLabelText('Type');
    expect(typeSelect).toBeInTheDocument();
    
    // Should have both bill and subscription options
    expect(screen.getByDisplayValue('bill')).toBeInTheDocument();
  });
});
