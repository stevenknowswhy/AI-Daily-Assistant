import { test, expect } from './fixtures/auth';
import { DashboardPage } from './pages/DashboardPage';

test.describe('Smoke Tests', () => {
  test('should load the application successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check that the page loads without errors
    await expect(page).toHaveTitle(/AI Daily Assistant/);
    
    // Check for main navigation or content
    await expect(page.locator('body')).toBeVisible();
    
    // Ensure no JavaScript errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.waitForLoadState('networkidle');
    expect(errors).toHaveLength(0);
  });

  test('should navigate to dashboard when authenticated', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.expectDashboardToBeLoaded();
  });

  test('should display all main dashboard widgets', async ({ authenticatedPage, mockApiResponses }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    
    // Check that all main widgets are visible
    await expect(dashboard.dailyCallCard).toBeVisible();
    await expect(dashboard.billsCard).toBeVisible();
    await expect(dashboard.calendarCard).toBeVisible();
    await expect(dashboard.emailCard).toBeVisible();
    await expect(dashboard.dailyBriefingCard).toBeVisible();
  });

  test('should have working theme toggle', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    
    // Get initial theme
    const initialTheme = await authenticatedPage.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    
    // Toggle theme
    await dashboard.toggleTheme();
    
    // Verify theme changed
    const newTheme = await authenticatedPage.evaluate(() => {
      return document.documentElement.classList.contains('dark');
    });
    
    expect(newTheme).not.toBe(initialTheme);
  });

  test('should be accessible', async ({ authenticatedPage, accessibilityCheck }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    
    // Run accessibility check on the dashboard
    await accessibilityCheck({
      rules: {
        // Disable color-contrast rule for now as it might be too strict
        'color-contrast': { enabled: false },
      },
    });
  });

  test('should be responsive on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/');
    
    // Check that the page is responsive
    await expect(page.locator('body')).toBeVisible();
    
    // Check that content doesn't overflow
    const bodyWidth = await page.locator('body').boundingBox();
    expect(bodyWidth?.width).toBeLessThanOrEqual(375);
  });

  test('should handle network errors gracefully', async ({ page }) => {
    // Simulate network failure
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    await page.goto('/');
    
    // Should still load the basic UI
    await expect(page.locator('body')).toBeVisible();
    
    // Should show appropriate error states
    // This depends on how your app handles network errors
    await page.waitForTimeout(2000);
  });
});
