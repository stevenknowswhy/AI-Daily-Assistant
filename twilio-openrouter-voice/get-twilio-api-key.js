#!/usr/bin/env node

/**
 * Twilio API Key Generator
 * ========================
 *
 * This script helps you create a Twilio API Key and Secret for the MCP server
 */

import twilio from 'twilio';
import { config } from 'dotenv';

config({ path: '../.env' });

async function createTwilioAPIKey() {
  try {
    console.log('🔑 Creating Twilio API Key for MCP Server...\n');

    // Use the credentials from environment variables
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      console.log('❌ Missing Twilio credentials in environment variables');
      console.log('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in your .env file');
      return;
    }

    const client = twilio(accountSid, authToken);

    // Create a new API Key
    const apiKey = await client.newKeys.create({
      friendlyName: 'AI Daily Assistant MCP Server Key'
    });

    console.log('✅ Twilio API Key created successfully!');
    console.log('\n📋 API Key Details:');
    console.log(`   SID: ${apiKey.sid}`);
    console.log(`   Secret: ${apiKey.secret}`);
    console.log(`   Friendly Name: ${apiKey.friendlyName}`);
    console.log(`   Date Created: ${apiKey.dateCreated}`);

    console.log('\n🔧 MCP Server Configuration:');
    console.log('Update your .vscode/augment-mcp-config.json with:');
    console.log(`"${accountSid}/${apiKey.sid}:${apiKey.secret}"`);

    console.log('\n📝 Complete Configuration:');
    const mcpConfig = {
      "twilio-mcp-server": {
        "command": "npx",
        "args": [
          "-y",
          "@twilio-alpha/mcp",
          `${accountSid}/${apiKey.sid}:${apiKey.secret}`,
          "--services",
          "twilio_api_v2010,twilio_voice_v1"
        ],
        "description": "Twilio MCP Server - Official Twilio API integration",
        "enabled": true,
        "autoRestart": true,
        "timeout": 45000,
        "maxRetries": 3
      }
    };

    console.log(JSON.stringify(mcpConfig, null, 2));

    return {
      accountSid,
      apiKeySid: apiKey.sid,
      apiKeySecret: apiKey.secret,
      authString: `${accountSid}/${apiKey.sid}:${apiKey.secret}`
    };

  } catch (error) {
    console.error('❌ Error creating Twilio API Key:', error.message);
    return null;
  }
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  createTwilioAPIKey();
}

export { createTwilioAPIKey };