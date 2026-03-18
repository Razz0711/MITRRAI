-- Migration: 020_user_analytics
-- Description: Adds columns for deeper user analytics, profiles, and Arya sentiment

-- 1. Add columns to students table
ALTER TABLE students
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Add columns to arya_messages table
ALTER TABLE arya_messages
ADD COLUMN IF NOT EXISTS is_voice_message BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rating SMALLINT; -- 1 for thumbs up, -1 for thumbs down

-- Update RLS policies (just in case fields need to be readable/updateable by the user)
-- No explicit new RLS policies needed if the table already allows the user to update their own row
