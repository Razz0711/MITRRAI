-- ============================================
-- Migration 010: Professor Ratings (Anonymous)
-- Students rate professors anonymously
-- ============================================

-- Professors table
CREATE TABLE IF NOT EXISTS professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Unique constraint: no duplicate professor names in same department
CREATE UNIQUE INDEX IF NOT EXISTS idx_professors_name_dept ON professors (LOWER(name), LOWER(department));

-- Ratings table (anonymous)
CREATE TABLE IF NOT EXISTS professor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT DEFAULT '',
  batch_year TEXT DEFAULT '',        -- e.g. "22" — for showing batch-wise stats
  department TEXT DEFAULT '',        -- student's department
  created_at TIMESTAMPTZ DEFAULT now()
);

-- One rating per student per professor
CREATE UNIQUE INDEX IF NOT EXISTS idx_ratings_user_prof ON professor_ratings (user_id, professor_id);

-- Fast lookups
CREATE INDEX IF NOT EXISTS idx_ratings_professor ON professor_ratings (professor_id);
CREATE INDEX IF NOT EXISTS idx_professors_dept ON professors (department);

-- Enable RLS
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_ratings ENABLE ROW LEVEL SECURITY;

-- Policies: anyone authenticated can read, only service role inserts
CREATE POLICY "Anyone can read professors" ON professors FOR SELECT USING (true);
CREATE POLICY "Anyone can read ratings" ON professor_ratings FOR SELECT USING (true);
CREATE POLICY "Service role manages professors" ON professors FOR ALL USING (true);
CREATE POLICY "Service role manages ratings" ON professor_ratings FOR ALL USING (true);
