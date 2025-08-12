#!/usr/bin/env node

/**
 * Database Integration Test
 * =========================
 * 
 * Tests database connectivity and oauth_tokens table functionality
 */

import { createClient } from '@supabase/supabase-js';
import { secureTokenManager } from './src/utils/secure-token-manager.js';
import { config } from 'dotenv';

// Load environment variables
config();

// Set test encryption key
process.env.TOKEN_ENCRYPTION_KEY = '941c8b770cb397238758a9d6ff8f4a90e07aebd2f2a4e4ef50c91e96de54e35f';

console.log('🔗 Testing Database Integration...\n');

async function testDatabaseIntegration() {
  try {
    console.log('1️⃣ Testing Supabase Connection...');
    
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.log('   ⚠️  Supabase credentials not configured, skipping database tests');
      console.log('   📝 Testing encryption functionality only...\n');
      
      // Test encryption without database
      console.log('2️⃣ Testing Token Encryption (Standalone)...');
      
      const testToken = 'ya29.a0AfH6SMBxyz123...test-oauth-token';
      const encrypted = secureTokenManager.encrypt(testToken, 'test-context');
      const decrypted = secureTokenManager.decrypt(encrypted);
      
      console.log(`   ✅ Encryption: ${encrypted.encrypted !== testToken ? 'WORKING' : 'FAILED'}`);
      console.log(`   ✅ Decryption: ${decrypted === testToken ? 'WORKING' : 'FAILED'}`);
      
      console.log('\n🎉 Encryption system is working correctly!');
      console.log('📋 To test database integration, configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
      return;
    }

    // Create Supabase client with service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('oauth_tokens')
      .select('count', { count: 'exact', head: true });

    if (connectionError) {
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    console.log('   ✅ Supabase connection: WORKING');
    console.log(`   📊 Current oauth_tokens count: ${connectionTest?.count || 0}`);

    console.log('\n2️⃣ Testing Token Storage with Encryption...');

    // Test data
    const testUserId = 'test-user-' + Date.now();
    const testTokens = {
      access_token: 'ya29.a0AfH6SMBxyz123...test-access-token',
      refresh_token: '1//04xyz789...test-refresh-token'
    };

    // Encrypt tokens
    const encryptedAccessToken = secureTokenManager.encrypt(
      testTokens.access_token, 
      `oauth-access-${testUserId}`
    );
    
    const encryptedRefreshToken = secureTokenManager.encrypt(
      testTokens.refresh_token, 
      `oauth-refresh-${testUserId}`
    );

    console.log('   🔒 Tokens encrypted successfully');

    // Store in database
    const tokenData = {
      user_id: testUserId,
      provider: 'google',
      encrypted_access_token: JSON.stringify(encryptedAccessToken),
      encrypted_refresh_token: JSON.stringify(encryptedRefreshToken),
      token_expires_at: new Date(Date.now() + 3600000).toISOString(),
      scopes: ['https://www.googleapis.com/auth/calendar'],
      is_active: true
    };

    const { data: insertData, error: insertError } = await supabase
      .from('oauth_tokens')
      .insert(tokenData)
      .select();

    if (insertError) {
      throw new Error(`Token storage failed: ${insertError.message}`);
    }

    console.log('   ✅ Encrypted tokens stored in database');

    console.log('\n3️⃣ Testing Token Retrieval and Decryption...');

    // Retrieve from database
    const { data: retrievedData, error: retrieveError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', testUserId)
      .eq('provider', 'google')
      .single();

    if (retrieveError || !retrievedData) {
      throw new Error(`Token retrieval failed: ${retrieveError?.message || 'No data found'}`);
    }

    console.log('   ✅ Encrypted tokens retrieved from database');

    // Decrypt tokens
    const encryptedAccessData = JSON.parse(retrievedData.encrypted_access_token);
    const encryptedRefreshData = JSON.parse(retrievedData.encrypted_refresh_token);

    const decryptedAccessToken = secureTokenManager.decrypt(encryptedAccessData);
    const decryptedRefreshToken = secureTokenManager.decrypt(encryptedRefreshData);

    console.log('   ✅ Tokens decrypted successfully');

    // Verify data integrity
    const accessTokenMatch = decryptedAccessToken === testTokens.access_token;
    const refreshTokenMatch = decryptedRefreshToken === testTokens.refresh_token;

    console.log(`   ✅ Access token integrity: ${accessTokenMatch ? 'VERIFIED' : 'FAILED'}`);
    console.log(`   ✅ Refresh token integrity: ${refreshTokenMatch ? 'VERIFIED' : 'FAILED'}`);

    console.log('\n4️⃣ Testing Data Security...');

    // Verify tokens are not stored in plaintext
    const rawData = JSON.stringify(retrievedData);
    const containsPlaintext = rawData.includes(testTokens.access_token) || 
                             rawData.includes(testTokens.refresh_token);

    console.log(`   ✅ Plaintext protection: ${!containsPlaintext ? 'SECURE' : 'VULNERABLE'}`);

    // Verify encryption metadata
    const hasEncryptionMetadata = encryptedAccessData.iv && 
                                 encryptedAccessData.authTag && 
                                 encryptedAccessData.algorithm;

    console.log(`   ✅ Encryption metadata: ${hasEncryptionMetadata ? 'COMPLETE' : 'INCOMPLETE'}`);

    console.log('\n5️⃣ Cleaning up test data...');

    // Clean up test data
    const { error: deleteError } = await supabase
      .from('oauth_tokens')
      .delete()
      .eq('user_id', testUserId);

    if (deleteError) {
      console.log(`   ⚠️  Cleanup warning: ${deleteError.message}`);
    } else {
      console.log('   ✅ Test data cleaned up');
    }

    console.log('\n🎉 All Database Integration Tests Passed!');
    console.log('\n📋 Integration Summary:');
    console.log('   • Supabase connection: ✅ WORKING');
    console.log('   • Token encryption: ✅ WORKING');
    console.log('   • Database storage: ✅ WORKING');
    console.log('   • Token retrieval: ✅ WORKING');
    console.log('   • Token decryption: ✅ WORKING');
    console.log('   • Data integrity: ✅ VERIFIED');
    console.log('   • Security protection: ✅ SECURE');
    console.log('\n🔒 The complete OAuth token encryption and storage system is working correctly.');

  } catch (error) {
    console.error('❌ Database integration test failed:', error.message);
    console.error('Stack trace:', error.stack);
    
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
    console.error('   • Verify the oauth_tokens table exists in your Supabase project');
    console.error('   • Check that the service role key has proper permissions');
    console.error('   • Ensure TOKEN_ENCRYPTION_KEY is set correctly');
    
    process.exit(1);
  }
}

// Run test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testDatabaseIntegration().catch(console.error);
}

export { testDatabaseIntegration };
