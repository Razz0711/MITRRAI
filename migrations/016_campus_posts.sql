-- ============================================
-- Migration 016: Campus Posts
-- Social feed for SVNIT students
-- ============================================

-- 1. Campus Posts table
CREATE TABLE IF NOT EXISTS campus_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) <= 280),
  category TEXT NOT NULL DEFAULT 'talk',
  subcategory TEXT DEFAULT NULL,
  location TEXT DEFAULT 'Campus',
  lat DOUBLE PRECISION DEFAULT NULL,
  lng DOUBLE PRECISION DEFAULT NULL,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campus_posts_created ON campus_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_campus_posts_category ON campus_posts(category);
CREATE INDEX IF NOT EXISTS idx_campus_posts_user ON campus_posts(user_id);

-- RLS
ALTER TABLE campus_posts ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read all posts
CREATE POLICY "Anyone can read posts"
  ON campus_posts FOR SELECT
  TO authenticated
  USING (true);

-- Users can insert their own posts
CREATE POLICY "Users can create posts"
  ON campus_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own posts
CREATE POLICY "Users can delete own posts"
  ON campus_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE campus_posts;
