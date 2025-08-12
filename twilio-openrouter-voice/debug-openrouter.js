#!/usr/bin/env node

/**
 * Debug OpenRouter Models
 * =======================
 *
 * Test script to debug OpenRouter model availability and API issues
 */

import { OpenRouterService } from './src/services/openrouter.js';
import { config } from 'dotenv';

config();

async function debugOpenRouter() {
  console.log('🔍 Debugging OpenRouter Model Issues...\n');

  const openRouter = new OpenRouterService();

  console.log('📋 Configuration:');
  console.log(`Primary Model: ${openRouter.primaryModel}`);
  console.log(`Fallback Model: ${openRouter.fallbackModel}`);
  console.log(`API Key: ${openRouter.apiKey.substring(0, 20)}...`);
  console.log(`Base URL: ${openRouter.baseURL}\n`);

  // Test connection and list models
  console.log('🔗 Testing connection and listing models...');
  const connectionTest = await openRouter.testConnection();
  console.log('Connection Test Result:', connectionTest);

  if (connectionTest.success) {
    console.log(`\n📊 Models Available: ${connectionTest.modelsAvailable}`);
    console.log(`Primary Model Available: ${connectionTest.primaryModelAvailable}`);
    console.log(`Fallback Model Available: ${connectionTest.fallbackModelAvailable}`);
  }

  // Test primary model directly
  console.log('\n🧪 Testing Primary Model Directly...');
  try {
    const testMessages = [
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: 'Say hello in one word.' }
    ];

    const primaryResult = await openRouter.callModel(
      openRouter.primaryModel,
      testMessages,
      'debug-test'
    );

    if (primaryResult) {
      console.log('✅ Primary model test successful:', primaryResult);
    } else {
      console.log('❌ Primary model test failed');

      // Test fallback model
      console.log('\n🔄 Testing Fallback Model...');
      const fallbackResult = await openRouter.callModel(
        openRouter.fallbackModel,
        testMessages,
        'debug-test'
      );

      if (fallbackResult) {
        console.log('✅ Fallback model test successful:', fallbackResult);
      } else {
        console.log('❌ Fallback model test also failed');
      }
    }
  } catch (error) {
    console.error('❌ Model test error:', error.message);
  }

  // Test full generateResponse method
  console.log('\n🎯 Testing Full Generate Response Method...');
  try {
    const response = await openRouter.generateResponse(
      'Hello, how are you?',
      [],
      'debug-test'
    );
    console.log('Generate Response Result:', response);
  } catch (error) {
    console.error('❌ Generate response error:', error.message);
  }
}

debugOpenRouter().catch(console.error);