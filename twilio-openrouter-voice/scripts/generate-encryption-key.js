#!/usr/bin/env node

/**
 * Generate Encryption Key Script
 * ===============================
 * 
 * Generates a secure encryption key for OAuth token encryption.
 * This script should be run once during initial setup.
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔐 Generating secure encryption key for OAuth tokens...\n');

// Generate a 256-bit (32-byte) encryption key
const encryptionKey = crypto.randomBytes(32).toString('hex');

console.log('✅ Encryption key generated successfully!');
console.log('📋 Add this to your environment variables:\n');
console.log(`TOKEN_ENCRYPTION_KEY=${encryptionKey}\n`);

// Check if .env file exists and offer to add the key
const envPath = path.resolve(__dirname, '../.env');
const envExamplePath = path.resolve(__dirname, '../.env.example');

if (fs.existsSync(envPath)) {
  console.log('⚠️  Found existing .env file.');
  console.log('   Please manually add the TOKEN_ENCRYPTION_KEY to your .env file.');
  console.log('   Do not commit this key to version control!\n');
} else {
  console.log('💡 No .env file found. Creating .env with the encryption key...');
  
  let envContent = `# OAuth Token Encryption Key (DO NOT COMMIT TO VERSION CONTROL)
TOKEN_ENCRYPTION_KEY=${encryptionKey}

# Add your other environment variables below:
`;

  // If .env.example exists, append its content (excluding any existing TOKEN_ENCRYPTION_KEY)
  if (fs.existsSync(envExamplePath)) {
    const exampleContent = fs.readFileSync(envExamplePath, 'utf8');
    const filteredContent = exampleContent
      .split('\n')
      .filter(line => !line.startsWith('TOKEN_ENCRYPTION_KEY'))
      .join('\n');
    
    envContent += '\n' + filteredContent;
  }

  fs.writeFileSync(envPath, envContent);
  console.log('✅ Created .env file with encryption key\n');
}

console.log('🔒 Security Notes:');
console.log('   • This key encrypts all OAuth tokens in your database');
console.log('   • Keep this key secure and never commit it to version control');
console.log('   • If you lose this key, all stored tokens will be unrecoverable');
console.log('   • Consider using a secure key management service in production');
console.log('   • Rotate this key periodically for enhanced security\n');

console.log('🚀 Next steps:');
console.log('   1. Add TOKEN_ENCRYPTION_KEY to your production environment');
console.log('   2. Restart your application to load the new encryption key');
console.log('   3. Existing unencrypted tokens will be automatically migrated');
console.log('   4. Test the authentication flow to ensure everything works\n');

// Validate the generated key
const keyBuffer = Buffer.from(encryptionKey, 'hex');
if (keyBuffer.length === 32) {
  console.log('✅ Key validation: PASSED (256-bit key generated)');
} else {
  console.log('❌ Key validation: FAILED (invalid key length)');
  process.exit(1);
}

console.log('\n🎉 Encryption key setup complete!');
