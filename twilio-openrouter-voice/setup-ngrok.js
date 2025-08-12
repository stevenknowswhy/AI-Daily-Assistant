#!/usr/bin/env node

/**
 * JARVIS Ngrok Setup Script
 * =========================
 * 
 * This script helps set up ngrok for JARVIS voice assistant
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';

config();

console.log('🚀 JARVIS Ngrok Setup Script');
console.log('============================\n');

console.log('📋 Current Configuration:');
console.log(`Server Port: ${process.env.PORT || 3001}`);
console.log(`TwiML App SID: ${process.env.TWILIO_TWIML_APP_SID || 'Not set'}`);
console.log(`OpenRouter API Key: ${process.env.OPENROUTER_API_KEY ? 'Set' : 'Not set'}`);
console.log(`Twilio API Key: ${process.env.TWILIO_API_KEY || 'Not set'}\n`);

console.log('🔧 Next Steps:');
console.log('1. Make sure your server is running: npm start');
console.log('2. In another terminal, run: ngrok http 3001');
console.log('3. Copy the HTTPS URL from ngrok (e.g., https://abc123.ngrok.io)');
console.log('4. Update your TwiML App Voice URL to: https://your-ngrok-url.ngrok.io/webhook/voice');
console.log('5. Create a Twilio API Key and update your .env file');
console.log('6. Test JARVIS at: http://localhost:3001/jarvis-test\n');

console.log('🔑 Missing Configuration:');
if (!process.env.TWILIO_API_KEY || process.env.TWILIO_API_KEY === 'your_twilio_api_key_here') {
    console.log('❌ TWILIO_API_KEY - Create an API Key in Twilio Console');
}
if (!process.env.TWILIO_API_SECRET || process.env.TWILIO_API_SECRET === 'your_twilio_api_secret_here') {
    console.log('❌ TWILIO_API_SECRET - Get this when creating the API Key');
}
if (!process.env.OPENROUTER_API_KEY) {
    console.log('❌ OPENROUTER_API_KEY - Required for AI responses');
}

console.log('\n🌐 Starting ngrok automatically...');

// Start ngrok
const ngrok = spawn('ngrok', ['http', '3001'], {
    stdio: 'inherit'
});

ngrok.on('error', (error) => {
    console.error('❌ Failed to start ngrok:', error.message);
    console.log('\n💡 Try running manually: ngrok http 3001');
});

ngrok.on('close', (code) => {
    console.log(`\n🔚 ngrok exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping ngrok...');
    ngrok.kill();
    process.exit();
});
