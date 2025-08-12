#!/usr/bin/env node

/**
 * Test Twilio SDK Fix
 * ===================
 * 
 * Verify that the Twilio SDK loading issue has been resolved
 */

import axios from 'axios';
import { config } from 'dotenv';

config();

const BASE_URL = 'http://localhost:3001';

async function testTwilioFix() {
    console.log('🔧 Testing Twilio SDK Fix');
    console.log('=========================\n');

    const tests = [
        { name: 'Local Twilio SDK File', test: testLocalTwilioFile },
        { name: 'JARVIS Test Page', test: testJarvisPage },
        { name: 'Token Endpoint', test: testTokenEndpoint },
        { name: 'Complete System', test: testCompleteSystem }
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
        console.log('🎉 All tests passed! Twilio SDK issue has been resolved!');
        console.log('🚀 JARVIS is ready for voice interaction!');
        console.log('');
        console.log('📋 Next Steps:');
        console.log('   1. Visit: http://localhost:3001/jarvis-test');
        console.log('   2. Click "Connect to JARVIS"');
        console.log('   3. Click the microphone button');
        console.log('   4. Say "Hello JARVIS"');
        console.log('   5. Listen for his response!');
    } else {
        console.log('⚠️  Some tests failed. Check the issues above.');
    }
}

async function testLocalTwilioFile() {
    try {
        const response = await axios.head(`${BASE_URL}/js/twilio-voice.min.js`);
        if (response.status === 200) {
            const contentLength = response.headers['content-length'];
            return {
                success: true,
                message: `Local Twilio SDK file accessible (${contentLength} bytes)`
            };
        } else {
            return {
                success: false,
                message: `Unexpected status: ${response.status}`
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `Local Twilio SDK file not accessible: ${error.message}`
        };
    }
}

async function testJarvisPage() {
    try {
        const response = await axios.get(`${BASE_URL}/jarvis-test`);
        const hasLocalScript = response.data.includes('/js/twilio-voice.min.js');
        const hasVoiceClient = response.data.includes('/js/voice-client.js');
        
        if (hasLocalScript && hasVoiceClient) {
            return {
                success: true,
                message: 'JARVIS page updated with local Twilio SDK'
            };
        } else {
            return {
                success: false,
                message: 'JARVIS page missing required scripts'
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `JARVIS page failed to load: ${error.message}`
        };
    }
}

async function testTokenEndpoint() {
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

async function testCompleteSystem() {
    try {
        // Test all components together
        const healthResponse = await axios.get(`${BASE_URL}/health`);
        const tokenResponse = await axios.get(`${BASE_URL}/twilio/token`);
        const pageResponse = await axios.get(`${BASE_URL}/jarvis-test`);
        const sdkResponse = await axios.head(`${BASE_URL}/js/twilio-voice.min.js`);
        
        const allWorking = 
            healthResponse.status === 200 &&
            tokenResponse.data.success &&
            pageResponse.data.includes('/js/twilio-voice.min.js') &&
            sdkResponse.status === 200;
        
        if (allWorking) {
            return {
                success: true,
                message: 'All system components working together'
            };
        } else {
            return {
                success: false,
                message: 'Some system components not working properly'
            };
        }
    } catch (error) {
        return {
            success: false,
            message: `System test failed: ${error.message}`
        };
    }
}

// Run the tests
testTwilioFix().catch(console.error);
