-- Migration: Fix OAuth Tokens Schema
-- ====================================
-- 
-- This migration ensures the oauth_tokens table matches the application expectations
-- and migrates any existing user_auth_tokens data if it exists.

-- First, check if the old user_auth_tokens table exists and migrate data
DO $$
BEGIN
    -- Check if user_auth_tokens table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'user_auth_tokens') THEN
        RAISE NOTICE 'Found legacy user_auth_tokens table, migrating data...';
        
        -- Migrate data from user_auth_tokens to oauth_tokens
        INSERT INTO public.oauth_tokens (
            user_id,
            provider,
            encrypted_access_token,
            encrypted_refresh_token,
            token_expires_at,
            scopes,
            is_active,
            created_at,
            updated_at
        )
        SELECT 
            user_id::UUID,
            'google' as provider,
            access_token as encrypted_access_token,
            refresh_token as encrypted_refresh_token,
            CASE 
                WHEN expiry_date IS NOT NULL THEN to_timestamp(expiry_date / 1000)
                ELSE NULL 
            END as token_expires_at,
            CASE 
                WHEN scope IS NOT NULL THEN string_to_array(scope, ' ')
                ELSE ARRAY[]::TEXT[]
            END as scopes,
            true as is_active,
            COALESCE(created_at::TIMESTAMP WITH TIME ZONE, NOW()),
            COALESCE(updated_at::TIMESTAMP WITH TIME ZONE, NOW())
        FROM user_auth_tokens
        ON CONFLICT (user_id, provider) DO UPDATE SET
            encrypted_access_token = EXCLUDED.encrypted_access_token,
            encrypted_refresh_token = EXCLUDED.encrypted_refresh_token,
            token_expires_at = EXCLUDED.token_expires_at,
            scopes = EXCLUDED.scopes,
            updated_at = NOW();
            
        RAISE NOTICE 'Migration completed. Dropping legacy table...';
        
        -- Drop the old table
        DROP TABLE user_auth_tokens;
        
        RAISE NOTICE 'Legacy user_auth_tokens table dropped successfully.';
    ELSE
        RAISE NOTICE 'No legacy user_auth_tokens table found. Schema is up to date.';
    END IF;
END $$;

-- Ensure oauth_tokens table has the correct structure
-- (This will only add missing columns, not modify existing ones)

-- Add encryption_version column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'oauth_tokens' AND column_name = 'encryption_version'
    ) THEN
        ALTER TABLE public.oauth_tokens ADD COLUMN encryption_version TEXT DEFAULT '1.0';
        RAISE NOTICE 'Added encryption_version column to oauth_tokens table.';
    END IF;
END $$;

-- Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_user_provider ON public.oauth_tokens(user_id, provider);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_expires ON public.oauth_tokens(token_expires_at);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_active ON public.oauth_tokens(is_active);

-- Ensure RLS policies are in place
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate them
DROP POLICY IF EXISTS "Users can view own tokens" ON public.oauth_tokens;
DROP POLICY IF EXISTS "Users can manage own tokens" ON public.oauth_tokens;

-- Create RLS policies
CREATE POLICY "Users can view own tokens" ON public.oauth_tokens
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own tokens" ON public.oauth_tokens
    FOR ALL USING (auth.uid() = user_id);

-- Ensure updated_at trigger exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_oauth_tokens_updated_at ON public.oauth_tokens;

CREATE TRIGGER update_oauth_tokens_updated_at 
    BEFORE UPDATE ON public.oauth_tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add helpful comments
COMMENT ON TABLE public.oauth_tokens IS 'Stores encrypted OAuth tokens for external service integrations';
COMMENT ON COLUMN public.oauth_tokens.encrypted_access_token IS 'AES-256-GCM encrypted access token (JSON format)';
COMMENT ON COLUMN public.oauth_tokens.encrypted_refresh_token IS 'AES-256-GCM encrypted refresh token (JSON format)';
COMMENT ON COLUMN public.oauth_tokens.encryption_version IS 'Version of encryption algorithm used';

-- Verify the migration
DO $$
DECLARE
    token_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO token_count FROM public.oauth_tokens;
    RAISE NOTICE 'OAuth tokens table migration completed. Total tokens: %', token_count;
END $$;
