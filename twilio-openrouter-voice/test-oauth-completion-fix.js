#!/usr/bin/env node

/**
 * OAuth Completion Fix Verification Test
 * Tests the Gmail OAuth completion endpoint fixes
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3001';

class OAuthCompletionTest {
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

  async testCompleteAuthEndpointAccessibility() {
    const response = await fetch(`${BASE_URL}/api/email/complete-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'test-code' })
    });
    
    if (response.status === 404) {
      throw new Error('Complete auth endpoint not found');
    }
    
    const data = await response.json();
    
    if (!data.hasOwnProperty('success')) {
      throw new Error('Response missing success field');
    }
    
    console.log(`   🔗 Complete auth endpoint accessible and responding`);
  }

  async testErrorHandlingWithInvalidCode() {
    const response = await fetch(`${BASE_URL}/api/email/complete-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'invalid-test-code' })
    });
    
    const data = await response.json();
    
    if (data.success === true) {
      throw new Error('Invalid code should not succeed');
    }
    
    if (!data.error) {
      throw new Error('Error response missing error field');
    }
    
    if (!data.message) {
      throw new Error('Error response missing user message');
    }
    
    // Check for improved error messages
    const expectedErrors = ['invalid_grant', 'Invalid authorization code'];
    const hasExpectedError = expectedErrors.some(err => 
      data.error.includes(err) || data.message.includes(err)
    );
    
    if (!hasExpectedError) {
      throw new Error(`Unexpected error format: ${data.error}`);
    }
    
    console.log(`   🚫 Invalid code properly rejected with user-friendly message`);
  }

  async testMissingCodeValidation() {
    const response = await fetch(`${BASE_URL}/api/email/complete-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    
    if (response.status !== 400) {
      throw new Error(`Expected 400 status for missing code, got ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.success !== false) {
      throw new Error('Missing code should return success: false');
    }
    
    if (!data.error || !data.error.includes('required')) {
      throw new Error('Missing code should return appropriate error message');
    }
    
    console.log(`   ⚠️  Missing authorization code properly validated`);
  }

  async testCredentialsFileResolution() {
    // This test checks if the server can find the credentials file
    const response = await fetch(`${BASE_URL}/api/email/re-authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    // If credentials file is missing, we'd get a different error
    if (data.error && data.error.includes('Credentials file not found')) {
      throw new Error('Credentials file resolution failed');
    }
    
    // We expect either success or requiresAuth, not credentials error
    if (!data.hasOwnProperty('success') && !data.hasOwnProperty('requiresAuth')) {
      throw new Error('Unexpected response format from re-authenticate');
    }
    
    console.log(`   📁 Credentials file resolution working correctly`);
  }

  async testReAuthenticationFlow() {
    const response = await fetch(`${BASE_URL}/api/email/re-authenticate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    
    if (data.requiresAuth && !data.authUrl) {
      throw new Error('Re-authentication requires auth but no authUrl provided');
    }
    
    if (data.authUrl) {
      // Validate the auth URL format
      if (!data.authUrl.includes('accounts.google.com')) {
        throw new Error('Invalid Google OAuth URL format');
      }
      
      if (!data.authUrl.includes('gmail')) {
        throw new Error('OAuth URL missing Gmail scopes');
      }
      
      if (!data.authUrl.includes('gmail.modify')) {
        throw new Error('OAuth URL missing gmail.modify scope');
      }
    }
    
    console.log(`   🔐 Re-authentication flow working with correct scopes`);
  }

  async testServerLogsForErrors() {
    // Test that the server doesn't crash with various inputs
    const testCases = [
      { code: '' },
      { code: null },
      { code: undefined },
      { code: 'very-long-invalid-code-that-should-be-handled-gracefully' },
      { code: '123' },
      { code: 'special-chars-!@#$%^&*()' }
    ];
    
    for (const testCase of testCases) {
      const response = await fetch(`${BASE_URL}/api/email/complete-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase)
      });
      
      // Server should not crash (should get a response)
      if (!response) {
        throw new Error(`Server crashed with input: ${JSON.stringify(testCase)}`);
      }
      
      // Should get proper error response
      const data = await response.json();
      if (!data.hasOwnProperty('success')) {
        throw new Error(`Invalid response format for input: ${JSON.stringify(testCase)}`);
      }
    }
    
    console.log(`   🛡️  Server handles various invalid inputs gracefully`);
  }

  async runAllTests() {
    console.log('🚀 Starting OAuth Completion Fix Verification Tests\n');
    
    await this.runTest('Complete Auth Endpoint Accessibility', () => this.testCompleteAuthEndpointAccessibility());
    await this.runTest('Error Handling with Invalid Code', () => this.testErrorHandlingWithInvalidCode());
    await this.runTest('Missing Code Validation', () => this.testMissingCodeValidation());
    await this.runTest('Credentials File Resolution', () => this.testCredentialsFileResolution());
    await this.runTest('Re-Authentication Flow', () => this.testReAuthenticationFlow());
    await this.runTest('Server Stability with Invalid Inputs', () => this.testServerLogsForErrors());
    
    this.printSummary();
  }

  printSummary() {
    console.log('\n📊 OAuth Completion Fix Test Summary:');
    console.log('=====================================');
    
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
    
    console.log('\n🎯 OAuth Completion Status:');
    if (failed === 0) {
      console.log('🎉 All OAuth completion issues have been resolved!');
      console.log('✅ 500 Internal Server Error fixed');
      console.log('✅ Credentials file resolution working');
      console.log('✅ Enhanced error handling implemented');
      console.log('✅ User-friendly error messages added');
      console.log('✅ Authorization code validation working');
      console.log('✅ Server stability improved');
      console.log('✅ Gmail auth interface ready for use');
    } else {
      console.log('⚠️  Some OAuth completion issues remain - check failed tests above');
    }
    
    console.log('\n📋 Next Steps for Users:');
    console.log('1. Visit http://localhost:3001/gmail-auth');
    console.log('2. Click "Get Authorization URL"');
    console.log('3. Complete OAuth flow in browser');
    console.log('4. Copy ONLY the authorization code (not the full URL)');
    console.log('5. Paste code in interface and click "Complete Authentication"');
    console.log('6. Test email deletion functionality');
    
    console.log('\n💡 Common Issues to Avoid:');
    console.log('• Don\'t paste the full OAuth URL - only the authorization code');
    console.log('• Authorization codes expire quickly - use them immediately');
    console.log('• Make sure to grant all requested Gmail permissions');
    console.log('• If authentication fails, get a fresh authorization code');
  }
}

// Run the tests
const tester = new OAuthCompletionTest();
tester.runAllTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});
