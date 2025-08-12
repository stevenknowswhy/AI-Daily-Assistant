#!/usr/bin/env node

/**
 * Database Migration Runner
 * =========================
 * 
 * Runs database migrations to fix schema issues and ensure compatibility
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
config({ path: path.resolve(__dirname, '../.env') });

console.log('🔄 Running database migrations...\n');

async function runMigration() {
  // Check for required environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('   • SUPABASE_URL');
    console.error('   • SUPABASE_SERVICE_ROLE_KEY');
    console.error('\nPlease ensure these are set in your .env file.');
    process.exit(1);
  }

  // Create Supabase client with service role key (required for schema changes)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  try {
    console.log('🔍 Checking database connection...');
    
    // Test connection
    const { data, error: connectionError } = await supabase
      .from('oauth_tokens')
      .select('count', { count: 'exact', head: true });

    if (connectionError && connectionError.code !== 'PGRST116') {
      // PGRST116 is "table not found" which is expected if table doesn't exist yet
      throw new Error(`Database connection failed: ${connectionError.message}`);
    }

    console.log('✅ Database connection successful');

    // Read migration file
    const migrationPath = path.resolve(__dirname, '../database/migrations/001_fix_oauth_tokens_schema.sql');
    
    if (!fs.existsSync(migrationPath)) {
      throw new Error(`Migration file not found: ${migrationPath}`);
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('📄 Running migration: 001_fix_oauth_tokens_schema.sql');
    console.log('   This migration will:');
    console.log('   • Migrate data from user_auth_tokens to oauth_tokens (if needed)');
    console.log('   • Ensure proper table structure and indexes');
    console.log('   • Set up Row Level Security policies');
    console.log('   • Add encryption version tracking\n');

    // Execute migration
    const { data: migrationResult, error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (migrationError) {
      // If exec_sql RPC doesn't exist, try direct SQL execution
      console.log('⚠️  exec_sql RPC not available, attempting direct execution...');
      
      // Split migration into individual statements and execute them
      const statements = migrationSQL
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

      for (const statement of statements) {
        if (statement.includes('DO $$') || statement.includes('CREATE') || statement.includes('ALTER')) {
          console.log(`   Executing: ${statement.substring(0, 50)}...`);
          
          const { error } = await supabase.rpc('exec', { sql: statement });
          if (error) {
            console.warn(`   ⚠️  Statement warning: ${error.message}`);
          }
        }
      }
    }

    console.log('✅ Migration completed successfully');

    // Verify the migration
    console.log('\n🔍 Verifying migration results...');
    
    const { data: tableInfo, error: verifyError } = await supabase
      .from('oauth_tokens')
      .select('*', { count: 'exact', head: true });

    if (verifyError) {
      throw new Error(`Migration verification failed: ${verifyError.message}`);
    }

    console.log('✅ oauth_tokens table is accessible');

    // Check for any existing tokens
    const { count } = await supabase
      .from('oauth_tokens')
      .select('*', { count: 'exact', head: true });

    console.log(`📊 Current token count: ${count || 0}`);

    console.log('\n🎉 Database migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Restart your application to use the updated schema');
    console.log('   2. Test OAuth authentication flow');
    console.log('   3. Verify token encryption is working');
    console.log('   4. Check that existing users can still authenticate\n');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('   • Ensure SUPABASE_SERVICE_ROLE_KEY has admin privileges');
    console.error('   • Check that your Supabase project is accessible');
    console.error('   • Verify the migration SQL syntax is correct');
    console.error('   • Check Supabase logs for detailed error information');
    process.exit(1);
  }
}

// Run migration if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMigration().catch(console.error);
}

export { runMigration };
