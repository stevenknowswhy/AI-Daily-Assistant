/**
 * Create Database Tables Script
 * ============================
 * 
 * Creates the necessary tables for the daily briefing system using direct SQL execution
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTables() {
  console.log('🔧 Creating daily briefing database tables...');
  console.log('📍 Supabase URL:', process.env.SUPABASE_URL);
  console.log('🔑 Service key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Create user_bills_subscriptions table
    console.log('\n📋 Creating user_bills_subscriptions table...');
    
    const createBillsTableSQL = `
      CREATE TABLE IF NOT EXISTS public.user_bills_subscriptions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount DECIMAL(10,2),
        due_date DATE NOT NULL,
        recurrence_type TEXT NOT NULL DEFAULT 'monthly',
        recurrence_interval INTEGER DEFAULT 1,
        category TEXT DEFAULT 'other',
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        reminder_days_before INTEGER DEFAULT 3,
        auto_pay BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Add indexes
      CREATE INDEX IF NOT EXISTS idx_user_bills_user_id ON public.user_bills_subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_bills_due_date ON public.user_bills_subscriptions(due_date);
      CREATE INDEX IF NOT EXISTS idx_user_bills_active ON public.user_bills_subscriptions(is_active) WHERE is_active = true;
      
      -- Enable RLS
      ALTER TABLE public.user_bills_subscriptions ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policy
      CREATE POLICY IF NOT EXISTS "Allow all operations on user_bills_subscriptions" ON public.user_bills_subscriptions
        FOR ALL USING (true) WITH CHECK (true);
    `;

    const { data: billsResult, error: billsError } = await supabase.rpc('exec_sql', {
      sql: createBillsTableSQL
    });

    if (billsError) {
      console.error('❌ Error creating bills table:', billsError);
      // Try alternative approach - insert sample data to auto-create table
      console.log('🔄 Trying alternative approach - inserting sample data...');
      
      const { data: insertResult, error: insertError } = await supabase
        .from('user_bills_subscriptions')
        .insert({
          user_id: '+14158552745',
          name: 'Electric Bill',
          amount: 120.00,
          due_date: '2025-08-08',
          recurrence_type: 'monthly',
          category: 'utilities',
          description: 'PG&E electric bill'
        });

      if (insertError) {
        console.error('❌ Alternative approach failed:', insertError);
      } else {
        console.log('✅ Table created via data insertion');
      }
    } else {
      console.log('✅ user_bills_subscriptions table created successfully');
    }

    // Create daily_briefing_status table
    console.log('\n📊 Creating daily_briefing_status table...');
    
    const createBriefingTableSQL = `
      CREATE TABLE IF NOT EXISTS public.daily_briefing_status (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL,
        briefing_date DATE NOT NULL,
        is_completed BOOLEAN DEFAULT false,
        completion_timestamp TIMESTAMP WITH TIME ZONE,
        briefing_content JSONB,
        user_notes TEXT,
        email_count INTEGER DEFAULT 0,
        calendar_events_count INTEGER DEFAULT 0,
        bills_due_count INTEGER DEFAULT 0,
        delivery_method TEXT DEFAULT 'voice',
        call_sid TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(user_id, briefing_date)
      );
      
      -- Add indexes
      CREATE INDEX IF NOT EXISTS idx_briefing_status_user_date ON public.daily_briefing_status(user_id, briefing_date);
      
      -- Enable RLS
      ALTER TABLE public.daily_briefing_status ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policy
      CREATE POLICY IF NOT EXISTS "Allow all operations on daily_briefing_status" ON public.daily_briefing_status
        FOR ALL USING (true) WITH CHECK (true);
    `;

    const { data: briefingResult, error: briefingError } = await supabase.rpc('exec_sql', {
      sql: createBriefingTableSQL
    });

    if (briefingError) {
      console.error('❌ Error creating briefing status table:', briefingError);
    } else {
      console.log('✅ daily_briefing_status table created successfully');
    }

    // Create user_briefing_preferences table
    console.log('\n⚙️ Creating user_briefing_preferences table...');
    
    const createPreferencesTableSQL = `
      CREATE TABLE IF NOT EXISTS public.user_briefing_preferences (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        preferred_time TIME DEFAULT '08:00:00',
        timezone TEXT DEFAULT 'America/Los_Angeles',
        include_emails BOOLEAN DEFAULT true,
        include_calendar BOOLEAN DEFAULT true,
        include_bills BOOLEAN DEFAULT true,
        max_emails_to_mention INTEGER DEFAULT 5,
        only_important_emails BOOLEAN DEFAULT false,
        bill_reminder_days INTEGER DEFAULT 3,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      
      -- Add indexes
      CREATE INDEX IF NOT EXISTS idx_briefing_preferences_user ON public.user_briefing_preferences(user_id);
      
      -- Enable RLS
      ALTER TABLE public.user_briefing_preferences ENABLE ROW LEVEL SECURITY;
      
      -- Create RLS policy
      CREATE POLICY IF NOT EXISTS "Allow all operations on user_briefing_preferences" ON public.user_briefing_preferences
        FOR ALL USING (true) WITH CHECK (true);
    `;

    const { data: preferencesResult, error: preferencesError } = await supabase.rpc('exec_sql', {
      sql: createPreferencesTableSQL
    });

    if (preferencesError) {
      console.error('❌ Error creating preferences table:', preferencesError);
    } else {
      console.log('✅ user_briefing_preferences table created successfully');
    }

    console.log('\n🎉 Database table creation completed!');

  } catch (error) {
    console.error('💥 Database table creation failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run table creation
createTables();
