-- Migration: Add is_active column to daily_call_preferences table
-- Date: 2025-08-10
-- Description: Fix the missing is_active column that's causing 500 errors

-- Check if the column already exists before adding it
DO $$
BEGIN
    -- Add is_active column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'daily_call_preferences' 
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE daily_call_preferences 
        ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
        
        RAISE NOTICE 'Added is_active column to daily_call_preferences table';
    ELSE
        RAISE NOTICE 'is_active column already exists in daily_call_preferences table';
    END IF;
END $$;

-- Update the updated_at trigger if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_trigger 
        WHERE tgname = 'update_daily_call_preferences_updated_at'
    ) THEN
        CREATE TRIGGER update_daily_call_preferences_updated_at
            BEFORE UPDATE ON daily_call_preferences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
            
        RAISE NOTICE 'Created updated_at trigger for daily_call_preferences table';
    ELSE
        RAISE NOTICE 'updated_at trigger already exists for daily_call_preferences table';
    END IF;
END $$;

-- Verify the table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'daily_call_preferences' 
ORDER BY ordinal_position;
