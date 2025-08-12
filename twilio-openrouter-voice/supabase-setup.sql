-- =====================================================
-- Daily Briefing System - Supabase Table Creation
-- =====================================================
-- Run this SQL in your Supabase SQL Editor
-- Project: bunpgmxgectzjiqbwvwg

-- 1. Create user_bills_subscriptions table
-- ========================================
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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_recurrence_type CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time')),
    CONSTRAINT valid_category CHECK (category IN ('utilities', 'entertainment', 'insurance', 'rent', 'mortgage', 'subscription', 'loan', 'credit-card', 'other')),
    CONSTRAINT positive_amount CHECK (amount IS NULL OR amount >= 0),
    CONSTRAINT valid_reminder_days CHECK (reminder_days_before >= 0 AND reminder_days_before <= 30)
);

-- 2. Create daily_briefing_status table
-- ====================================
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
    
    -- Ensure one briefing per user per day
    UNIQUE(user_id, briefing_date)
);

-- 3. Create user_briefing_preferences table
-- ========================================
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

-- 4. Create indexes for performance
-- ================================
CREATE INDEX IF NOT EXISTS idx_user_bills_user_id ON public.user_bills_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bills_due_date ON public.user_bills_subscriptions(due_date);
CREATE INDEX IF NOT EXISTS idx_user_bills_active ON public.user_bills_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_briefing_status_user_date ON public.daily_briefing_status(user_id, briefing_date);
CREATE INDEX IF NOT EXISTS idx_briefing_preferences_user ON public.user_briefing_preferences(user_id);

-- 5. Enable Row Level Security (RLS)
-- ==================================
ALTER TABLE public.user_bills_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_briefing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_briefing_preferences ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies (Allow all for development)
-- =================================================
CREATE POLICY IF NOT EXISTS "Allow all operations on user_bills_subscriptions" ON public.user_bills_subscriptions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all operations on daily_briefing_status" ON public.daily_briefing_status
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "Allow all operations on user_briefing_preferences" ON public.user_briefing_preferences
    FOR ALL USING (true) WITH CHECK (true);

-- 7. Insert Sample Data for Testing
-- =================================

-- Sample bills for user +14158552745
INSERT INTO public.user_bills_subscriptions (user_id, name, amount, due_date, recurrence_type, category, description, auto_pay) VALUES
('+14158552745', 'Electric Bill', 120.00, '2025-08-08', 'monthly', 'utilities', 'PG&E electric bill', false),
('+14158552745', 'Netflix Subscription', 15.99, '2025-08-15', 'monthly', 'entertainment', 'Monthly Netflix subscription', true),
('+14158552745', 'Car Insurance', 89.50, '2025-08-07', 'monthly', 'insurance', 'Auto insurance premium', false),
('+14158552745', 'Rent Payment', 2500.00, '2025-08-01', 'monthly', 'rent', 'Monthly rent payment', false),
('+14158552745', 'Internet Bill', 79.99, '2025-08-12', 'monthly', 'utilities', 'High-speed internet service', false)
ON CONFLICT DO NOTHING;

-- Sample briefing preferences
INSERT INTO public.user_briefing_preferences (user_id, preferred_time, timezone, include_emails, include_calendar, include_bills, max_emails_to_mention, bill_reminder_days) VALUES
('+14158552745', '08:00:00', 'America/Los_Angeles', true, true, true, 5, 3)
ON CONFLICT (user_id) DO UPDATE SET
    preferred_time = EXCLUDED.preferred_time,
    timezone = EXCLUDED.timezone,
    include_emails = EXCLUDED.include_emails,
    include_calendar = EXCLUDED.include_calendar,
    include_bills = EXCLUDED.include_bills,
    max_emails_to_mention = EXCLUDED.max_emails_to_mention,
    bill_reminder_days = EXCLUDED.bill_reminder_days,
    updated_at = NOW();

-- 8. Utility Functions for Bill Management
-- =======================================

-- Function to calculate next due date
CREATE OR REPLACE FUNCTION calculate_next_due_date(
    current_due_date DATE,
    recurrence_type TEXT,
    recurrence_interval INTEGER DEFAULT 1
) RETURNS DATE AS $$
BEGIN
    CASE recurrence_type
        WHEN 'daily' THEN
            RETURN current_due_date + (recurrence_interval || ' days')::INTERVAL;
        WHEN 'weekly' THEN
            RETURN current_due_date + (recurrence_interval || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
            RETURN current_due_date + (recurrence_interval || ' months')::INTERVAL;
        WHEN 'quarterly' THEN
            RETURN current_due_date + (recurrence_interval * 3 || ' months')::INTERVAL;
        WHEN 'yearly' THEN
            RETURN current_due_date + (recurrence_interval || ' years')::INTERVAL;
        WHEN 'one-time' THEN
            RETURN NULL; -- One-time bills don't recur
        ELSE
            RAISE EXCEPTION 'Invalid recurrence_type: %', recurrence_type;
    END CASE;
END;
$$ LANGUAGE plpgsql;

-- Function to get bills due within N days
CREATE OR REPLACE FUNCTION get_bills_due_soon(
    p_user_id TEXT,
    p_days_ahead INTEGER DEFAULT 7
) RETURNS TABLE (
    id UUID,
    name TEXT,
    amount DECIMAL(10,2),
    due_date DATE,
    days_until_due INTEGER,
    category TEXT,
    auto_pay BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.name,
        b.amount,
        b.due_date,
        (b.due_date - CURRENT_DATE)::INTEGER as days_until_due,
        b.category,
        b.auto_pay
    FROM public.user_bills_subscriptions b
    WHERE b.user_id = p_user_id
        AND b.is_active = true
        AND b.due_date BETWEEN CURRENT_DATE AND (CURRENT_DATE + p_days_ahead)
    ORDER BY b.due_date ASC, b.amount DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- INSTRUCTIONS FOR SUPABASE DASHBOARD:
-- =====================================================
-- 1. Go to: https://supabase.com/dashboard/project/bunpgmxgectzjiqbwvwg
-- 2. Click on "SQL Editor" in the left sidebar
-- 3. Click "New Query"
-- 4. Copy and paste this entire SQL script
-- 5. Click "Run" to execute
-- 6. Verify tables are created in the "Table Editor"
-- =====================================================
