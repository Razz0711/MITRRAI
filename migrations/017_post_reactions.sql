-- ============================================
-- Migration 017: Post Reactions
-- Tracks I'm in / Reply / Connect on campus posts
-- ============================================

-- 1. Post Reactions table
CREATE TABLE IF NOT EXISTS post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES campus_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('imin', 'reply', 'connect')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id, type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_post_reactions_post ON post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_reactions_user ON post_reactions(user_id);

-- RLS
ALTER TABLE post_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all reactions
CREATE POLICY "Anyone can read reactions"
  ON post_reactions FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own reactions
CREATE POLICY "Users can react"
  ON post_reactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own reactions
CREATE POLICY "Users can unreact"
  ON post_reactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
