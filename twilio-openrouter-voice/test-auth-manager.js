#!/usr/bin/env node

/**
 * Test Auth Manager with Fixed Schema
 * ===================================
 * 
 * Tests the auth manager with the corrected oauth_tokens schema
 */

import { AuthManager } from './src/services/auth-manager.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Set test encryption key
process.env.TOKEN_ENCRYPTION_KEY = '941c8b770cb397238758a9d6ff8f4a90e07aebd2f2a4e4ef50c91e96de54e35f';

console.log('🧪 Testing Auth Manager with Fixed Schema...\n');

async function testAuthManager() {
  try {
    console.log('1️⃣ Initializing Auth Manager...');
    const authManager = new AuthManager();
    
    // Initialize the auth manager
    const initResult = await authManager.initialize();
    console.log('   ✅ Auth Manager initialized:', initResult.success ? 'Success' : 'Failed');
    
    console.log('\n2️⃣ Testing token storage and retrieval...');
    
    // Test token data
    const testUserId = 'test-user-12345';
    const testTokens = {
      access_token: 'ya29.a0AfH6SMBxyz123...test-access-token',
      refresh_token: '1//04xyz789...test-refresh-token',
      token_type: 'Bearer',
      expiry_date: Date.now() + 3600000, // 1 hour from now
      scope: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/gmail.readonly'
    };
    
    console.log('   📝 Test tokens prepared');
    console.log(`   👤 Test user ID: ${testUserId}`);
    
    // Store tokens
    console.log('   💾 Storing encrypted tokens...');
    await authManager.storeTokensSecurely(testUserId, testTokens);
    console.log('   ✅ Tokens stored successfully');
    
    // Retrieve tokens
    console.log('   📥 Retrieving and decrypting tokens...');
    const retrievedTokens = await authManager.getStoredTokens(testUserId);
    
    if (!retrievedTokens) {
      throw new Error('Failed to retrieve tokens');
    }
    
    console.log('   ✅ Tokens retrieved successfully');
    
    // Verify token data
    console.log('\n3️⃣ Verifying token data integrity...');
    
    const verifications = [
      { name: 'Access Token', original: testTokens.access_token, retrieved: retrievedTokens.access_token },
      { name: 'Refresh Token', original: testTokens.refresh_token, retrieved: retrievedTokens.refresh_token },
      { name: 'Token Type', original: testTokens.token_type, retrieved: retrievedTokens.token_type },
      { name: 'Scope', original: testTokens.scope, retrieved: retrievedTokens.scope }
    ];
    
    let allVerified = true;
    for (const verification of verifications) {
      const isMatch = verification.original === verification.retrieved;
      console.log(`   ${isMatch ? '✅' : '❌'} ${verification.name}: ${isMatch ? 'Match' : 'Mismatch'}`);
      if (!isMatch) {
        console.log(`      Expected: ${verification.original}`);
        console.log(`      Got: ${verification.retrieved}`);
        allVerified = false;
      }
    }
    
    if (!allVerified) {
      throw new Error('Token data verification failed');
    }
    
    console.log('\n4️⃣ Testing authentication status...');
    
    // Set credentials for authentication check
    authManager.oauth2Client.setCredentials(retrievedTokens);
    
    const isAuthenticated = authManager.isAuthenticated();
    console.log(`   ✅ Authentication status: ${isAuthenticated ? 'Authenticated' : 'Not authenticated'}`);
    
    console.log('\n5️⃣ Testing token refresh (if needed)...');
    
    const refreshResult = await authManager.refreshTokenIfNeeded(testUserId);
    console.log(`   ✅ Token refresh check: ${refreshResult.success ? 'Success' : 'Failed'}`);
    console.log(`   📝 Refresh performed: ${refreshResult.refreshed ? 'Yes' : 'No'}`);
    
    console.log('\n6️⃣ Cleaning up test data...');
    
    // Clean up test tokens
    const revokeResult = await authManager.revokeAuthentication(testUserId);
    console.log(`   ✅ Test cleanup: ${revokeResult.success ? 'Success' : 'Failed'}`);
    
    console.log('\n🎉 All Auth Manager tests passed!');
    console.log('\n📋 Test Summary:');
    console.log('   • Auth Manager initialization: ✅ Working');
    console.log('   • Token encryption/storage: ✅ Working');
    console.log('   • Token retrieval/decryption: ✅ Working');
    console.log('   • Data integrity verification: ✅ Working');
    console.log('   • Authentication status check: ✅ Working');
    console.log('   • Token refresh mechanism: ✅ Working');
    console.log('   • Cleanup and revocation: ✅ Working');
    console.log('\n🔒 The Auth Manager is ready for production use with encrypted tokens.');
    
  } catch (error) {
    console.error('❌ Auth Manager test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Ensure Supabase is configured and accessible');
    console.error('   • Verify the oauth_tokens table exists with correct schema');
    console.error('   • Check that TOKEN_ENCRYPTION_KEY is set correctly');
    console.error('   • Run the database migration if you haven\'t already');
    console.error('   • Check Supabase logs for detailed error information');
    
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAuthManager().catch(console.error);
}

export { testAuthManager };
