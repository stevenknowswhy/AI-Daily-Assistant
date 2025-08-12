import { test, expect } from './fixtures/auth';
import { DashboardPage } from './pages/DashboardPage';

test.describe('JARVIS Voice Integration', () => {
  test.beforeEach(async ({ authenticatedPage, mockApiResponses }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    await dashboard.goto();
    await dashboard.waitForDashboardLoad();
  });

  test('should display JARVIS voice button', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await expect(dashboard.jarvisVoiceButton).toBeVisible();
  });

  test('should open JARVIS voice modal when button is clicked', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openJarvisVoice();
    
    await expect(dashboard.jarvisModal).toBeVisible();
    await expect(dashboard.voiceCommandInput).toBeVisible();
    await expect(dashboard.microphoneButton).toBeVisible();
  });

  test('should handle calendar voice commands', async ({ authenticatedPage, mockApiResponses }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Mock OpenRouter API response for calendar query
    await authenticatedPage.route('**/api/openrouter/**', (route) => {
      const requestBody = route.request().postDataJSON();
      if (requestBody?.messages?.some((msg: any) => msg.content.includes('calendar'))) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            response: 'You have a Test Meeting today at 2:00 PM. The meeting is about testing the calendar integration.',
            timestamp: new Date().toISOString(),
          }),
        });
      } else {
        route.continue();
      }
    });
    
    await dashboard.openJarvisVoice();
    await dashboard.sendVoiceCommand("What's on my calendar today?");
    
    // Should show AI response about calendar
    await expect(dashboard.voiceResponse).toContainText('Test Meeting');
    await expect(dashboard.voiceResponse).toContainText('2:00 PM');
  });

  test('should handle email voice commands', async ({ authenticatedPage, mockApiResponses }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Mock OpenRouter API response for email query
    await authenticatedPage.route('**/api/openrouter/**', (route) => {
      const requestBody = route.request().postDataJSON();
      if (requestBody?.messages?.some((msg: any) => msg.content.includes('email'))) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            response: 'You have 1 unread email from sender@example.com with the subject "Test Email". The email says: This is a test email.',
            timestamp: new Date().toISOString(),
          }),
        });
      } else {
        route.continue();
      }
    });
    
    await dashboard.openJarvisVoice();
    await dashboard.sendVoiceCommand("Check my emails");
    
    // Should show AI response about emails
    await expect(dashboard.voiceResponse).toContainText('1 unread email');
    await expect(dashboard.voiceResponse).toContainText('sender@example.com');
  });

  test('should handle bills voice commands', async ({ authenticatedPage, mockApiResponses }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Mock OpenRouter API response for bills query
    await authenticatedPage.route('**/api/openrouter/**', (route) => {
      const requestBody = route.request().postDataJSON();
      if (requestBody?.messages?.some((msg: any) => msg.content.includes('bill'))) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            response: 'You have a Test Bill due on January 15th for $100.00. It\'s a monthly utility bill.',
            timestamp: new Date().toISOString(),
          }),
        });
      } else {
        route.continue();
      }
    });
    
    await dashboard.openJarvisVoice();
    await dashboard.sendVoiceCommand("What bills do I have coming up?");
    
    // Should show AI response about bills
    await expect(dashboard.voiceResponse).toContainText('Test Bill');
    await expect(dashboard.voiceResponse).toContainText('$100.00');
    await expect(dashboard.voiceResponse).toContainText('January 15th');
  });

  test('should handle daily summary voice commands', async ({ authenticatedPage, mockApiResponses }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Mock comprehensive daily summary response
    await authenticatedPage.route('**/api/openrouter/**', (route) => {
      const requestBody = route.request().postDataJSON();
      if (requestBody?.messages?.some((msg: any) => msg.content.includes('daily summary') || msg.content.includes('briefing'))) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            response: 'Good morning! Here\'s your daily briefing: You have 1 meeting today - Test Meeting at 2:00 PM. You have 1 unread email from sender@example.com. Your Test Bill for $100.00 is due on January 15th. Have a great day!',
            timestamp: new Date().toISOString(),
          }),
        });
      } else {
        route.continue();
      }
    });
    
    await dashboard.openJarvisVoice();
    await dashboard.sendVoiceCommand("Give me my daily briefing");
    
    // Should show comprehensive summary
    await expect(dashboard.voiceResponse).toContainText('daily briefing');
    await expect(dashboard.voiceResponse).toContainText('Test Meeting');
    await expect(dashboard.voiceResponse).toContainText('unread email');
    await expect(dashboard.voiceResponse).toContainText('Test Bill');
  });

  test('should handle unknown voice commands gracefully', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Mock response for unknown command
    await authenticatedPage.route('**/api/openrouter/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          response: 'I\'m sorry, I didn\'t understand that command. I can help you with your calendar, emails, bills, and daily summaries. What would you like to know?',
          timestamp: new Date().toISOString(),
        }),
      });
    });
    
    await dashboard.openJarvisVoice();
    await dashboard.sendVoiceCommand("What's the weather on Mars?");
    
    // Should show helpful response
    await expect(dashboard.voiceResponse).toContainText('didn\'t understand');
    await expect(dashboard.voiceResponse).toContainText('calendar, emails, bills');
  });

  test('should handle API errors gracefully', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Mock API error
    await authenticatedPage.route('**/api/openrouter/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'Internal server error'
        }),
      });
    });
    
    await dashboard.openJarvisVoice();
    await dashboard.sendVoiceCommand("What's on my calendar?");
    
    // Should show error message
    await expect(authenticatedPage.locator('text=Sorry, I encountered an error')).toBeVisible();
  });

  test('should support keyboard shortcuts', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Test keyboard shortcut to open JARVIS (if implemented)
    await authenticatedPage.keyboard.press('Control+j');
    
    // Should open JARVIS modal
    await expect(dashboard.jarvisModal).toBeVisible();
  });

  test('should be accessible', async ({ authenticatedPage, accessibilityCheck }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    // Check accessibility of voice button
    await accessibilityCheck();
    
    // Check accessibility of voice modal
    await dashboard.openJarvisVoice();
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
    
    // Should be able to access JARVIS on mobile
    await expect(dashboard.jarvisVoiceButton).toBeVisible();
    await dashboard.openJarvisVoice();
    
    // Modal should be usable on mobile
    await expect(dashboard.jarvisModal).toBeVisible();
    await expect(dashboard.voiceCommandInput).toBeVisible();
    
    // Should be able to send commands on mobile
    await dashboard.voiceCommandInput.fill("What's on my calendar?");
    await dashboard.voiceCommandInput.press('Enter');
  });

  test('should close modal with escape key', async ({ authenticatedPage }) => {
    const dashboard = new DashboardPage(authenticatedPage);
    
    await dashboard.openJarvisVoice();
    await expect(dashboard.jarvisModal).toBeVisible();
    
    // Press escape to close
    await authenticatedPage.keyboard.press('Escape');
    
    // Modal should close
    await expect(dashboard.jarvisModal).not.toBeVisible();
  });
});
