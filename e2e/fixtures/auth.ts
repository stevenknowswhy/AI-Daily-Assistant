import { test as base, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test user credentials for authentication
export const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User',
  phone: '+1234567890',
};

// Mock API responses for external services
export const MOCK_RESPONSES = {
  calendar: {
    events: [
      {
        id: '1',
        title: 'Test Meeting',
        start: new Date().toISOString(),
        end: new Date(Date.now() + 3600000).toISOString(),
        description: 'Test meeting description',
      },
    ],
  },
  gmail: {
    messages: [
      {
        id: '1',
        subject: 'Test Email',
        from: 'sender@example.com',
        snippet: 'This is a test email',
        unread: true,
      },
    ],
  },
  bills: [
    {
      id: '1',
      name: 'Test Bill',
      amount: 100.00,
      dueDate: '2025-01-15',
      frequency: 'monthly',
      category: 'utilities',
    },
  ],
};

type AuthFixtures = {
  authenticatedPage: any;
  mockApiResponses: any;
  accessibilityCheck: any;
};

export const test = base.extend<AuthFixtures>({
  // Fixture for authenticated user session
  authenticatedPage: async ({ page }, use) => {
    // Navigate to the app
    await page.goto('/');
    
    // Mock authentication state
    await page.evaluate((user) => {
      // Set up authenticated state in localStorage
      localStorage.setItem('auth-user', JSON.stringify({
        id: 'test-user-id',
        email: user.email,
        name: user.name,
        isAuthenticated: true,
      }));
      
      // Set up onboarding completion state
      localStorage.setItem('onboarding-complete', 'true');
      localStorage.setItem('onboarding-progress', '100');
    }, TEST_USER);

    // Reload to apply authentication state
    await page.reload();
    await page.waitForLoadState('networkidle');

    await use(page);
  },

  // Fixture for mocking API responses
  mockApiResponses: async ({ page }, use) => {
    // Mock Google Calendar API
    await page.route('**/api/calendar/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.calendar),
      });
    });

    // Mock Gmail API
    await page.route('**/api/gmail/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.gmail),
      });
    });

    // Mock Bills API
    await page.route('**/api/bills/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK_RESPONSES.bills),
      });
    });

    // Mock OpenRouter API
    await page.route('**/api/openrouter/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          response: 'Mock AI response',
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await use(page);
  },

  // Fixture for accessibility testing
  accessibilityCheck: async ({ page }, use) => {
    const checkAccessibility = async (options?: any) => {
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    };

    await use(checkAccessibility);
  },
});

export { expect } from '@playwright/test';
