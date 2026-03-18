-- Migration: 021_time_tracking
-- Description: Adds table and RPC for accurately tracking user time per feature.

-- 1. Create the logs table
CREATE TABLE IF NOT EXISTS user_time_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    arya_seconds INTEGER DEFAULT 0,
    anon_seconds INTEGER DEFAULT 0,
    feed_seconds INTEGER DEFAULT 0,
    community_seconds INTEGER DEFAULT 0,
    general_seconds INTEGER DEFAULT 0,
    total_seconds INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(user_id, log_date)
);

-- Enable RLS
ALTER TABLE user_time_logs ENABLE ROW LEVEL SECURITY;

-- Users can read and insert/update their own logs
CREATE POLICY "Users can read own time logs" ON user_time_logs
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own time logs" ON user_time_logs
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own time logs" ON user_time_logs
    FOR UPDATE USING (auth.uid()::text = user_id);

-- 2. Create the RPC function for secure atomic increments
-- This prevents race conditions when multiple tabs might send time simultaneously
CREATE OR REPLACE FUNCTION increment_user_time(
    p_user_id TEXT,
    p_arya_seconds INTEGER DEFAULT 0,
    p_anon_seconds INTEGER DEFAULT 0,
    p_feed_seconds INTEGER DEFAULT 0,
    p_community_seconds INTEGER DEFAULT 0,
    p_general_seconds INTEGER DEFAULT 0
) RETURNS void AS $$
DECLARE
    v_total INTEGER;
BEGIN
    v_total := p_arya_seconds + p_anon_seconds + p_feed_seconds + p_community_seconds + p_general_seconds;

    INSERT INTO user_time_logs (
        user_id, 
        log_date, 
        arya_seconds, 
        anon_seconds, 
        feed_seconds, 
        community_seconds, 
        general_seconds, 
        total_seconds
    )
    VALUES (
        p_user_id, 
        CURRENT_DATE, 
        p_arya_seconds, 
        p_anon_seconds, 
        p_feed_seconds, 
        p_community_seconds, 
        p_general_seconds, 
        v_total
    )
    ON CONFLICT (user_id, log_date) 
    DO UPDATE SET 
        arya_seconds = user_time_logs.arya_seconds + EXCLUDED.arya_seconds,
        anon_seconds = user_time_logs.anon_seconds + EXCLUDED.anon_seconds,
        feed_seconds = user_time_logs.feed_seconds + EXCLUDED.feed_seconds,
        community_seconds = user_time_logs.community_seconds + EXCLUDED.community_seconds,
        general_seconds = user_time_logs.general_seconds + EXCLUDED.general_seconds,
        total_seconds = user_time_logs.total_seconds + EXCLUDED.total_seconds,
        updated_at = EXCLUDED.updated_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
