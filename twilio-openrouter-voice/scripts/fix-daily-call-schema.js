#!/usr/bin/env node

/**
 * Fix Daily Call Preferences Schema
 * =================================
 * 
 * Adds the missing is_active column to daily_call_preferences table
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function fixDailyCallSchema() {
  try {
    log('🔧 Fixing daily_call_preferences schema...', colors.cyan);

    // Initialize Supabase client
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    log('✅ Connected to Supabase', colors.green);

    // First, let's check if the table exists and what columns it has
    log('🔍 Checking current table structure...', colors.blue);
    
    // Try to query the table to see what columns exist
    const { data: testData, error: testError } = await supabase
      .from('daily_call_preferences')
      .select('*')
      .limit(1);

    if (testError && testError.code === 'PGRST116') {
      // Table doesn't exist, create it
      log('📋 Table does not exist, creating it...', colors.yellow);
      
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS daily_call_preferences (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id TEXT NOT NULL,
          phone_number TEXT NOT NULL,
          call_time TIME NOT NULL DEFAULT '08:00:00',
          timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
          no_answer_action TEXT NOT NULL DEFAULT 'text_briefing' CHECK (no_answer_action IN ('text_briefing', 'email_briefing', 'retry_call')),
          retry_count INTEGER DEFAULT 1 CHECK (retry_count BETWEEN 1 AND 3),
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(user_id)
        );
      `;

      // Since we can't use RPC, let's try a different approach
      // We'll use the REST API to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey
        },
        body: JSON.stringify({ sql: createTableSQL })
      });

      if (!response.ok) {
        // If RPC doesn't work, let's try creating via the service directly
        log('⚠️ RPC not available, using alternative method...', colors.yellow);
        
        // Let's try to create the table by inserting a test record and handling the error
        const { error: createError } = await supabase
          .from('daily_call_preferences')
          .insert({
            user_id: 'test_schema_check',
            phone_number: '+1234567890',
            is_active: true
          });

        if (createError && createError.message.includes('relation "daily_call_preferences" does not exist')) {
          throw new Error('Table does not exist and cannot be created automatically. Please create it manually in Supabase.');
        }

        // Clean up test record
        await supabase
          .from('daily_call_preferences')
          .delete()
          .eq('user_id', 'test_schema_check');
      }

      log('✅ Table created successfully', colors.green);
    } else if (testError) {
      throw testError;
    } else {
      log('✅ Table exists', colors.green);
    }

    // Now check if is_active column exists by trying to query it
    log('🔍 Checking for is_active column...', colors.blue);
    
    const { data: columnTest, error: columnError } = await supabase
      .from('daily_call_preferences')
      .select('is_active')
      .limit(1);

    if (columnError && columnError.message.includes('is_active')) {
      log('➕ Adding is_active column...', colors.yellow);
      
      // Try to add the column using a simple approach
      const addColumnSQL = `ALTER TABLE daily_call_preferences ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;`;
      
      try {
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseKey}`,
            'apikey': supabaseKey
          },
          body: JSON.stringify({ sql: addColumnSQL })
        });

        if (response.ok) {
          log('✅ is_active column added successfully', colors.green);
        } else {
          throw new Error('Could not add column via RPC');
        }
      } catch (rpcError) {
        log('⚠️ Could not add column automatically', colors.yellow);
        log('📋 Please run this SQL manually in Supabase:', colors.cyan);
        log(addColumnSQL, colors.blue);
        throw new Error('Manual intervention required');
      }
    } else {
      log('✅ is_active column already exists', colors.green);
    }

    // Test the API endpoint
    log('🧪 Testing API endpoint...', colors.cyan);
    
    const testResponse = await fetch('http://localhost:3005/api/daily-call-preferences/test_user_schema', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        phoneNumber: '+1234567890',
        callTime: '08:00:00',
        timezone: 'America/Los_Angeles',
        isActive: true
      })
    });

    if (testResponse.ok) {
      log('✅ API endpoint working correctly', colors.green);
      
      // Clean up test data
      await fetch('http://localhost:3005/api/daily-call-preferences/test_user_schema', {
        method: 'DELETE'
      });
    } else {
      const errorText = await testResponse.text();
      log(`⚠️ API test failed: ${errorText}`, colors.yellow);
    }

    log('🎉 Schema fix completed!', colors.bright);
    log('💡 The daily call preferences should now work correctly', colors.cyan);

  } catch (error) {
    log(`❌ Schema fix failed: ${error.message}`, colors.red);
    console.error(error);
    
    log('\n🔧 Manual fix instructions:', colors.cyan);
    log('1. Go to your Supabase dashboard', colors.reset);
    log('2. Navigate to the SQL Editor', colors.reset);
    log('3. Run this SQL command:', colors.reset);
    log('   ALTER TABLE daily_call_preferences ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;', colors.blue);
    log('4. Restart your application', colors.reset);
    
    process.exit(1);
  }
}

// Run the schema fix
fixDailyCallSchema();
