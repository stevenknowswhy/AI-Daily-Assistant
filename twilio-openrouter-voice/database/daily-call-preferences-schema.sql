-- Daily Call Preferences Schema
-- ===============================
-- 
-- This schema stores user preferences for daily call functionality
-- including phone numbers, call times, and no-answer actions

-- Create daily_call_preferences table
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
    
    -- Ensure one preference record per user
    UNIQUE(user_id)
);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_daily_call_preferences_user_id ON daily_call_preferences(user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_daily_call_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_daily_call_preferences_updated_at
    BEFORE UPDATE ON daily_call_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_call_preferences_updated_at();

-- Insert sample data for testing
INSERT INTO daily_call_preferences (user_id, phone_number, call_time, no_answer_action, retry_count)
VALUES ('dashboard-user', '+14158552745', '08:00:00', 'text_briefing', 1)
ON CONFLICT (user_id) DO NOTHING;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL ON daily_call_preferences TO authenticated;
-- GRANT ALL ON daily_call_preferences TO service_role;
