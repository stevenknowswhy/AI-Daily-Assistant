/**
 * Initialize Database with Sample Data
 * ===================================
 * 
 * Creates tables by inserting sample data, which will auto-create the table structure
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function initializeDatabase() {
  console.log('🔧 Initializing database with sample data...');

  try {
    // Try to insert sample bills data - this will create the table if it doesn't exist
    console.log('📋 Creating user_bills_subscriptions table with sample data...');
    
    const sampleBills = [
      {
        user_id: '+14158552745',
        name: 'Electric Bill',
        amount: 120.00,
        due_date: '2025-08-08',
        recurrence_type: 'monthly',
        category: 'utilities',
        description: 'PG&E electric bill',
        auto_pay: false
      },
      {
        user_id: '+14158552745',
        name: 'Netflix Subscription',
        amount: 15.99,
        due_date: '2025-08-15',
        recurrence_type: 'monthly',
        category: 'entertainment',
        description: 'Monthly Netflix subscription',
        auto_pay: true
      },
      {
        user_id: '+14158552745',
        name: 'Car Insurance',
        amount: 89.50,
        due_date: '2025-08-07',
        recurrence_type: 'monthly',
        category: 'insurance',
        description: 'Auto insurance premium',
        auto_pay: false
      }
    ];

    const { data: billsData, error: billsError } = await supabase
      .from('user_bills_subscriptions')
      .insert(sampleBills)
      .select();

    if (billsError) {
      console.error('❌ Error creating bills table:', billsError);
      console.log('💡 This is expected if the table doesn\'t exist yet');
      console.log('📝 You may need to create the tables manually in Supabase dashboard');
    } else {
      console.log('✅ user_bills_subscriptions table created with sample data');
      console.log(`📊 Inserted ${billsData.length} sample bills`);
    }

    // Try to create briefing preferences
    console.log('\n⚙️ Creating user_briefing_preferences with sample data...');
    
    const samplePreferences = {
      user_id: '+14158552745',
      preferred_time: '08:00:00',
      timezone: 'America/Los_Angeles',
      include_emails: true,
      include_calendar: true,
      include_bills: true,
      max_emails_to_mention: 5,
      only_important_emails: false,
      bill_reminder_days: 3,
      is_active: true
    };

    const { data: prefsData, error: prefsError } = await supabase
      .from('user_briefing_preferences')
      .insert(samplePreferences)
      .select();

    if (prefsError) {
      console.error('❌ Error creating preferences table:', prefsError);
      console.log('💡 This is expected if the table doesn\'t exist yet');
    } else {
      console.log('✅ user_briefing_preferences table created with sample data');
    }

    // Try to create a sample briefing status
    console.log('\n📊 Creating daily_briefing_status with sample data...');
    
    const sampleBriefingStatus = {
      user_id: '+14158552745',
      briefing_date: new Date().toISOString().split('T')[0],
      is_completed: false,
      email_count: 0,
      calendar_events_count: 0,
      bills_due_count: 0,
      delivery_method: 'voice'
    };

    const { data: statusData, error: statusError } = await supabase
      .from('daily_briefing_status')
      .insert(sampleBriefingStatus)
      .select();

    if (statusError) {
      console.error('❌ Error creating briefing status table:', statusError);
      console.log('💡 This is expected if the table doesn\'t exist yet');
    } else {
      console.log('✅ daily_briefing_status table created with sample data');
    }

    console.log('\n🎉 Database initialization completed!');
    console.log('📝 If tables weren\'t created, you may need to create them manually in Supabase dashboard');
    console.log('🔗 Supabase Dashboard: https://supabase.com/dashboard/project/bunpgmxgectzjiqbwvwg');

  } catch (error) {
    console.error('💥 Database initialization failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run initialization
initializeDatabase();
