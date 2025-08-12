#!/usr/bin/env node

/**
 * Google OAuth 2.0 Configuration Test
 * Tests the Google OAuth setup for AI Daily Assistant
 */

import { config } from 'dotenv';
config();

console.log('🧪 Testing Google OAuth 2.0 Configuration...\n');

// Test environment variables
function testEnvironmentVariables() {
  console.log('1️⃣ Testing Environment Variables...');

  const requiredVars = [
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GOOGLE_SCOPES'
  ];

  let allVarsPresent = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value || value.includes('YOUR_') || value.includes('HERE')) {
      console.log(`   ❌ ${varName}: Not configured or placeholder value`);
      allVarsPresent = false;
    } else {
      console.log(`   ✅ ${varName}: Configured`);
      if (varName === 'GOOGLE_CLIENT_ID') {
        console.log(`      Value: ${value}`);
      } else if (varName === 'GOOGLE_CLIENT_SECRET') {
        console.log(`      Value: ${value.substring(0, 8)}...`);
      } else if (varName === 'GOOGLE_SCOPES') {
        const scopes = value.split(' ');
        console.log(`      Scopes: ${scopes.length} configured`);
        scopes.forEach(scope => console.log(`        - ${scope}`));
      }
    }
  });

  return allVarsPresent;
}

// Test client ID format
function testClientIDFormat() {
  console.log('\n2️⃣ Testing Client ID Format...');

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    console.log('   ❌ Client ID not found');
    return false;
  }

  if (clientId.endsWith('.apps.googleusercontent.com')) {
    console.log('   ✅ Client ID format is valid');
    console.log(`   ✅ Client ID: ${clientId}`);
    return true;
  } else {
    console.log('   ❌ Client ID format is invalid (should end with .apps.googleusercontent.com)');
    return false;
  }
}

// Test required scopes
function testRequiredScopes() {
  console.log('\n3️⃣ Testing Required Scopes...');

  const scopesString = process.env.GOOGLE_SCOPES;
  if (!scopesString) {
    console.log('   ❌ GOOGLE_SCOPES not configured');
    return false;
  }

  const configuredScopes = scopesString.split(' ');
  const requiredScopes = [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose'
  ];

  let allScopesPresent = true;

  requiredScopes.forEach(scope => {
    if (configuredScopes.includes(scope)) {
      console.log(`   ✅ ${scope}`);
    } else {
      console.log(`   ❌ ${scope} - Missing`);
      allScopesPresent = false;
    }
  });

  return allScopesPresent;
}

// Test OAuth URL generation
function testOAuthURLGeneration() {
  console.log('\n4️⃣ Testing OAuth URL Generation...');

  try {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const scopes = process.env.GOOGLE_SCOPES;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI_DEV || 'http://localhost:3000/auth/callback';

    if (!clientId || !scopes) {
      console.log('   ❌ Missing required configuration for URL generation');
      return false;
    }

    // Construct OAuth URL manually (without googleapis library)
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: scopes,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    console.log('   ✅ OAuth URL generated successfully');
    console.log('   📋 OAuth URL:');
    console.log(`   ${authUrl}\n`);

    return true;
  } catch (error) {
    console.log(`   ❌ Error generating OAuth URL: ${error.message}`);
    return false;
  }
}

// Generate configuration report
function generateConfigurationReport(results) {
  console.log('\n📋 Google OAuth Configuration Report');
  console.log('=' .repeat(50));

  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(result => result).length;

  console.log(`Tests Passed: ${passedTests}/${totalTests}`);
  console.log(`Success Rate: ${Math.round((passedTests / totalTests) * 100)}%\n`);

  Object.entries(results).forEach(([test, passed]) => {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} - ${test}`);
  });

  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Google OAuth is properly configured.');
    console.log('\nNext steps:');
    console.log('1. Configure redirect URIs in Google Cloud Console');
    console.log('2. Enable Google Calendar and Gmail APIs');
    console.log('3. Test the OAuth flow in your application');
    console.log('4. Implement token storage and refresh logic');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');

    if (!results['Environment Variables']) {
      console.log('\n🔧 To fix environment variables:');
      console.log('1. Get your client secret from Google Cloud Console');
      console.log('2. Update .env files with the actual client secret');
      console.log('3. Verify all required scopes are configured');
    }

    console.log('\nRefer to GOOGLE_OAUTH_SETUP.md for detailed instructions.');
  }
}

// Main test execution
async function runOAuthTests() {
  const results = {
    'Environment Variables': testEnvironmentVariables(),
    'Client ID Format': testClientIDFormat(),
    'Required Scopes': testRequiredScopes(),
    'OAuth URL Generation': testOAuthURLGeneration()
  };

  generateConfigurationReport(results);
}

// Run the tests
runOAuthTests().catch(error => {
  console.error('❌ Test execution failed:', error.message);
  process.exit(1);
});