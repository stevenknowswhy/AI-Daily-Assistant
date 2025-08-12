#!/usr/bin/env node

/**
 * MCP Configuration Verification Script
 * =====================================
 *
 * Verifies that all API keys have been properly configured in the MCP server files
 */

import fs from 'fs';
import { config } from 'dotenv';

config();

console.log('🔍 Verifying MCP Server Configuration...\n');

class ConfigVerifier {
  constructor() {
    this.issues = [];
    this.successes = [];
  }

  // Check VS Code MCP configuration
  checkVSCodeConfig() {
    console.log('1️⃣ Checking VS Code MCP Configuration...');

    try {
      const configPath = '.vscode/augment-mcp-config.json';
      const configContent = fs.readFileSync(configPath, 'utf8');
      const config = JSON.parse(configContent);

      // Check Supabase configuration
      const supabaseServer = config.mcpServers['supabase-mcp-server'];
      if (supabaseServer && supabaseServer.env && supabaseServer.env.SUPABASE_ACCESS_TOKEN) {
        const token = supabaseServer.env.SUPABASE_ACCESS_TOKEN;
        if (token.startsWith('sbp_') && !token.includes('placeholder') && !token.includes('your-')) {
          console.log('   ✅ Supabase Personal Access Token: Configured');
          console.log(`      Token: ${token.substring(0, 10)}...${token.substring(token.length - 6)}`);
          this.successes.push('Supabase token configured');
        } else {
          console.log('   ❌ Supabase Personal Access Token: Invalid or placeholder');
          this.issues.push('Supabase token needs to be updated');
        }
      } else {
        console.log('   ❌ Supabase configuration missing');
        this.issues.push('Supabase configuration missing');
      }

      // Check Clerk configuration
      const clerkServer = config.mcpServers['clerk-mcp-server'];
      if (clerkServer && clerkServer.env && clerkServer.env.CLERK_SECRET_KEY) {
        const secretKey = clerkServer.env.CLERK_SECRET_KEY;
        if (secretKey.startsWith('sk_') && !secretKey.includes('placeholder') && !secretKey.includes('your-')) {
          console.log('   ✅ Clerk Secret Key: Configured');
          console.log(`      Key: ${secretKey.substring(0, 10)}...${secretKey.substring(secretKey.length - 6)}`);
          this.successes.push('Clerk secret key configured');
        } else {
          console.log('   ❌ Clerk Secret Key: Invalid or placeholder');
          this.issues.push('Clerk secret key needs to be updated');
        }
      } else {
        console.log('   ❌ Clerk configuration missing');
        this.issues.push('Clerk configuration missing');
      }

      // Check RetellAI configuration
      const retellServer = config.mcpServers['retellai-mcp-server'];
      if (retellServer && retellServer.env && retellServer.env.RETELL_API_KEY) {
        const apiKey = retellServer.env.RETELL_API_KEY;
        if (apiKey.startsWith('key_') && apiKey === 'key_5e644ad04c0a5276fd6c9c83c495') {
          console.log('   ✅ RetellAI API Key: Configured');
          console.log(`      Key: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 6)}`);
          this.successes.push('RetellAI API key configured');
        } else {
          console.log('   ❌ RetellAI API Key: Invalid');
          this.issues.push('RetellAI API key needs to be updated');
        }
      } else {
        console.log('   ❌ RetellAI configuration missing');
        this.issues.push('RetellAI configuration missing');
      }

      return true;
    } catch (error) {
      console.log(`   ❌ Error reading VS Code config: ${error.message}`);
      this.issues.push(`VS Code config error: ${error.message}`);
      return false;
    }
  }

  // Check Clerk MCP server environment file
  checkClerkEnv() {
    console.log('\n2️⃣ Checking Clerk MCP Server Environment...');

    try {
      const envPath = 'clerk-mcp-server/.env';
      if (!fs.existsSync(envPath)) {
        console.log('   ❌ Clerk .env file not found');
        this.issues.push('Clerk .env file missing');
        return false;
      }

      const envContent = fs.readFileSync(envPath, 'utf8');

      // Check for Clerk secret key
      const secretKeyMatch = envContent.match(/CLERK_SECRET_KEY=(.+)/);
      if (secretKeyMatch) {
        const secretKey = secretKeyMatch[1].trim();
        if (secretKey.startsWith('sk_') && !secretKey.includes('placeholder') && !secretKey.includes('your-')) {
          console.log('   ✅ Clerk Secret Key in .env: Configured');
          console.log(`      Key: ${secretKey.substring(0, 10)}...${secretKey.substring(secretKey.length - 6)}`);
          this.successes.push('Clerk .env secret key configured');
        } else {
          console.log('   ❌ Clerk Secret Key in .env: Invalid or placeholder');
          this.issues.push('Clerk .env secret key needs to be updated');
        }
      } else {
        console.log('   ❌ Clerk Secret Key not found in .env');
        this.issues.push('Clerk secret key missing from .env');
      }

      return true;
    } catch (error) {
      console.log(`   ❌ Error reading Clerk .env: ${error.message}`);
      this.issues.push(`Clerk .env error: ${error.message}`);
      return false;
    }
  }

  // Generate verification report
  generateReport() {
    console.log('\n📋 Configuration Verification Report');
    console.log('=' .repeat(50));

    console.log(`\n✅ Successes (${this.successes.length}):`);
    this.successes.forEach(success => {
      console.log(`   • ${success}`);
    });

    if (this.issues.length > 0) {
      console.log(`\n❌ Issues Found (${this.issues.length}):`);
      this.issues.forEach(issue => {
        console.log(`   • ${issue}`);
      });
    }

    console.log(`\n📊 Summary:`);
    console.log(`   Total Checks: ${this.successes.length + this.issues.length}`);
    console.log(`   Passed: ${this.successes.length}`);
    console.log(`   Failed: ${this.issues.length}`);
    console.log(`   Success Rate: ${Math.round((this.successes.length / (this.successes.length + this.issues.length)) * 100)}%`);

    if (this.issues.length === 0) {
      console.log('\n🎉 All configurations are properly set!');
      console.log('\n🚀 Next Steps:');
      console.log('1. Restart VS Code to load the new MCP configuration');
      console.log('2. Test the MCP servers with these commands:');
      console.log('   • "Show me the schema of my user_profiles table" (Supabase)');
      console.log('   • "List the first 5 users in my application" (Clerk)');
      console.log('   • "List my recent voice calls" (RetellAI)');
    } else {
      console.log('\n⚠️  Configuration issues found. Please fix the issues above.');
    }
  }

  // Main verification execution
  runVerification() {
    try {
      this.checkVSCodeConfig();
      this.checkClerkEnv();
      this.generateReport();
    } catch (error) {
      console.error('\n❌ Verification failed:', error.message);
    }
  }
}

const verifier = new ConfigVerifier();
verifier.runVerification();