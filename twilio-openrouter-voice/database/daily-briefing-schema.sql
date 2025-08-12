-- Daily Briefing System Database Schema
-- =====================================
-- This schema supports bill/subscription management and daily briefing tracking

-- Table: user_bills_subscriptions
-- Stores user bills and subscriptions with due dates and recurrence patterns
CREATE TABLE IF NOT EXISTS public.user_bills_subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Can be phone number, email, or user identifier
    name TEXT NOT NULL, -- Bill/subscription name (e.g., "Netflix", "Electric Bill")
    amount DECIMAL(10,2), -- Amount due (optional, for budgeting)
    due_date DATE NOT NULL, -- Next due date
    recurrence_type TEXT NOT NULL DEFAULT 'monthly', -- monthly, yearly, weekly, quarterly, one-time
    recurrence_interval INTEGER DEFAULT 1, -- Every N periods (e.g., every 2 months)
    category TEXT DEFAULT 'other', -- utilities, entertainment, insurance, etc.
    description TEXT, -- Additional details
    is_active BOOLEAN DEFAULT true, -- Whether this bill is still active
    reminder_days_before INTEGER DEFAULT 3, -- Days before due date to remind
    auto_pay BOOLEAN DEFAULT false, -- Whether this is auto-paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_recurrence_type CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'one-time')),
    CONSTRAINT valid_category CHECK (category IN ('utilities', 'entertainment', 'insurance', 'rent', 'mortgage', 'subscription', 'loan', 'credit-card', 'other')),
    CONSTRAINT positive_amount CHECK (amount IS NULL OR amount >= 0),
    CONSTRAINT valid_reminder_days CHECK (reminder_days_before >= 0 AND reminder_days_before <= 30)
);

-- Table: daily_briefing_status
-- Tracks daily briefing completion and user feedback
CREATE TABLE IF NOT EXISTS public.daily_briefing_status (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    briefing_date DATE NOT NULL,
    is_completed BOOLEAN DEFAULT false,
    completion_timestamp TIMESTAMP WITH TIME ZONE,
    briefing_content JSONB, -- Stores the full briefing data for reference
    user_notes TEXT, -- User feedback or notes about the briefing
    email_count INTEGER DEFAULT 0,
    calendar_events_count INTEGER DEFAULT 0,
    bills_due_count INTEGER DEFAULT 0,
    delivery_method TEXT DEFAULT 'voice', -- voice, email, sms
    call_sid TEXT, -- Twilio call SID if delivered via voice
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one briefing per user per day
    UNIQUE(user_id, briefing_date)
);

-- Table: user_briefing_preferences
-- Stores user preferences for daily briefings
CREATE TABLE IF NOT EXISTS public.user_briefing_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    preferred_time TIME DEFAULT '08:00:00', -- Preferred briefing time
    timezone TEXT DEFAULT 'America/Los_Angeles',
    include_emails BOOLEAN DEFAULT true,
    include_calendar BOOLEAN DEFAULT true,
    include_bills BOOLEAN DEFAULT true,
    max_emails_to_mention INTEGER DEFAULT 5,
    only_important_emails BOOLEAN DEFAULT false,
    bill_reminder_days INTEGER DEFAULT 3, -- Days before due date to include in briefing
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_bills_user_id ON public.user_bills_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_bills_due_date ON public.user_bills_subscriptions(due_date);
CREATE INDEX IF NOT EXISTS idx_user_bills_active ON public.user_bills_subscriptions(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_briefing_status_user_date ON public.daily_briefing_status(user_id, briefing_date);
CREATE INDEX IF NOT EXISTS idx_briefing_preferences_user ON public.user_briefing_preferences(user_id);

-- Functions for automatic due date calculation
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

-- Function to update bill due dates after payment
CREATE OR REPLACE FUNCTION mark_bill_paid(
    p_bill_id UUID,
    p_payment_date DATE DEFAULT CURRENT_DATE
) RETURNS VOID AS $$
DECLARE
    bill_record RECORD;
    next_due DATE;
BEGIN
    -- Get the bill record
    SELECT * INTO bill_record 
    FROM public.user_bills_subscriptions 
    WHERE id = p_bill_id AND is_active = true;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bill not found or inactive: %', p_bill_id;
    END IF;
    
    -- Calculate next due date
    next_due := calculate_next_due_date(
        bill_record.due_date,
        bill_record.recurrence_type,
        bill_record.recurrence_interval
    );
    
    -- Update the bill with new due date (or deactivate if one-time)
    IF next_due IS NULL THEN
        -- One-time bill, deactivate it
        UPDATE public.user_bills_subscriptions 
        SET is_active = false, updated_at = NOW()
        WHERE id = p_bill_id;
    ELSE
        -- Recurring bill, update due date
        UPDATE public.user_bills_subscriptions 
        SET due_date = next_due, updated_at = NOW()
        WHERE id = p_bill_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE public.user_bills_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_briefing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_briefing_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies (for now, allow all operations - can be restricted later)
CREATE POLICY "Allow all operations on user_bills_subscriptions" ON public.user_bills_subscriptions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on daily_briefing_status" ON public.daily_briefing_status
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on user_briefing_preferences" ON public.user_briefing_preferences
    FOR ALL USING (true) WITH CHECK (true);

-- Sample data for testing
INSERT INTO public.user_bills_subscriptions (user_id, name, amount, due_date, recurrence_type, category, description) VALUES
('+14158552745', 'Netflix Subscription', 15.99, '2025-08-15', 'monthly', 'entertainment', 'Monthly Netflix subscription'),
('+14158552745', 'Electric Bill', 120.00, '2025-08-10', 'monthly', 'utilities', 'PG&E electric bill'),
('+14158552745', 'Car Insurance', 89.50, '2025-08-20', 'monthly', 'insurance', 'Auto insurance premium'),
('+14158552745', 'Rent Payment', 2500.00, '2025-08-01', 'monthly', 'rent', 'Monthly rent payment'),
('+14158552745', 'Credit Card Payment', 250.00, '2025-08-08', 'monthly', 'credit-card', 'Minimum credit card payment')
ON CONFLICT DO NOTHING;

-- Sample briefing preferences
INSERT INTO public.user_briefing_preferences (user_id, preferred_time, timezone, include_emails, include_calendar, include_bills) VALUES
('+14158552745', '08:00:00', 'America/Los_Angeles', true, true, true)
ON CONFLICT (user_id) DO UPDATE SET
    preferred_time = EXCLUDED.preferred_time,
    timezone = EXCLUDED.timezone,
    include_emails = EXCLUDED.include_emails,
    include_calendar = EXCLUDED.include_calendar,
    include_bills = EXCLUDED.include_bills,
    updated_at = NOW();
