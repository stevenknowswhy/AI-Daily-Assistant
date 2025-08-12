import { chromium, FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown for Playwright tests...');
  
  // Launch browser for cleanup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Clean up test data
    console.log('🗑️ Cleaning up test data...');
    
    // Navigate to the app to access localStorage/sessionStorage
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:5173');
    
    // Clear any test data from localStorage/sessionStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Additional cleanup could include:
    // - Deleting test database records
    // - Cleaning up uploaded files
    // - Resetting API mocks
    
    console.log('✅ Test data cleanup complete');

  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error in teardown to avoid masking test failures
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ Global teardown completed');
}

export default globalTeardown;
