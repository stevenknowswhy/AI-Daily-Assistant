-- STEP 1: Create user_bills_subscriptions table
-- ============================================
-- Run this first in Supabase SQL Editor

CREATE TABLE public.user_bills_subscriptions (
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

-- STEP 2: Create daily_briefing_status table
-- =========================================
-- Run this second

CREATE TABLE public.daily_briefing_status (
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

-- STEP 3: Create user_briefing_preferences table
-- =============================================
-- Run this third

CREATE TABLE public.user_briefing_preferences (
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

-- STEP 4: Create indexes
-- ====================
-- Run this fourth

CREATE INDEX idx_user_bills_user_id ON public.user_bills_subscriptions(user_id);
CREATE INDEX idx_user_bills_due_date ON public.user_bills_subscriptions(due_date);
CREATE INDEX idx_briefing_status_user_date ON public.daily_briefing_status(user_id, briefing_date);
CREATE INDEX idx_briefing_preferences_user ON public.user_briefing_preferences(user_id);

-- STEP 5: Enable Row Level Security
-- ================================
-- Run this fifth

ALTER TABLE public.user_bills_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_briefing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_briefing_preferences ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create RLS Policies
-- ==========================
-- Run this sixth

CREATE POLICY "Allow all operations on user_bills_subscriptions" ON public.user_bills_subscriptions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on daily_briefing_status" ON public.daily_briefing_status
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on user_briefing_preferences" ON public.user_briefing_preferences
    FOR ALL USING (true) WITH CHECK (true);

-- STEP 7: Insert sample data
-- =========================
-- Run this last

INSERT INTO public.user_bills_subscriptions (user_id, name, amount, due_date, recurrence_type, category, description, auto_pay) VALUES
('+14158552745', 'Electric Bill', 120.00, '2025-08-08', 'monthly', 'utilities', 'PG&E electric bill', false),
('+14158552745', 'Netflix Subscription', 15.99, '2025-08-15', 'monthly', 'entertainment', 'Monthly Netflix subscription', true),
('+14158552745', 'Car Insurance', 89.50, '2025-08-07', 'monthly', 'insurance', 'Auto insurance premium', false),
('+14158552745', 'Rent Payment', 2500.00, '2025-08-01', 'monthly', 'rent', 'Monthly rent payment', false),
('+14158552745', 'Internet Bill', 79.99, '2025-08-12', 'monthly', 'utilities', 'High-speed internet service', false);

INSERT INTO public.user_briefing_preferences (user_id, preferred_time, timezone, include_emails, include_calendar, include_bills, max_emails_to_mention, bill_reminder_days) VALUES
('+14158552745', '08:00:00', 'America/Los_Angeles', true, true, true, 5, 3);
