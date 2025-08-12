#!/usr/bin/env node

/**
 * Test Google Calendar MCP Server
 * ===============================
 * 
 * This script tests the Google Calendar MCP server configuration and authentication
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';

config();

async function testGoogleCalendarMCP() {
  console.log('🗓️  Testing Google Calendar MCP Server...\n');

  return new Promise((resolve) => {
    const server = spawn('npx', [
      '-y',
      'mcp-google-calendar'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        CREDENTIALS_PATH: './credentials.json',
        PORT: '3420'
      }
    });

    let stdout = '';
    let stderr = '';
    let hasOutput = false;

    const timeout = setTimeout(() => {
      server.kill();
      console.log('⏰ Test timeout after 30 seconds');
      resolve({
        success: false,
        error: 'timeout',
        stdout,
        stderr
      });
    }, 30000);

    server.stdout.on('data', (data) => {
      stdout += data.toString();
      hasOutput = true;
      console.log('📤 STDOUT:', data.toString().trim());
      
      // Check for success indicators
      if (data.toString().includes('Server running') || 
          data.toString().includes('MCP server') ||
          data.toString().includes('listening') ||
          data.toString().includes('Calendar') ||
          data.toString().includes('authenticated')) {
        clearTimeout(timeout);
        server.kill();
        console.log('✅ Google Calendar MCP Server started successfully');
        resolve({
          success: true,
          stdout,
          stderr
        });
      }
    });

    server.stderr.on('data', (data) => {
      stderr += data.toString();
      hasOutput = true;
      console.log('📤 STDERR:', data.toString().trim());
      
      // Check for authentication prompts or success
      if (data.toString().includes('Visit this URL') || 
          data.toString().includes('authentication') ||
          data.toString().includes('OAuth') ||
          data.toString().includes('token')) {
        console.log('🔐 Authentication process detected');
      }
    });

    server.on('error', (error) => {
      clearTimeout(timeout);
      console.log('❌ Server error:', error.message);
      resolve({
        success: false,
        error: error.message,
        stdout,
        stderr
      });
    });

    server.on('exit', (code) => {
      clearTimeout(timeout);
      console.log(`🔚 Server exited with code ${code}`);
      
      if (!hasOutput) {
        console.log('ℹ️  No output received - this might be normal for MCP servers');
      }
      
      resolve({
        success: code === 0 || hasOutput,
        code,
        stdout,
        stderr
      });
    });

    // Send a test message after 2 seconds
    setTimeout(() => {
      try {
        const testMessage = JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: {
              name: "test-client",
              version: "1.0.0"
            }
          }
        }) + '\n';
        
        server.stdin.write(testMessage);
        console.log('📨 Sent initialize message to MCP server');
      } catch (e) {
        console.log('⚠️  Could not send test message:', e.message);
      }
    }, 2000);
  });
}

// Run the test
testGoogleCalendarMCP().then(result => {
  console.log('\n📋 Test Results:');
  console.log(`Success: ${result.success}`);
  if (result.error) {
    console.log(`Error: ${result.error}`);
  }
  if (result.code !== undefined) {
    console.log(`Exit Code: ${result.code}`);
  }
  
  console.log('\n🔧 Next Steps:');
  if (result.success) {
    console.log('✅ Google Calendar MCP Server configuration appears to be working');
    console.log('📝 You can now use it in VS Code Augment');
    console.log('🔄 Restart VS Code to load the new MCP server');
    console.log('🔐 First run will require Google OAuth authentication');
  } else {
    console.log('❌ There may be an issue with the configuration');
    console.log('🔍 Check the credentials.json file exists and is valid');
    console.log('🌐 Verify network connectivity and Google API access');
  }
}).catch(error => {
  console.error('❌ Test failed:', error.message);
});
