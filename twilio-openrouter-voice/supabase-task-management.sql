-- Task Management System for AI Daily Assistant
-- =============================================
-- Run this in Supabase SQL Editor

-- 1. User Action Tasks Table
CREATE TABLE public.user_action_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_type TEXT NOT NULL,
    task_status TEXT NOT NULL DEFAULT 'pending',
    task_summary TEXT NOT NULL,
    task_data JSONB,
    completion_summary TEXT,
    voice_command TEXT,
    llm_confidence DECIMAL(3,2),
    priority INTEGER DEFAULT 3,
    estimated_duration_minutes INTEGER,
    due_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Email Management Table
CREATE TABLE public.user_email_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id UUID REFERENCES public.user_action_tasks(id) ON DELETE CASCADE,
    email_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    approval_status TEXT NOT NULL DEFAULT 'pending',
    original_email_data JSONB,
    draft_content TEXT,
    final_content TEXT,
    recipient_email TEXT,
    reply_subject TEXT,
    scheduled_send_time TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    gmail_thread_id TEXT,
    gmail_message_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Calendar Actions Table
CREATE TABLE public.user_calendar_actions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    task_id UUID REFERENCES public.user_action_tasks(id) ON DELETE CASCADE,
    event_status TEXT NOT NULL DEFAULT 'draft',
    event_title TEXT NOT NULL,
    event_description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    timezone TEXT DEFAULT 'America/Los_Angeles',
    location TEXT,
    attendees JSONB,
    attendee_emails TEXT[],
    send_invitations BOOLEAN DEFAULT true,
    google_calendar_id TEXT DEFAULT 'primary',
    google_event_id TEXT,
    google_event_link TEXT,
    meeting_type TEXT DEFAULT 'in-person',
    video_call_link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Briefing Schedule Table
CREATE TABLE public.user_briefing_schedule (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    preferred_call_time TIME NOT NULL DEFAULT '08:00:00',
    timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles',
    call_frequency TEXT NOT NULL DEFAULT 'daily',
    custom_days INTEGER[],
    is_active BOOLEAN DEFAULT true,
    last_call_date DATE,
    last_call_sid TEXT,
    next_scheduled_call TIMESTAMP WITH TIME ZONE,
    max_call_duration_minutes INTEGER DEFAULT 5,
    voice_speed TEXT DEFAULT 'normal',
    include_weather BOOLEAN DEFAULT true,
    include_traffic BOOLEAN DEFAULT false,
    retry_attempts INTEGER DEFAULT 0,
    max_retry_attempts INTEGER DEFAULT 3,
    retry_interval_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Task Completion Log Table
CREATE TABLE public.user_task_completion_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    original_task_id UUID,
    task_type TEXT NOT NULL,
    completion_summary TEXT NOT NULL,
    completion_date DATE NOT NULL,
    completion_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    voice_command TEXT,
    task_duration_minutes INTEGER,
    user_satisfaction_rating INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Enable Row Level Security
ALTER TABLE public.user_action_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_email_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_calendar_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_briefing_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_task_completion_log ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS Policies
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

-- 8. Create Indexes
CREATE INDEX idx_user_action_tasks_user_status ON public.user_action_tasks(user_id, task_status);
CREATE INDEX idx_user_action_tasks_type ON public.user_action_tasks(task_type);
CREATE INDEX idx_user_action_tasks_created ON public.user_action_tasks(created_at);

CREATE INDEX idx_user_email_actions_user ON public.user_email_actions(user_id);
CREATE INDEX idx_user_email_actions_email_id ON public.user_email_actions(email_id);
CREATE INDEX idx_user_email_actions_approval ON public.user_email_actions(approval_status);

CREATE INDEX idx_user_calendar_actions_user ON public.user_calendar_actions(user_id);
CREATE INDEX idx_user_calendar_actions_start_time ON public.user_calendar_actions(start_time);
CREATE INDEX idx_user_calendar_actions_status ON public.user_calendar_actions(event_status);

CREATE INDEX idx_user_briefing_schedule_user ON public.user_briefing_schedule(user_id);

CREATE INDEX idx_user_task_completion_log_user_date ON public.user_task_completion_log(user_id, completion_date);

-- 9. Sample Data
INSERT INTO public.user_briefing_schedule (
    user_id, preferred_call_time, timezone, call_frequency, 
    is_active, max_call_duration_minutes, include_weather
) VALUES (
    '+14158552745', '08:00:00', 'America/Los_Angeles', 'daily', 
    true, 5, true
);

INSERT INTO public.user_action_tasks (
    user_id, task_type, task_status, task_summary, voice_command, 
    llm_confidence, priority, task_data
) VALUES (
    '+14158552745', 'email_reply', 'draft_ready', 
    'Reply to John about meeting scheduling', 
    'Reply to John and tell him I can meet tomorrow at 2 PM',
    0.95, 2,
    '{"email_id": "sample123", "recipient": "john@example.com", "subject": "Re: Meeting Request"}'::JSONB
);
