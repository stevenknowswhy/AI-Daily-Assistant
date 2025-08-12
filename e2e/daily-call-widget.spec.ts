import { test, expect } from './fixtures/auth';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Daily Call Widget', () => {
  test.beforeEach(async ({ authenticatedPage, mockApiResponses }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();
  });

  test('should display daily call widget', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await expect(dashboard.dailyCallCard).toBeVisible();
    await expect(dashboard.dailyCallEditButton).toBeVisible();
    await expect(dashboard.dailyCallTestButton).toBeVisible();
  });

  test('should enter edit mode when edit button is clicked', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.editDailyCallSettings();
    
    // Should show form fields
    await expect(dashboard.phoneNumberInput).toBeVisible();
    await expect(dashboard.callTimeSelect).toBeVisible();
    await expect(dashboard.voiceSelect).toBeVisible();
    await expect(dashboard.saveButton).toBeVisible();
    await expect(dashboard.cancelButton).toBeVisible();
  });

  test('should validate phone number input', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.editDailyCallSettings();
    
    // Test invalid phone number
    await dashboard.phoneNumberInput.fill('invalid-phone');
    await dashboard.saveButton.click();
    
    // Should show validation error
    await expect(authenticatedPage.locator('text=Please enter a valid phone number')).toBeVisible();
  });

  test('should save valid daily call preferences', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.editDailyCallSettings();
    
    // Fill valid form data
    await dashboard.fillDailyCallForm({
      phoneNumber: '+1234567890',
      time: '09:00',
      voice: 'alloy',
      enabled: true,
    });
    
    // Mock the API response
    await authenticatedPage.route('**/api/daily-call/preferences', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });
    
    await dashboard.saveDailyCallSettings();
    
    // Should exit edit mode
    await expect(dashboard.phoneNumberInput).not.toBeVisible();
    
    // Should show success message or updated state
    await expect(dashboard.dailyCallToggle).toBeChecked();
  });

  test('should cancel edit mode without saving', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.editDailyCallSettings();
    
    // Fill some data
    await dashboard.phoneNumberInput.fill('+1234567890');
    
    // Cancel editing
    await dashboard.cancelButton.click();
    
    // Should exit edit mode without saving
    await expect(dashboard.phoneNumberInput).not.toBeVisible();
  });

  test('should handle test call functionality', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Mock test call API
    await authenticatedPage.route('**/api/daily-call/test', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          callSid: 'test-call-sid-123',
          message: 'Test call initiated successfully'
        }),
      });
    });
    
    await dashboard.testDailyCall();
    
    // Should show success feedback
    // This depends on how your app shows test call feedback
    await authenticatedPage.waitForTimeout(1000);
  });

  test('should validate time format', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.editDailyCallSettings();
    
    // Test valid time formats
    const validTimes = ['08:00', '12:30', '23:59'];
    
    for (const time of validTimes) {
      await dashboard.callTimeSelect.selectOption(time);
      // Should accept valid time
      await expect(dashboard.callTimeSelect).toHaveValue(time);
    }
  });

  test('should handle voice selection', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.editDailyCallSettings();
    
    // Test all voice options
    const voices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'];
    
    for (const voice of voices) {
      await dashboard.voiceSelect.selectOption(voice);
      await expect(dashboard.voiceSelect).toHaveValue(voice);
    }
  });

  test('should toggle daily call enabled state', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.editDailyCallSettings();
    
    // Test toggle functionality
    const initialState = await dashboard.dailyCallToggle.isChecked();
    
    await dashboard.dailyCallToggle.click();
    
    const newState = await dashboard.dailyCallToggle.isChecked();
    expect(newState).not.toBe(initialState);
  });

  test('should be accessible', async ({ authenticatedPage, accessibilityCheck }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Check accessibility in view mode
    await accessibilityCheck();
    
    // Check accessibility in edit mode
    await dashboard.editDailyCallSettings();
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
    
    // Should be able to interact with widget on mobile
    await expect(dashboard.dailyCallCard).toBeVisible();
    await dashboard.editDailyCallSettings();
    
    // Form should be usable on mobile
    await expect(dashboard.phoneNumberInput).toBeVisible();
    await dashboard.phoneNumberInput.fill('+1234567890');
  });
});
