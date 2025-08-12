#!/usr/bin/env node

/**
 * JARVIS Setup Test Script
 * ========================
 * 
 * Tests all components needed for JARVIS voice assistant
 */

import axios from 'axios';
import { config } from 'dotenv';

config();

const BASE_URL = 'http://localhost:3001';

async function testJarvisSetup() {
    console.log('🤖 JARVIS Setup Test');
    console.log('===================\n');

    const tests = [
        { name: 'Server Health Check', test: testServerHealth },
        { name: 'Environment Variables', test: testEnvironmentVariables },
        { name: 'Twilio Token Endpoint', test: testTwilioToken },
        { name: 'JARVIS Test Page', test: testJarvisPage },
        { name: 'OpenRouter Connection', test: testOpenRouterConnection },
        { name: 'Webhook Endpoint', test: testWebhookEndpoint }
    ];

    let passed = 0;
    let failed = 0;

    for (const test of tests) {
        try {
            console.log(`🧪 Testing: ${test.name}`);
            const result = await test.test();
            if (result.success) {
                console.log(`✅ ${test.name}: PASSED`);
                if (result.message) console.log(`   ${result.message}`);
                passed++;
            } else {
                console.log(`❌ ${test.name}: FAILED`);
                console.log(`   ${result.message}`);
                failed++;
            }
        } catch (error) {
            console.log(`❌ ${test.name}: ERROR`);
            console.log(`   ${error.message}`);
            failed++;
        }
        console.log('');
    }

    console.log('📊 Test Summary');
    console.log('===============');
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

    if (failed === 0) {
        console.log('🎉 All tests passed! JARVIS is ready for voice interaction!');
        console.log('🚀 Next steps:');
        console.log('   1. Start ngrok: ngrok http 3001');
        console.log('   2. Update TwiML App Voice URL with ngrok URL');
        console.log('   3. Visit: http://localhost:3001/jarvis-test');
        console.log('   4. Start talking to JARVIS!');
    } else {
        console.log('⚠️  Some tests failed. Please check the setup guide.');
        console.log('📖 See: COMPLETE_SETUP_GUIDE.md');
    }
}

async function testServerHealth() {
    try {
        const response = await axios.get(`${BASE_URL}/health`);
        return {
            success: response.status === 200,
            message: `Server responding on port 3001`
        };
    } catch (error) {
        return {
            success: false,
            message: `Server not responding: ${error.message}`
        };
    }
}

async function testEnvironmentVariables() {
    const required = [
        'TWILIO_ACCOUNT_SID',
        'TWILIO_AUTH_TOKEN',
        'TWILIO_TWIML_APP_SID',
        'OPENROUTER_API_KEY'
    ];

    const missing = required.filter(key => !process.env[key]);
    const needsUpdate = [
        'TWILIO_API_KEY',
        'TWILIO_API_SECRET'
    ].filter(key => !process.env[key] || process.env[key].includes('your_'));

    if (missing.length > 0) {
        return {
            success: false,
            message: `Missing required variables: ${missing.join(', ')}`
        };
    }

    if (needsUpdate.length > 0) {
        return {
            success: false,
            message: `Need to update: ${needsUpdate.join(', ')} (still has placeholder values)`
        };
    }

    return {
        success: true,
        message: 'All required environment variables are set'
    };
}

async function testTwilioToken() {
    try {
        const response = await axios.get(`${BASE_URL}/twilio/token`);
        if (response.data.success && response.data.token) {
            return {
                success: true,
                message: 'Token endpoint working correctly'
            };
        } else {
            return {
                success: false,
                message: 'Token endpoint returned invalid response'
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `Token endpoint failed: ${error.response?.data?.message || error.message}`
        };
    }
}

async function testJarvisPage() {
    try {
        const response = await axios.get(`${BASE_URL}/jarvis-test`);
        const hasJarvisTitle = response.data.includes('JARVIS Web Voice Assistant');
        const hasTwilioSDK = response.data.includes('twilio-voice.min.js');
        
        if (hasJarvisTitle && hasTwilioSDK) {
            return {
                success: true,
                message: 'JARVIS test page loaded with Twilio SDK'
            };
        } else {
            return {
                success: false,
                message: 'JARVIS test page missing required components'
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `JARVIS test page failed to load: ${error.message}`
        };
    }
}

async function testOpenRouterConnection() {
    try {
        const response = await axios.get(`${BASE_URL}/test/openrouter`);
        if (response.data.success) {
            return {
                success: true,
                message: `OpenRouter connected (${response.data.modelsAvailable} models available)`
            };
        } else {
            return {
                success: false,
                message: `OpenRouter connection failed: ${response.data.error}`
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `OpenRouter test failed: ${error.message}`
        };
    }
}

async function testWebhookEndpoint() {
    try {
        // Test webhook endpoint exists (it will return TwiML even without proper Twilio request)
        const response = await axios.post(`${BASE_URL}/webhook/voice`, {
            CallSid: 'test-call-sid',
            From: '+1234567890',
            To: '+1234567890'
        });
        
        const isTwiML = response.data.includes('<Response>') || response.data.includes('<?xml');
        
        if (isTwiML) {
            return {
                success: true,
                message: 'Webhook endpoint responding with TwiML'
            };
        } else {
            return {
                success: false,
                message: 'Webhook endpoint not returning valid TwiML'
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `Webhook endpoint failed: ${error.message}`
        };
    }
}

// Run the tests
testJarvisSetup().catch(console.error);
