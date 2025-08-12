#!/usr/bin/env node

/**
 * Test JARVIS Unified Service
 * ===========================
 * 
 * Test script to verify the JARVIS unified service is working correctly
 */

import { config } from 'dotenv';
import { JarvisUnifiedService } from './src/services/jarvis-unified.js';
import { logger } from './src/utils/logger.js';

// Load environment variables
config();

async function testJarvisUnified() {
  console.log('🤖 Testing JARVIS Unified Service...\n');

  try {
    // Initialize JARVIS service
    const jarvis = new JarvisUnifiedService();
    
    console.log('✅ JARVIS Unified Service initialized');

    // Test 1: Health Status
    console.log('\n📊 Testing health status...');
    const healthStatus = await jarvis.getHealthStatus();
    console.log('Health Status:', JSON.stringify(healthStatus, null, 2));

    // Test 2: Authentication Status
    console.log('\n🔐 Testing authentication status...');
    const authStatus = await jarvis.checkAuthentication();
    console.log('Authentication Status:', JSON.stringify(authStatus, null, 2));

    // Test 3: Basic conversation
    console.log('\n💬 Testing basic conversation...');
    const basicResponse = await jarvis.processRequest(
      "Hello JARVIS, how are you today?",
      [],
      'test-call-1',
      '+14158552745'
    );
    console.log('Basic Response:', JSON.stringify(basicResponse, null, 2));

    // Test 4: Calendar request (if authenticated)
    if (authStatus.calendar) {
      console.log('\n📅 Testing calendar request...');
      const calendarResponse = await jarvis.processRequest(
        "What's on my calendar today?",
        [],
        'test-call-2',
        '+14158552745'
      );
      console.log('Calendar Response:', JSON.stringify(calendarResponse, null, 2));
    } else {
      console.log('\n📅 Skipping calendar test - not authenticated');
    }

    // Test 5: Email request (if authenticated)
    if (authStatus.gmail) {
      console.log('\n📧 Testing email request...');
      const emailResponse = await jarvis.processRequest(
        "Check my recent emails",
        [],
        'test-call-3',
        '+14158552745'
      );
      console.log('Email Response:', JSON.stringify(emailResponse, null, 2));
    } else {
      console.log('\n📧 Skipping email test - not authenticated');
    }

    // Test 6: Bills request
    console.log('\n💰 Testing bills request...');
    const billsResponse = await jarvis.processRequest(
      "What bills are due soon?",
      [],
      'test-call-4',
      '+14158552745'
    );
    console.log('Bills Response:', JSON.stringify(billsResponse, null, 2));

    // Test 7: Daily briefing request
    console.log('\n📋 Testing daily briefing request...');
    const briefingResponse = await jarvis.processRequest(
      "Give me my daily briefing",
      [],
      'test-call-5',
      '+14158552745'
    );
    console.log('Briefing Response:', JSON.stringify(briefingResponse, null, 2));

    console.log('\n✅ All JARVIS Unified Service tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run tests
testJarvisUnified().catch(error => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
