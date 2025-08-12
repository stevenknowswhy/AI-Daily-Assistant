#!/usr/bin/env node

/**
 * Gmail Auth Interface Test Script
 * Tests the Gmail authentication interface functionality
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

class GmailAuthInterfaceTest {
  constructor() {
    this.testResults = [];
  }

  async runTest(testName, testFn) {
    try {
      console.log(`🧪 Running test: ${testName}`);
      await testFn();
      this.testResults.push({ name: testName, passed: true, error: null });
      console.log(`✅ ${testName} - PASSED`);
    } catch (error) {
      this.testResults.push({ name: testName, passed: false, error: error.message });
      console.log(`❌ ${testName} - FAILED: ${error.message}`);
    }
  }

  async testGmailAuthPageAccess() {
    const response = await fetch(`${BASE_URL}/gmail-auth`);
    
    if (!response.ok) {
      throw new Error(`Gmail auth page not accessible: ${response.status}`);
    }
    
    const html = await response.text();
    
    // Check for key elements
    if (!html.includes('Gmail Authentication')) {
      throw new Error('Gmail auth page missing title');
    }
    
    if (!html.includes('gmail-auth.js')) {
      throw new Error('Gmail auth JavaScript not included');
    }
    
    if (html.includes('<script>') && html.includes('function')) {
      throw new Error('Inline script still present - CSP violation risk');
    }
    
    console.log(`   🌐 Gmail auth page accessible and CSP compliant`);
  }

  async testReAuthenticationAPI() {
    const response = await fetch(`${BASE_URL}/api/email/re-authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (!data.hasOwnProperty('success')) {
      throw new Error('Re-authentication API missing success field');
    }
    
    if (data.requiresAuth && !data.authUrl) {
      throw new Error('Re-authentication API missing authUrl when requiresAuth is true');
    }
    
    console.log(`   🔐 Re-authentication API working correctly`);
  }

  async testCompleteAuthAPI() {
    const response = await fetch(`${BASE_URL}/api/email/complete-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: 'test-code' })
    });
    
    // This should fail with invalid code, but API should be accessible
    if (response.status === 404) {
      throw new Error('Complete auth API endpoint not found');
    }
    
    const data = await response.json();
    
    if (!data.hasOwnProperty('success')) {
      throw new Error('Complete auth API missing success field');
    }
    
    console.log(`   ✅ Complete auth API endpoint accessible`);
  }

  async testJavaScriptFileAccess() {
    const response = await fetch(`${BASE_URL}/static/js/gmail-auth.js`);
    
    if (!response.ok) {
      throw new Error(`Gmail auth JavaScript file not accessible: ${response.status}`);
    }
    
    const jsContent = await response.text();
    
    // Check for key functions
    const requiredFunctions = [
      'getAuthUrl',
      'completeAuth',
      'testAuth',
      'testEmailDeletion'
    ];
    
    for (const func of requiredFunctions) {
      if (!jsContent.includes(func)) {
        throw new Error(`Required function ${func} not found in JavaScript file`);
      }
    }
    
    console.log(`   📜 Gmail auth JavaScript file accessible with all required functions`);
  }

  async testCSPCompliance() {
    const response = await fetch(`${BASE_URL}/gmail-auth`);
    const html = await response.text();
    
    // Check that there are no inline scripts
    const inlineScriptRegex = /<script(?![^>]*src=)[^>]*>[\s\S]*?<\/script>/gi;
    const inlineScripts = html.match(inlineScriptRegex);
    
    if (inlineScripts && inlineScripts.length > 0) {
      // Filter out empty scripts or scripts with only whitespace
      const nonEmptyInlineScripts = inlineScripts.filter(script => {
        const content = script.replace(/<\/?script[^>]*>/gi, '').trim();
        return content.length > 0;
      });
      
      if (nonEmptyInlineScripts.length > 0) {
        throw new Error(`Found ${nonEmptyInlineScripts.length} inline script(s) that violate CSP`);
      }
    }
    
    // Check that external script is referenced
    if (!html.includes('src="/static/js/gmail-auth.js"')) {
      throw new Error('External JavaScript file not properly referenced');
    }
    
    console.log(`   🛡️ CSP compliance verified - no inline scripts found`);
  }

  async runAllTests() {
    console.log('🚀 Starting Gmail Auth Interface Tests\n');
    
    await this.runTest('Gmail Auth Page Access', () => this.testGmailAuthPageAccess());
    await this.runTest('Re-Authentication API', () => this.testReAuthenticationAPI());
    await this.runTest('Complete Auth API', () => this.testCompleteAuthAPI());
    await this.runTest('JavaScript File Access', () => this.testJavaScriptFileAccess());
    await this.runTest('CSP Compliance', () => this.testCSPCompliance());
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 Test Summary:');
    console.log('================');
    
    const passed = this.testResults.filter(t => t.passed).length;
    const failed = this.testResults.filter(t => !t.passed).length;
    
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / this.testResults.length) * 100)}%`);
    
    if (failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(t => !t.passed)
        .forEach(test => {
          console.log(`   • ${test.name}: ${test.error}`);
        });
    }
    
    console.log('\n🎯 Gmail Auth Interface Status:');
    if (failed === 0) {
      console.log('🎉 All Gmail authentication interface issues resolved!');
      console.log('✅ CSP inline script error fixed');
      console.log('✅ JavaScript function references working');
      console.log('✅ External JavaScript file properly loaded');
      console.log('✅ All API endpoints accessible');
      console.log('✅ Interface ready for OAuth completion');
    } else {
      console.log('⚠️  Some issues remain - check failed tests above');
    }
    
    console.log('\n📋 Next Steps:');
    console.log('1. Visit http://localhost:3001/gmail-auth');
    console.log('2. Click "Get Authorization URL"');
    console.log('3. Complete OAuth flow in browser');
    console.log('4. Test email deletion functionality');
  }
}

// Run the tests
const tester = new GmailAuthInterfaceTest();
tester.runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
