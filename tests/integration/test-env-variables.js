#!/usr/bin/env node

/**
 * Environment Variables Test
 * ==========================
 * 
 * This script tests that environment variables are properly configured
 * for both frontend (VITE_) and backend usage.
 */

import { config } from 'dotenv';

// Load environment variables
config();

console.log('🧪 Testing Environment Variables Configuration...\n');

// Test backend environment variables
console.log('1️⃣ Backend Environment Variables (process.env):');
const backendVars = [
  'GOOGLE_CLIENT_SECRET',
  'GOOGLE_API_KEY', 
  'SUPABASE_SERVICE_ROLE_KEY',
  'CLERK_SECRET_KEY',
  'RETELL_API_KEY',
  'ENCRYPTION_KEY'
];

let backendSuccess = true;
backendVars.forEach(varName => {
  const value = process.env[varName];
  if (value && !value.includes('your_') && !value.includes('YOUR_')) {
    console.log(`   ✅ ${varName}: Set (${value.length} chars)`);
  } else {
    console.log(`   ⚠️  ${varName}: Missing or placeholder`);
    if (varName === 'GOOGLE_CLIENT_SECRET' || varName === 'ENCRYPTION_KEY') {
      backendSuccess = false;
    }
  }
});

console.log('\n2️⃣ Frontend Environment Variables (VITE_ prefix):');
const frontendVars = [
  'VITE_API_BASE_URL',
  'VITE_CLERK_PUBLISHABLE_KEY',
  'VITE_GOOGLE_CLIENT_ID',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY'
];

let frontendSuccess = true;
frontendVars.forEach(varName => {
  const value = process.env[varName];
  if (value && !value.includes('your_') && !value.includes('YOUR_')) {
    console.log(`   ✅ ${varName}: Set (${value.substring(0, 30)}...)`);
  } else {
    console.log(`   ⚠️  ${varName}: Missing or placeholder`);
    frontendSuccess = false;
  }
});

console.log('\n3️⃣ Security Check - No secrets with VITE_ prefix:');
const sensitivePatterns = ['SECRET', 'PRIVATE', 'SERVICE_ROLE'];
let securityIssues = [];

Object.keys(process.env).forEach(key => {
  if (key.startsWith('VITE_')) {
    sensitivePatterns.forEach(pattern => {
      if (key.includes(pattern)) {
        securityIssues.push(key);
      }
    });
  }
});

if (securityIssues.length === 0) {
  console.log('   ✅ No sensitive secrets exposed with VITE_ prefix');
} else {
  console.log('   ❌ Security issues found:');
  securityIssues.forEach(key => {
    console.log(`      - ${key} (should not have VITE_ prefix)`);
  });
}

console.log('\n📋 Summary:');
console.log(`   Backend Variables: ${backendSuccess ? '✅ Ready' : '⚠️  Needs configuration'}`);
console.log(`   Frontend Variables: ${frontendSuccess ? '✅ Ready' : '⚠️  Needs configuration'}`);
console.log(`   Security: ${securityIssues.length === 0 ? '✅ Secure' : '❌ Issues found'}`);

if (backendSuccess && frontendSuccess && securityIssues.length === 0) {
  console.log('\n🎉 Environment variables are properly configured!');
  process.exit(0);
} else {
  console.log('\n⚠️  Some environment variables need attention.');
  console.log('   See .env.template and docs/ENVIRONMENT_VARIABLES.md for guidance.');
  process.exit(1);
}
