#!/usr/bin/env node

/**
 * MCP Servers Test Suite
 * ======================
 *
 * This script tests all three MCP servers configured for the AI Daily Assistant project:
 * - Supabase MCP Server (database operations)
 * - Clerk MCP Server (authentication)
 * - RetellAI MCP Server (voice integration)
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import fs from 'fs';
import path from 'path';

config();

console.log('🧪 Testing MCP Servers for AI Daily Assistant...\n');

class MCPServerTester {
  constructor() {
    this.testResults = {
      supabase: { status: 'pending', errors: [], details: {} },
      clerk: { status: 'pending', errors: [], details: {} },
      retellai: { status: 'pending', errors: [], details: {} }
    };
  }

  // Test if required files exist
  checkPrerequisites() {
    console.log('1️⃣ Checking Prerequisites...');

    const checks = [
      {
        name: 'VS Code MCP Config',
        path: '.vscode/augment-mcp-config.json',
        required: true
      },
      {
        name: 'Clerk MCP Server Build',
        path: 'clerk-mcp-server/dist/clerk-mcp-server.js',
        required: true
      },
      {
        name: 'Clerk MCP Package.json',
        path: 'clerk-mcp-server/package.json',
        required: true
      },
      {
        name: 'Main Environment File',
        path: '.env',
        required: false
      }
    ];

    let allGood = true;

    checks.forEach(check => {
      if (fs.existsSync(check.path)) {
        console.log(`   ✅ ${check.name}: Found`);
      } else {
        console.log(`   ${check.required ? '❌' : '⚠️'} ${check.name}: Missing`);
        if (check.required) allGood = false;
      }
    });

    return allGood;
  }

  // Check MCP configuration syntax
  checkMCPConfig() {
    console.log('\n2️⃣ Checking MCP Configuration...');

    try {
      const configPath = '.vscode/augment-mcp-config.json';
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);

      console.log('   ✅ MCP config JSON is valid');

      // Check each server configuration
      const servers = ['retellai-mcp-server', 'supabase-mcp-server', 'clerk-mcp-server'];

      servers.forEach(serverName => {
        if (config.mcpServers && config.mcpServers[serverName]) {
          console.log(`   ✅ ${serverName}: Configuration found`);

          const serverConfig = config.mcpServers[serverName];

          // Check for placeholder values
          if (serverConfig.env) {
            Object.entries(serverConfig.env).forEach(([key, value]) => {
              if (typeof value === 'string' && value.includes('your-') && value.includes('-here')) {
                console.log(`   ⚠️  ${serverName}: ${key} has placeholder value`);
              }
            });
          }
        } else {
          console.log(`   ❌ ${serverName}: Configuration missing`);
        }
      });

      return config;
    } catch (error) {
      console.log(`   ❌ MCP config error: ${error.message}`);
      return null;
    }
  }

  // Test individual MCP server by spawning it
  async testMCPServer(serverName, command, args, env = {}) {
    return new Promise((resolve) => {
      console.log(`\n🧪 Testing ${serverName}...`);

      const serverProcess = spawn(command, args, {
        env: { ...process.env, ...env },
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';
      let hasResponded = false;

      // Set timeout for server startup
      const timeout = setTimeout(() => {
        if (!hasResponded) {
          serverProcess.kill();
          resolve({
            success: false,
            error: 'Server startup timeout (30 seconds)',
            stdout,
            stderr
          });
        }
      }, 30000);

      serverProcess.stdout.on('data', (data) => {
        stdout += data.toString();

        // Look for signs that the server is running
        if (stdout.includes('running') || stdout.includes('listening') || stdout.includes('started')) {
          if (!hasResponded) {
            hasResponded = true;
            clearTimeout(timeout);
            serverProcess.kill();
            resolve({
              success: true,
              stdout,
              stderr
            });
          }
        }
      });

      serverProcess.stderr.on('data', (data) => {
        stderr += data.toString();

        // Some servers log to stderr normally
        if (stderr.includes('running') || stderr.includes('listening') || stderr.includes('started')) {
          if (!hasResponded) {
            hasResponded = true;
            clearTimeout(timeout);
            serverProcess.kill();
            resolve({
              success: true,
              stdout,
              stderr
            });
          }
        }
      });

      serverProcess.on('error', (error) => {
        if (!hasResponded) {
          hasResponded = true;
          clearTimeout(timeout);
          resolve({
            success: false,
            error: error.message,
            stdout,
            stderr
          });
        }
      });

      serverProcess.on('exit', (code) => {
        if (!hasResponded) {
          hasResponded = true;
          clearTimeout(timeout);
          resolve({
            success: code === 0,
            error: code !== 0 ? `Process exited with code ${code}` : null,
            stdout,
            stderr
          });
        }
      });

      // Send a simple test message to see if server responds
      setTimeout(() => {
        try {
          serverProcess.stdin.write('{"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {}}\n');
        } catch (error) {
          // Ignore write errors
        }
      }, 1000);
    });
  }

  // Test RetellAI MCP Server
  async testRetellAI() {
    console.log('\n🗣️ Testing RetellAI MCP Server...');

    const result = await this.testMCPServer(
      'RetellAI',
      'npx',
      ['-y', '@abhaybabbar/retellai-mcp-server'],
      {
        RETELL_API_KEY: 'key_5e644ad04c0a5276fd6c9c83c495',
        NODE_ENV: 'production'
      }
    );

    if (result.success) {
      console.log('   ✅ RetellAI MCP Server started successfully');
      this.testResults.retellai.status = 'success';
    } else {
      console.log(`   ❌ RetellAI MCP Server failed: ${result.error}`);
      this.testResults.retellai.status = 'failed';
      this.testResults.retellai.errors.push(result.error);

      if (result.stderr) {
        console.log(`   📋 Error details: ${result.stderr.substring(0, 200)}...`);
      }
    }

    return result;
  }

  // Test Supabase MCP Server
  async testSupabase() {
    console.log('\n🗄️ Testing Supabase MCP Server...');

    // Check if we have a real access token
    const accessToken = process.env.SUPABASE_ACCESS_TOKEN || 'your-supabase-personal-access-token-here';

    if (accessToken.includes('your-') && accessToken.includes('-here')) {
      console.log('   ⚠️  Using placeholder Supabase access token');
      console.log('   📋 To test properly, set SUPABASE_ACCESS_TOKEN environment variable');
      this.testResults.supabase.status = 'skipped';
      this.testResults.supabase.errors.push('No valid access token provided');
      return { success: false, error: 'No valid access token' };
    }

    const result = await this.testMCPServer(
      'Supabase',
      'npx',
      ['-y', '@supabase/mcp-server-supabase@latest', '--read-only', '--project-ref=bunpgmxgectzjiqbwvwg'],
      {
        SUPABASE_ACCESS_TOKEN: accessToken
      }
    );

    if (result.success) {
      console.log('   ✅ Supabase MCP Server started successfully');
      this.testResults.supabase.status = 'success';
    } else {
      console.log(`   ❌ Supabase MCP Server failed: ${result.error}`);
      this.testResults.supabase.status = 'failed';
      this.testResults.supabase.errors.push(result.error);

      if (result.stderr) {
        console.log(`   📋 Error details: ${result.stderr.substring(0, 200)}...`);
      }
    }

    return result;
  }

  // Test Clerk MCP Server
  async testClerk() {
    console.log('\n🔐 Testing Clerk MCP Server...');

    // Check if we have a real secret key
    const secretKey = process.env.CLERK_SECRET_KEY || 'your-clerk-secret-key-here';

    if (secretKey.includes('your-') && secretKey.includes('-here')) {
      console.log('   ⚠️  Using placeholder Clerk secret key');
      console.log('   📋 To test properly, set CLERK_SECRET_KEY environment variable');
      this.testResults.clerk.status = 'skipped';
      this.testResults.clerk.errors.push('No valid secret key provided');
      return { success: false, error: 'No valid secret key' };
    }

    const result = await this.testMCPServer(
      'Clerk',
      'node',
      ['./clerk-mcp-server/dist/clerk-mcp-server.js'],
      {
        CLERK_SECRET_KEY: secretKey,
        CLERK_PUBLISHABLE_KEY: 'pk_test_bW9yYWwtbHlueC0xNi5jbGVyay5hY2NvdW50cy5kZXYk'
      }
    );

    if (result.success) {
      console.log('   ✅ Clerk MCP Server started successfully');
      this.testResults.clerk.status = 'success';
    } else {
      console.log(`   ❌ Clerk MCP Server failed: ${result.error}`);
      this.testResults.clerk.status = 'failed';
      this.testResults.clerk.errors.push(result.error);

      if (result.stderr) {
        console.log(`   📋 Error details: ${result.stderr.substring(0, 200)}...`);
      }
    }

    return result;
  }

  // Generate test report
  generateReport() {
    console.log('\n📋 MCP Servers Test Report');
    console.log('=' .repeat(50));

    const servers = [
      { name: 'RetellAI', key: 'retellai', icon: '🗣️' },
      { name: 'Supabase', key: 'supabase', icon: '🗄️' },
      { name: 'Clerk', key: 'clerk', icon: '🔐' }
    ];

    let totalTests = 0;
    let passedTests = 0;
    let skippedTests = 0;

    servers.forEach(server => {
      const result = this.testResults[server.key];
      totalTests++;

      let status = '';
      if (result.status === 'success') {
        status = '✅ PASS';
        passedTests++;
      } else if (result.status === 'failed') {
        status = '❌ FAIL';
      } else if (result.status === 'skipped') {
        status = '⏭️ SKIP';
        skippedTests++;
      } else {
        status = '⏸️ PENDING';
      }

      console.log(`${server.icon} ${server.name} MCP Server: ${status}`);

      if (result.errors.length > 0) {
        result.errors.forEach(error => {
          console.log(`   └─ Error: ${error}`);
        });
      }
    });

    console.log('\n📊 Summary:');
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests - skippedTests}`);
    console.log(`   Skipped: ${skippedTests}`);
    console.log(`   Success Rate: ${Math.round((passedTests / (totalTests - skippedTests)) * 100)}%`);

    // Provide next steps
    console.log('\n🔧 Next Steps:');

    if (this.testResults.supabase.status === 'skipped') {
      console.log('1. Get Supabase Personal Access Token:');
      console.log('   https://supabase.com/dashboard/account/tokens');
      console.log('   Then set: export SUPABASE_ACCESS_TOKEN=your_token');
    }

    if (this.testResults.clerk.status === 'skipped') {
      console.log('2. Get Clerk Secret Key:');
      console.log('   https://dashboard.clerk.com/ -> API Keys');
      console.log('   Then set: export CLERK_SECRET_KEY=your_key');
    }

    if (passedTests === totalTests - skippedTests && skippedTests === 0) {
      console.log('🎉 All MCP servers are working correctly!');
      console.log('   You can now use them in Augment VS Code.');
    } else if (skippedTests > 0) {
      console.log('⚠️  Some servers were skipped due to missing API keys.');
      console.log('   Add the required keys and rerun the test.');
    } else {
      console.log('❌ Some servers failed to start.');
      console.log('   Check the error messages above for troubleshooting.');
    }
  }

  // Main test execution
  async runTests() {
    try {
      // Check prerequisites
      if (!this.checkPrerequisites()) {
        console.log('\n❌ Prerequisites check failed. Please fix the issues above.');
        return;
      }

      // Check MCP configuration
      const config = this.checkMCPConfig();
      if (!config) {
        console.log('\n❌ MCP configuration check failed.');
        return;
      }

      console.log('\n🚀 Starting MCP server tests...');

      // Test all servers
      await this.testRetellAI();
      await this.testSupabase();
      await this.testClerk();

      // Generate report
      this.generateReport();

    } catch (error) {
      console.error('\n❌ Test execution failed:', error.message);
    }
  }
}

// Run the tests
const tester = new MCPServerTester();
tester.runTests().catch(console.error);