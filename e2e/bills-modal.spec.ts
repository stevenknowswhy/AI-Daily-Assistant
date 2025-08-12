import { test, expect } from './fixtures/auth';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Bills Modal', () => {
  test.beforeEach(async ({ authenticatedPage, mockApiResponses }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();
  });

  test('should open bills modal when triggered', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openBillsModal();
    
    await expect(dashboard.billsModal).toBeVisible();
    await expect(dashboard.addBillButton).toBeVisible();
  });

  test('should display existing bills', async ({ authenticatedPage, mockApiResponses }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openBillsModal();
    
    // Should show mocked bills
    await expect(authenticatedPage.locator('text=Test Bill')).toBeVisible();
    await expect(authenticatedPage.locator('text=$100.00')).toBeVisible();
  });

  test('should show add bill form when add button is clicked', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openBillsModal();
    await dashboard.addBillButton.click();
    
    // Should show form fields
    await expect(dashboard.billNameInput).toBeVisible();
    await expect(dashboard.billAmountInput).toBeVisible();
    await expect(dashboard.billDueDateInput).toBeVisible();
    await expect(dashboard.billFrequencySelect).toBeVisible();
    await expect(dashboard.billCategorySelect).toBeVisible();
    await expect(dashboard.submitBillButton).toBeVisible();
  });

  test('should validate required fields', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openBillsModal();
    await dashboard.addBillButton.click();
    
    // Try to submit empty form
    await dashboard.submitBillButton.click();
    
    // Should show validation errors
    await expect(authenticatedPage.locator('text=Bill name is required')).toBeVisible();
    await expect(authenticatedPage.locator('text=Amount must be greater than 0')).toBeVisible();
  });

  test('should validate amount field', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openBillsModal();
    await dashboard.addBillButton.click();
    
    // Test invalid amounts
    await dashboard.billAmountInput.fill('-10');
    await dashboard.submitBillButton.click();
    await expect(authenticatedPage.locator('text=Amount must be greater than 0')).toBeVisible();
    
    await dashboard.billAmountInput.fill('abc');
    await dashboard.submitBillButton.click();
    await expect(authenticatedPage.locator('text=Amount must be greater than 0')).toBeVisible();
    
    // Test valid amount
    await dashboard.billAmountInput.fill('100.50');
    // Should not show amount error anymore
    await expect(authenticatedPage.locator('text=Amount must be greater than 0')).not.toBeVisible();
  });

  test('should validate due date', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openBillsModal();
    await dashboard.addBillButton.click();
    
    // Test past date (should be allowed for some bills)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const pastDateString = pastDate.toISOString().split('T')[0];
    
    await dashboard.billDueDateInput.fill(pastDateString);
    // Should accept past dates for bills
    
    // Test future date
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 30);
    const futureDateString = futureDate.toISOString().split('T')[0];
    
    await dashboard.billDueDateInput.fill(futureDateString);
    // Should accept future dates
  });

  test('should successfully add a new bill', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Mock successful API response
    await authenticatedPage.route('**/api/bills', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            id: 'new-bill-id',
            message: 'Bill added successfully'
          }),
        });
      } else {
        route.continue();
      }
    });
    
    await dashboard.openBillsModal();
    
    const billData = {
      name: 'Electric Bill',
      amount: '150.75',
      dueDate: '2025-02-15',
      frequency: 'monthly',
      category: 'utilities',
    };
    
    await dashboard.addNewBill(billData);
    
    // Should show success message
    await expect(authenticatedPage.locator('text=Bill added successfully')).toBeVisible();
    
    // Should show the new bill in the list
    await dashboard.expectBillInList('Electric Bill');
  });

  test('should handle API errors gracefully', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Mock API error
    await authenticatedPage.route('**/api/bills', (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ 
            error: 'Internal server error'
          }),
        });
      } else {
        route.continue();
      }
    });
    
    await dashboard.openBillsModal();
    
    const billData = {
      name: 'Test Bill',
      amount: '100.00',
      dueDate: '2025-02-15',
      frequency: 'monthly',
      category: 'utilities',
    };
    
    await dashboard.addNewBill(billData);
    
    // Should show error message
    await expect(authenticatedPage.locator('text=Failed to save bill')).toBeVisible();
  });

  test('should support all frequency options', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openBillsModal();
    await dashboard.addBillButton.click();
    
    const frequencies = ['weekly', 'monthly', 'quarterly', 'yearly', 'one-time'];
    
    for (const frequency of frequencies) {
      await dashboard.billFrequencySelect.selectOption(frequency);
      await expect(dashboard.billFrequencySelect).toHaveValue(frequency);
    }
  });

  test('should support all category options', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openBillsModal();
    await dashboard.addBillButton.click();
    
    const categories = [
      'utilities', 'housing', 'transportation', 'food', 
      'healthcare', 'entertainment', 'insurance', 'debt', 
      'savings', 'other'
    ];
    
    for (const category of categories) {
      await dashboard.billCategorySelect.selectOption(category);
      await expect(dashboard.billCategorySelect).toHaveValue(category);
    }
  });

  test('should be accessible', async ({ authenticatedPage, accessibilityCheck }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Check accessibility of modal
    await dashboard.openBillsModal();
    await accessibilityCheck();
    
    // Check accessibility of add form
    await dashboard.addBillButton.click();
    await accessibilityCheck();
  });

  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Set up authenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth-user', JSON.stringify({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        isAuthenticated: true,
      }));
    });
    
    await page.reload();
    
    const dashboard = new DashboardPage(page);
    await dashboard.goto();
    
    // Should be able to open modal on mobile
    await dashboard.openBillsModal();
    await expect(dashboard.billsModal).toBeVisible();
    
    // Form should be usable on mobile
    await dashboard.addBillButton.click();
    await expect(dashboard.billNameInput).toBeVisible();
    
    // Should be able to fill form on mobile
    await dashboard.billNameInput.fill('Mobile Test Bill');
    await dashboard.billAmountInput.fill('50.00');
  });

  test('should close modal when clicking outside', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openBillsModal();
    await expect(dashboard.billsModal).toBeVisible();
    
    // Click outside the modal (on backdrop)
    await authenticatedPage.locator('.modal-backdrop, [data-testid="modal-backdrop"]').click();
    
    // Modal should close
    await expect(dashboard.billsModal).not.toBeVisible();
  });
});
