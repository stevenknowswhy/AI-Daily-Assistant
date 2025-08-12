#!/usr/bin/env node

/**
 * MCP Servers Fix and Diagnostic Script
 * =====================================
 *
 * This script diagnoses and fixes issues with MCP servers for AI Daily Assistant
 */

import { spawn } from 'child_process';
import { config } from 'dotenv';
import fs from 'fs';

config();

console.log('🔧 MCP Servers Diagnostic and Fix Tool...\n');

class MCPServerFixer {
  constructor() {
    this.fixes = [];
  }

  // Test RetellAI package availability
  async testRetellAIPackage() {
    console.log('🗣️ Diagnosing RetellAI MCP Server...');

    return new Promise((resolve) => {
      const process = spawn('npx', ['-y', '@abhaybabbar/retellai-mcp-server', '--help'], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      const timeout = setTimeout(() => {
        process.kill();
        resolve({
          success: false,
          error: 'Package download/execution timeout',
          stdout,
          stderr
        });
      }, 60000); // 60 second timeout for package download

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('exit', (code) => {
        clearTimeout(timeout);
        resolve({
          success: code === 0 || stdout.includes('help') || stdout.includes('usage'),
          code,
          stdout,
          stderr
        });
      });

      process.on('error', (error) => {
        clearTimeout(timeout);
        resolve({
          success: false,
          error: error.message,
          stdout,
          stderr
        });
      });
    });
  }

  // Fix VS Code MCP configuration with better error handling
  fixMCPConfiguration() {
    console.log('🔧 Fixing VS Code MCP Configuration...');

    try {
      const configPath = '.vscode/augment-mcp-config.json';
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Add better error handling and timeouts
      const improvedConfig = {
        ...config,
        settings: {
          ...config.settings,
          autoStart: true,
          logLevel: "debug",
          maxRetries: 3,
          retryDelay: 5000,
          timeout: 60000 // Increase timeout to 60 seconds
        }
      };

      // Update RetellAI server config with better error handling
      if (improvedConfig.mcpServers['retellai-mcp-server']) {
        improvedConfig.mcpServers['retellai-mcp-server'] = {
          ...improvedConfig.mcpServers['retellai-mcp-server'],
          timeout: 60000,
          autoRestart: true,
          maxRetries: 3
        };
      }

      // Update Supabase server config
      if (improvedConfig.mcpServers['supabase-mcp-server']) {
        improvedConfig.mcpServers['supabase-mcp-server'] = {
          ...improvedConfig.mcpServers['supabase-mcp-server'],
          timeout: 45000,
          autoRestart: true
        };
      }

      // Update Clerk server config
      if (improvedConfig.mcpServers['clerk-mcp-server']) {
        improvedConfig.mcpServers['clerk-mcp-server'] = {
          ...improvedConfig.mcpServers['clerk-mcp-server'],
          timeout: 30000,
          autoRestart: true
        };
      }

      // Write improved config
      fs.writeFileSync(configPath, JSON.stringify(improvedConfig, null, 2));
      console.log('   ✅ Updated MCP configuration with better error handling');

      this.fixes.push('Updated VS Code MCP configuration');
      return { success: true };

    } catch (error) {
      console.log(`   ❌ Failed to fix MCP configuration: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  // Create environment template
  createEnvironmentTemplate() {
    console.log('📝 Creating environment template...');

    const envTemplate = `# MCP Servers Environment Variables
# =================================
# Copy this file to .env.local and fill in your actual API keys

# Supabase Personal Access Token
# Get from: https://supabase.com/dashboard/account/tokens
SUPABASE_ACCESS_TOKEN=your_supabase_personal_access_token_here

# Clerk Secret Key
# Get from: https://dashboard.clerk.com/ -> API Keys
CLERK_SECRET_KEY=your_clerk_secret_key_here

# RetellAI API Key (already configured)
RETELL_API_KEY=key_5e644ad04c0a5276fd6c9c83c495

# Instructions:
# 1. Get your Supabase Personal Access Token:
#    - Go to https://supabase.com/dashboard/account/tokens
#    - Click "Generate new token"
#    - Name: "Augment VS Code MCP Server"
#    - Copy the token (starts with sbp_)
#
# 2. Get your Clerk Secret Key:
#    - Go to https://dashboard.clerk.com/
#    - Select your "moral-lynx-16" project
#    - Navigate to "API Keys"
#    - Copy your secret key (starts with sk_test_ or sk_live_)
#
# 3. Update .vscode/augment-mcp-config.json with these values
#    Replace the placeholder values with your actual keys
`;

    fs.writeFileSync('.env.template', envTemplate);
    console.log('   ✅ Created .env.template with instructions');

    this.fixes.push('Created environment template');
    return { success: true };
  }

  // Main fix execution
  async runFixes() {
    console.log('🔧 Starting MCP servers diagnostic and fix...\n');

    try {
      // Test RetellAI package
      const retellPackageTest = await this.testRetellAIPackage();
      if (retellPackageTest.success) {
        console.log('   ✅ RetellAI package is accessible');
      } else {
        console.log(`   ❌ RetellAI package issue: ${retellPackageTest.error}`);
      }

      // Fix MCP configuration
      this.fixMCPConfiguration();

      // Create environment template
      this.createEnvironmentTemplate();

      console.log('\n✅ Diagnostic and fixes complete!');
      console.log('\n📋 Applied fixes:');
      this.fixes.forEach(fix => console.log(`   • ${fix}`));

      console.log('\n🔧 Next steps:');
      console.log('1. Get your API keys using the .env.template as a guide');
      console.log('2. Update .vscode/augment-mcp-config.json with real API keys');
      console.log('3. Restart VS Code to load the updated configuration');

    } catch (error) {
      console.error('❌ Fix execution failed:', error.message);
    }
  }
}

const fixer = new MCPServerFixer();
fixer.runFixes().catch(console.error);