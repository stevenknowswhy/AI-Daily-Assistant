-- =====================================================
-- AI Daily Assistant - Task Management Database Schema
-- =====================================================
-- Comprehensive task tracking and user action management system

-- 1. USER ACTION TASKS TABLE
-- ==========================
-- Tracks all LLM-generated tasks from voice commands
CREATE TABLE IF NOT EXISTS public.user_action_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_type TEXT NOT NULL, -- email_reply, email_delete, calendar_event, bill_reminder, custom
    task_status TEXT NOT NULL DEFAULT 'pending', -- pending, draft_ready, in_progress, completed, cancelled
    task_summary TEXT NOT NULL, -- Human-readable task description
    task_data JSONB, -- Detailed task context (deleted after completion)
    completion_summary TEXT, -- Persistent summary after completion (e.g., "Reply sent to john@example.com")
    voice_command TEXT, -- Original voice command that created this task
    llm_confidence DECIMAL(3,2), -- LLM confidence in task interpretation (0.00-1.00)
    priority INTEGER DEFAULT 3, -- 1=urgent, 2=high, 3=normal, 4=low, 5=someday
    estimated_duration_minutes INTEGER, -- Estimated time to complete
    due_date TIMESTAMP WITH TIME ZONE, -- Optional due date for task
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT valid_task_type CHECK (task_type IN ('email_reply', 'email_delete', 'calendar_event', 'bill_reminder', 'custom')),
    CONSTRAINT valid_task_status CHECK (task_status IN ('pending', 'draft_ready', 'in_progress', 'completed', 'cancelled')),
    CONSTRAINT valid_priority CHECK (priority BETWEEN 1 AND 5),
    CONSTRAINT valid_confidence CHECK (llm_confidence IS NULL OR (llm_confidence >= 0.00 AND llm_confidence <= 1.00))
);

-- 2. EMAIL MANAGEMENT TABLE
-- =========================
-- Handles email replies and deletions with approval workflow
CREATE TABLE IF NOT EXISTS public.user_email_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id UUID REFERENCES public.user_action_tasks(id) ON DELETE CASCADE,
    email_id TEXT NOT NULL, -- Gmail message ID
    action_type TEXT NOT NULL, -- reply, delete, archive, mark_read, mark_unread
    approval_status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, modified
    
    -- Email context (deleted after completion)
    original_email_data JSONB, -- Original email details (subject, from, body, etc.)
    draft_content TEXT, -- LLM-generated draft reply content
    final_content TEXT, -- User-approved final content
    
    -- Metadata
    recipient_email TEXT, -- For replies
    reply_subject TEXT, -- For replies
    scheduled_send_time TIMESTAMP WITH TIME ZONE, -- Optional scheduled sending
    sent_at TIMESTAMP WITH TIME ZONE, -- When email was actually sent
    gmail_thread_id TEXT, -- Gmail thread ID for threading
    gmail_message_id TEXT, -- Gmail message ID after sending
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_action_type CHECK (action_type IN ('reply', 'delete', 'archive', 'mark_read', 'mark_unread')),
    CONSTRAINT valid_approval_status CHECK (approval_status IN ('pending', 'approved', 'rejected', 'modified'))
);

-- 3. CALENDAR EVENT MANAGEMENT TABLE
-- ==================================
-- Manages calendar event creation and attendee invitations
CREATE TABLE IF NOT EXISTS public.user_calendar_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id UUID REFERENCES public.user_action_tasks(id) ON DELETE CASCADE,
    event_status TEXT NOT NULL DEFAULT 'draft', -- draft, created, confirmed, cancelled
    
    -- Event details
    event_title TEXT NOT NULL,
    event_description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone TEXT DEFAULT 'America/Los_Angeles',
    location TEXT,
    
    -- Attendee management
    attendees JSONB, -- Array of {email, name, status} objects
    attendee_emails TEXT[], -- Array of email addresses for easy querying
    send_invitations BOOLEAN DEFAULT true,
    
    -- Google Calendar integration
    google_calendar_id TEXT DEFAULT 'primary',
    google_event_id TEXT, -- Google Calendar event ID after creation
    google_event_link TEXT, -- Google Calendar event link
    
    -- Meeting details
    meeting_type TEXT DEFAULT 'in-person', -- in-person, video_call, phone_call
    video_call_link TEXT, -- Zoom, Meet, Teams link
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_event_status CHECK (event_status IN ('draft', 'created', 'confirmed', 'cancelled')),
    CONSTRAINT valid_meeting_type CHECK (meeting_type IN ('in-person', 'video_call', 'phone_call')),
    CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- 4. DAILY BRIEFING SCHEDULE TABLE
-- ================================
-- Manages automated daily briefing phone call scheduling
CREATE TABLE IF NOT EXISTS public.user_briefing_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    
    -- Scheduling preferences
    preferred_call_time TIME NOT NULL DEFAULT '08:00:00', -- Local time
    timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    call_frequency TEXT NOT NULL DEFAULT 'daily', -- daily, weekdays, weekends, custom
    custom_days INTEGER[], -- Array of weekdays (0=Sunday, 1=Monday, etc.) for custom frequency
    
    -- Call management
    is_active BOOLEAN DEFAULT true,
    last_call_date DATE,
    last_call_sid TEXT, -- Twilio call SID
    next_scheduled_call TIMESTAMP WITH TIME ZONE,
    
    -- Preferences
    max_call_duration_minutes INTEGER DEFAULT 5,
    voice_speed TEXT DEFAULT 'normal', -- slow, normal, fast
    include_weather BOOLEAN DEFAULT true,
    include_traffic BOOLEAN DEFAULT false,
    
    -- Retry logic
    retry_attempts INTEGER DEFAULT 0,
    max_retry_attempts INTEGER DEFAULT 3,
    retry_interval_minutes INTEGER DEFAULT 30,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_call_frequency CHECK (call_frequency IN ('daily', 'weekdays', 'weekends', 'custom')),
    CONSTRAINT valid_voice_speed CHECK (voice_speed IN ('slow', 'normal', 'fast')),
    CONSTRAINT valid_custom_days CHECK (custom_days IS NULL OR (array_length(custom_days, 1) > 0 AND custom_days <@ ARRAY[0,1,2,3,4,5,6])),
    CONSTRAINT valid_call_duration CHECK (max_call_duration_minutes BETWEEN 1 AND 15),
    CONSTRAINT valid_retry_attempts CHECK (max_retry_attempts BETWEEN 0 AND 5)
);

-- 5. TASK COMPLETION LOG TABLE
-- ============================
-- Persistent log of completed tasks for user reference
CREATE TABLE IF NOT EXISTS public.user_task_completion_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    original_task_id UUID, -- Reference to deleted user_action_tasks
    task_type TEXT NOT NULL,
    completion_summary TEXT NOT NULL,
    completion_date DATE NOT NULL,
    completion_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    voice_command TEXT, -- Original voice command
    
    -- Metrics
    task_duration_minutes INTEGER, -- How long task took to complete
    user_satisfaction_rating INTEGER, -- 1-5 rating if provided
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_satisfaction_rating CHECK (user_satisfaction_rating IS NULL OR user_satisfaction_rating BETWEEN 1 AND 5)
);

-- 6. CREATE INDEXES FOR PERFORMANCE
-- =================================
CREATE INDEX IF NOT EXISTS idx_user_action_tasks_user_status ON public.user_action_tasks(user_id, task_status);
CREATE INDEX IF NOT EXISTS idx_user_action_tasks_type ON public.user_action_tasks(task_type);
CREATE INDEX IF NOT EXISTS idx_user_action_tasks_created ON public.user_action_tasks(created_at);
CREATE INDEX IF NOT EXISTS idx_user_action_tasks_due ON public.user_action_tasks(due_date) WHERE due_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_email_actions_user ON public.user_email_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_email_actions_email_id ON public.user_email_actions(email_id);
CREATE INDEX IF NOT EXISTS idx_user_email_actions_approval ON public.user_email_actions(approval_status);

CREATE INDEX IF NOT EXISTS idx_user_calendar_actions_user ON public.user_calendar_actions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_calendar_actions_start_time ON public.user_calendar_actions(start_time);
CREATE INDEX IF NOT EXISTS idx_user_calendar_actions_status ON public.user_calendar_actions(event_status);

CREATE INDEX IF NOT EXISTS idx_user_briefing_schedule_user ON public.user_briefing_schedule(user_id);
CREATE INDEX IF NOT EXISTS idx_user_briefing_schedule_next_call ON public.user_briefing_schedule(next_scheduled_call) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_task_completion_log_user_date ON public.user_task_completion_log(user_id, completion_date);
CREATE INDEX IF NOT EXISTS idx_user_task_completion_log_type ON public.user_task_completion_log(task_type);

-- 7. ENABLE ROW LEVEL SECURITY
-- ============================
ALTER TABLE public.user_action_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calendar_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_briefing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_completion_log ENABLE ROW LEVEL SECURITY;

-- 8. CREATE RLS POLICIES
-- ======================
CREATE POLICY "Allow all operations on user_action_tasks" ON public.user_action_tasks
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on user_email_actions" ON public.user_email_actions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on user_calendar_actions" ON public.user_calendar_actions
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on user_briefing_schedule" ON public.user_briefing_schedule
    FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on user_task_completion_log" ON public.user_task_completion_log
    FOR ALL USING (true) WITH CHECK (true);

-- 9. UTILITY FUNCTIONS
-- ====================

-- Function to calculate next briefing call time
CREATE OR REPLACE FUNCTION calculate_next_briefing_call(
    p_user_id TEXT,
    p_preferred_time TIME,
    p_timezone TEXT,
    p_call_frequency TEXT,
    p_custom_days INTEGER[] DEFAULT NULL
) RETURNS TIMESTAMP WITH TIME ZONE AS $$
DECLARE
    next_call TIMESTAMP WITH TIME ZONE;
    current_time_utc TIMESTAMP WITH TIME ZONE := NOW();
    user_local_time TIMESTAMP WITH TIME ZONE;
    today_call_time TIMESTAMP WITH TIME ZONE;
    tomorrow_call_time TIMESTAMP WITH TIME ZONE;
    current_weekday INTEGER;
BEGIN
    -- Convert current UTC time to user's timezone
    user_local_time := current_time_utc AT TIME ZONE p_timezone;

    -- Calculate today's call time in user's timezone
    today_call_time := (CURRENT_DATE AT TIME ZONE p_timezone + p_preferred_time) AT TIME ZONE p_timezone;

    -- If today's call time hasn't passed yet, use today
    IF current_time_utc < today_call_time THEN
        next_call := today_call_time;
    ELSE
        -- Otherwise, calculate next valid day
        CASE p_call_frequency
            WHEN 'daily' THEN
                next_call := today_call_time + INTERVAL '1 day';
            WHEN 'weekdays' THEN
                current_weekday := EXTRACT(DOW FROM user_local_time);
                IF current_weekday = 5 THEN -- Friday
                    next_call := today_call_time + INTERVAL '3 days'; -- Monday
                ELSIF current_weekday = 6 THEN -- Saturday
                    next_call := today_call_time + INTERVAL '2 days'; -- Monday
                ELSE
                    next_call := today_call_time + INTERVAL '1 day';
                END IF;
            WHEN 'weekends' THEN
                current_weekday := EXTRACT(DOW FROM user_local_time);
                IF current_weekday = 0 THEN -- Sunday
                    next_call := today_call_time + INTERVAL '6 days'; -- Saturday
                ELSIF current_weekday BETWEEN 1 AND 5 THEN -- Monday-Friday
                    next_call := today_call_time + INTERVAL (6 - current_weekday) || ' days'; -- Next Saturday
                ELSE -- Saturday
                    next_call := today_call_time + INTERVAL '1 day'; -- Sunday
                END IF;
            WHEN 'custom' THEN
                -- Find next day in custom_days array
                current_weekday := EXTRACT(DOW FROM user_local_time);
                -- This is simplified - in practice, you'd iterate through custom_days
                next_call := today_call_time + INTERVAL '1 day';
            ELSE
                next_call := today_call_time + INTERVAL '1 day';
        END CASE;
    END IF;

    RETURN next_call;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up completed task data
CREATE OR REPLACE FUNCTION cleanup_completed_task_data()
RETURNS INTEGER AS $$
DECLARE
    cleanup_count INTEGER := 0;
BEGIN
    -- Move completed tasks to completion log and clean up detailed data
    INSERT INTO public.user_task_completion_log (
        user_id, original_task_id, task_type, completion_summary,
        completion_date, completion_timestamp, voice_command, task_duration_minutes
    )
    SELECT
        user_id, id, task_type, completion_summary,
        completed_at::DATE, completed_at, voice_command,
        EXTRACT(EPOCH FROM (completed_at - created_at))/60
    FROM public.user_action_tasks
    WHERE task_status = 'completed'
        AND completed_at < NOW() - INTERVAL '24 hours'
        AND id NOT IN (SELECT original_task_id FROM public.user_task_completion_log WHERE original_task_id IS NOT NULL);

    GET DIAGNOSTICS cleanup_count = ROW_COUNT;

    -- Clear detailed task_data from completed tasks older than 24 hours
    UPDATE public.user_action_tasks
    SET task_data = NULL, updated_at = NOW()
    WHERE task_status = 'completed'
        AND completed_at < NOW() - INTERVAL '24 hours'
        AND task_data IS NOT NULL;

    -- Clear detailed email data from completed email actions older than 24 hours
    UPDATE public.user_email_actions
    SET original_email_data = NULL, draft_content = NULL, updated_at = NOW()
    WHERE approval_status = 'approved'
        AND sent_at < NOW() - INTERVAL '24 hours'
        AND (original_email_data IS NOT NULL OR draft_content IS NOT NULL);

    RETURN cleanup_count;
END;
$$ LANGUAGE plpgsql;

-- 10. SAMPLE DATA FOR TESTING
-- ===========================

-- Sample briefing schedule for test user
INSERT INTO public.user_briefing_schedule (
    user_id, preferred_call_time, timezone, call_frequency,
    is_active, max_call_duration_minutes, include_weather
) VALUES (
    '+14158552745', '08:00:00', 'America/Los_Angeles', 'daily',
    true, 5, true
) ON CONFLICT (user_id) DO UPDATE SET
    preferred_call_time = EXCLUDED.preferred_call_time,
    timezone = EXCLUDED.timezone,
    call_frequency = EXCLUDED.call_frequency,
    updated_at = NOW();

-- Sample task for testing
INSERT INTO public.user_action_tasks (
    user_id, task_type, task_status, task_summary, voice_command,
    llm_confidence, priority, task_data
) VALUES (
    '+14158552745', 'email_reply', 'draft_ready',
    'Reply to John about meeting scheduling',
    'Reply to John and tell him I can meet tomorrow at 2 PM',
    0.95, 2,
    '{"email_id": "sample123", "recipient": "john@example.com", "subject": "Re: Meeting Request"}'::JSONB
) ON CONFLICT DO NOTHING;
