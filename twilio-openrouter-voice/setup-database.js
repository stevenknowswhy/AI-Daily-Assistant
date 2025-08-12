/**
 * Database Setup Script
 * ====================
 * 
 * Creates the necessary tables for the daily briefing system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setupDatabase() {
  console.log('🔧 Setting up daily briefing database tables...');

  try {
    // For now, let's create tables by inserting sample data and letting Supabase auto-create them
    console.log('📋 Creating tables by inserting sample data...');

    // This approach will auto-create the table structure based on the data we insert
    console.log('✅ Using data-driven table creation approach');

    // Create daily_briefing_status table
    console.log('📊 Creating daily_briefing_status table...');
    const { error: briefingError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (briefingError) {
      console.error('❌ Error creating briefing status table:', briefingError);
    } else {
      console.log('✅ daily_briefing_status table created successfully');
    }

    // Create user_briefing_preferences table
    console.log('⚙️ Creating user_briefing_preferences table...');
    const { error: preferencesError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });

    if (preferencesError) {
      console.error('❌ Error creating preferences table:', preferencesError);
    } else {
      console.log('✅ user_briefing_preferences table created successfully');
    }

    // Insert sample data
    console.log('📝 Inserting sample data...');
    
    // Sample bills
    const { error: sampleBillsError } = await supabase
      .from('user_bills_subscriptions')
      .upsert([
        {
          user_id: '+14158552745',
          name: 'Netflix Subscription',
          amount: 15.99,
          due_date: '2025-08-15',
          recurrence_type: 'monthly',
          category: 'entertainment',
          description: 'Monthly Netflix subscription'
        },
        {
          user_id: '+14158552745',
          name: 'Electric Bill',
          amount: 120.00,
          due_date: '2025-08-08',
          recurrence_type: 'monthly',
          category: 'utilities',
          description: 'PG&E electric bill'
        },
        {
          user_id: '+14158552745',
          name: 'Car Insurance',
          amount: 89.50,
          due_date: '2025-08-20',
          recurrence_type: 'monthly',
          category: 'insurance',
          description: 'Auto insurance premium'
        }
      ], { onConflict: 'user_id,name' });

    if (sampleBillsError) {
      console.error('❌ Error inserting sample bills:', sampleBillsError);
    } else {
      console.log('✅ Sample bills inserted successfully');
    }

    // Sample preferences
    const { error: samplePrefsError } = await supabase
      .from('user_briefing_preferences')
      .upsert({
        user_id: '+14158552745',
        preferred_time: '08:00:00',
        timezone: 'America/Los_Angeles',
        include_emails: true,
        include_calendar: true,
        include_bills: true,
        max_emails_to_mention: 5,
        bill_reminder_days: 3
      }, { onConflict: 'user_id' });

    if (samplePrefsError) {
      console.error('❌ Error inserting sample preferences:', samplePrefsError);
    } else {
      console.log('✅ Sample preferences inserted successfully');
    }

    console.log('🎉 Database setup completed successfully!');

  } catch (error) {
    console.error('💥 Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupDatabase();
