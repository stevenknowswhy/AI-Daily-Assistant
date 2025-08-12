#!/usr/bin/env node

/**
 * Debug Device Connection Issues
 * ==============================
 * 
 * Diagnose why the Twilio Device is not reaching ready state
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import { config } from 'dotenv';

config();

const BASE_URL = 'http://localhost:3001';

async function debugDeviceConnection() {
    console.log('🔍 Debugging Twilio Device Connection');
    console.log('=====================================\n');

    try {
        // Test 1: Get and decode token
        console.log('🧪 Test 1: Token Analysis');
        const tokenResponse = await axios.get(`${BASE_URL}/twilio/token`);
        
        if (!tokenResponse.data.success) {
            console.log('❌ Token endpoint failed');
            return;
        }
        
        const token = tokenResponse.data.token;
        console.log('✅ Token received successfully');
        
        // Decode token to inspect contents
        const decoded = jwt.decode(token, { complete: true });
        console.log('📋 Token Details:');
        console.log(`   Issuer: ${decoded.payload.iss}`);
        console.log(`   Subject: ${decoded.payload.sub}`);
        console.log(`   Identity: ${decoded.payload.grants?.identity || 'Not set'}`);
        console.log(`   Voice Grant: ${decoded.payload.grants?.voice ? 'Present' : 'Missing'}`);
        
        if (decoded.payload.grants?.voice) {
            const voiceGrant = decoded.payload.grants.voice;
            console.log(`   Voice Grant Details:`, JSON.stringify(voiceGrant, null, 4));
            console.log(`   Outgoing App SID: ${voiceGrant.outgoing?.application_sid || 'Not set'}`);
            console.log(`   Incoming Allow: ${voiceGrant.incoming?.allow || false}`);
        }
        
        console.log('');

        // Test 2: Check TwiML App configuration
        console.log('🧪 Test 2: TwiML App Configuration');
        const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
        console.log(`   TwiML App SID: ${twimlAppSid}`);
        
        // Test 3: Check ngrok URL
        console.log('🧪 Test 3: ngrok Configuration');
        try {
            const ngrokResponse = await axios.get('http://localhost:4040/api/tunnels');
            const tunnels = ngrokResponse.data.tunnels;
            
            if (tunnels && tunnels.length > 0) {
                const httpsTunnel = tunnels.find(t => t.proto === 'https');
                if (httpsTunnel) {
                    console.log(`✅ ngrok HTTPS URL: ${httpsTunnel.public_url}`);
                    console.log(`   Expected TwiML URL: ${httpsTunnel.public_url}/webhook/voice`);
                    
                    // Test webhook endpoint
                    try {
                        const webhookTest = await axios.post(`${httpsTunnel.public_url}/webhook/voice`, {
                            CallSid: 'test-call-sid',
                            From: '+1234567890',
                            To: '+1234567890'
                        });
                        console.log('✅ Webhook endpoint accessible via ngrok');
                    } catch (error) {
                        console.log(`❌ Webhook endpoint not accessible: ${error.message}`);
                    }
                } else {
                    console.log('❌ No HTTPS tunnel found in ngrok');
                }
            } else {
                console.log('❌ No ngrok tunnels found');
            }
        } catch (error) {
            console.log(`❌ ngrok not accessible: ${error.message}`);
        }
        
        console.log('');

        // Test 4: Environment variables
        console.log('🧪 Test 4: Environment Variables');
        const requiredVars = [
            'TWILIO_ACCOUNT_SID',
            'TWILIO_API_KEY', 
            'TWILIO_API_SECRET',
            'TWILIO_TWIML_APP_SID'
        ];
        
        let allVarsPresent = true;
        for (const varName of requiredVars) {
            const value = process.env[varName];
            if (value && !value.includes('your_')) {
                console.log(`✅ ${varName}: Set`);
            } else {
                console.log(`❌ ${varName}: Missing or placeholder`);
                allVarsPresent = false;
            }
        }
        
        console.log('');

        // Test 5: Recommendations
        console.log('🔧 Recommendations:');
        
        if (!allVarsPresent) {
            console.log('❌ Fix missing environment variables first');
        }
        
        console.log('1. Ensure TwiML App Voice URL is set to your ngrok URL + /webhook/voice');
        console.log('2. Check browser console for additional error messages');
        console.log('3. Verify microphone permissions are granted');
        console.log('4. Try refreshing the JARVIS test page');
        
        console.log('\n🎯 Common Issues:');
        console.log('• TwiML App Voice URL not updated with current ngrok URL');
        console.log('• Browser blocking microphone access');
        console.log('• Firewall blocking WebRTC connections');
        console.log('• Token missing required grants');
        
        console.log('\n📋 Next Steps:');
        console.log('1. Update TwiML App Voice URL in Twilio Console');
        console.log('2. Refresh JARVIS test page');
        console.log('3. Check browser console for errors');
        console.log('4. Grant microphone permissions when prompted');

    } catch (error) {
        console.log(`❌ Debug failed: ${error.message}`);
    }
}

// Run the debug
debugDeviceConnection().catch(console.error);
