#!/usr/bin/env node

/**
 * Supabase Connection Test
 * ========================
 *
 * This script tests the Supabase database connection and authentication
 * for the AI Daily Assistant project.
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config();

console.log('🧪 Testing Supabase Connection for AI Daily Assistant...\n');

// Test configuration
function testConfiguration() {
  console.log('1️⃣ Testing Configuration...');

  const requiredVars = [
    'SUPABASE_URL',
    'SUPABASE_PROJECT_ID',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  let allConfigured = true;

  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      console.log(`   ❌ ${varName}: Not configured`);
      allConfigured = false;
    } else {
      console.log(`   ✅ ${varName}: Configured`);
      if (varName === 'SUPABASE_URL') {
        console.log(`      URL: ${value}`);
      } else if (varName === 'SUPABASE_PROJECT_ID') {
        console.log(`      Project ID: ${value}`);
      } else {
        console.log(`      Key: ${value.substring(0, 20)}...`);
      }
    }
  });

  return allConfigured;
}

// Test anonymous client connection
async function testAnonymousConnection() {
  console.log('\n2️⃣ Testing Anonymous Client Connection...');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test basic connection
    const { data, error } = await supabase
      .from('_supabase_migrations')
      .select('version')
      .limit(1);

    if (error) {
      console.log(`   ⚠️  Connection test: ${error.message}`);
      return false;
    } else {
      console.log('   ✅ Anonymous client connected successfully');
      return true;
    }
  } catch (error) {
    console.log(`   ❌ Connection failed: ${error.message}`);
    return false;
  }
}

// Test service role connection
async function testServiceRoleConnection() {
  console.log('\n3️⃣ Testing Service Role Connection...');

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Test admin connection
    const { data, error } = await supabaseAdmin
      .from('_supabase_migrations')
      .select('version')
      .limit(1);

    if (error) {
      console.log(`   ⚠️  Service role test: ${error.message}`);
      return false;
    } else {
      console.log('   ✅ Service role client connected successfully');
      return true;
    }
  } catch (error) {
    console.log(`   ❌ Service role connection failed: ${error.message}`);
    return false;
  }
}

// Test authentication
async function testAuthentication() {
  console.log('\n4️⃣ Testing Authentication...');

  try {
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    );

    // Test auth session
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      console.log(`   ⚠️  Auth test error: ${error.message}`);
      return false;
    } else {
      console.log('   ✅ Authentication system accessible');
      console.log(`   📋 Current session: ${session ? 'Active' : 'None (expected for test)'}`);
      return true;
    }
  } catch (error) {
    console.log(`   ❌ Authentication test failed: ${error.message}`);
    return false;
  }
}

// Test database schema (check if tables exist)
async function testDatabaseSchema() {
  console.log('\n5️⃣ Testing Database Schema...');

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // Check for auth schema (should exist by default)
    const { data, error } = await supabaseAdmin
      .rpc('get_schema_tables', { schema_name: 'auth' });

    if (error) {
      console.log(`   ⚠️  Schema test: ${error.message}`);
      console.log('   📋 This is expected if custom RPC functions are not yet created');

      // Try alternative method - check auth.users table
      const { data: authData, error: authError } = await supabaseAdmin
        .from('auth.users')
        .select('id')
        .limit(1);

      if (authError) {
        console.log(`   ⚠️  Auth schema test: ${authError.message}`);
        return false;
      } else {
        console.log('   ✅ Auth schema accessible');
        return true;
      }
    } else {
      console.log('   ✅ Database schema accessible');
      console.log(`   📋 Found ${data?.length || 0} tables in auth schema`);
      return true;
    }
  } catch (error) {
    console.log(`   ❌ Schema test failed: ${error.message}`);
    return false;
  }
}

// Generate connection report
function generateConnectionReport(results) {
  console.log('\n📋 Supabase Connection Test Report');
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
    console.log('\n🎉 All tests passed! Supabase is properly configured.');
    console.log('\nNext steps:');
    console.log('1. Create database tables as outlined in TECHNICAL_IMPLEMENTATION_GUIDE.md');
    console.log('2. Set up Row Level Security (RLS) policies');
    console.log('3. Deploy Supabase Edge Functions');
    console.log('4. Test end-to-end authentication flow');
  } else {
    console.log('\n⚠️  Some tests failed. Please review the issues above.');
    console.log('Refer to the Supabase documentation for troubleshooting.');
  }

  console.log('\n🔗 Supabase Dashboard:');
  console.log(`   https://supabase.com/dashboard/project/${process.env.SUPABASE_PROJECT_ID}`);
}

// Main test execution
async function runSupabaseTests() {
  const results = {
    'Configuration': testConfiguration(),
    'Anonymous Connection': await testAnonymousConnection(),
    'Service Role Connection': await testServiceRoleConnection(),
    'Authentication': await testAuthentication(),
    'Database Schema': await testDatabaseSchema()
  };

  generateConnectionReport(results);
}

// Check for required dependencies
try {
  // Run the tests
  runSupabaseTests().catch(error => {
    console.error('❌ Test execution failed:', error.message);
    console.log('\n💡 Make sure to install dependencies:');
    console.log('   npm install @supabase/supabase-js dotenv');
    process.exit(1);
  });
} catch (error) {
  console.error('❌ Failed to start tests:', error.message);
  console.log('\n💡 Make sure to install dependencies:');
  console.log('   npm install @supabase/supabase-js dotenv');
  process.exit(1);
}