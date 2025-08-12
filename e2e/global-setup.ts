import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup for Playwright tests...');
  
  // Launch browser for setup
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Wait for the dev server to be ready
    console.log('⏳ Waiting for dev server to be ready...');
    await page.goto(config.projects[0].use.baseURL || 'http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    console.log('✅ Dev server is ready');

    // Set up test data if needed
    // This could include seeding test database, creating test users, etc.
    console.log('🗃️ Setting up test data...');
    
    // Clear any existing localStorage/sessionStorage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    console.log('✅ Test data setup complete');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('✅ Global setup completed successfully');
}

export default globalSetup;
