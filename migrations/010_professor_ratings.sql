-- ============================================
-- Migration 010: Professor Ratings (Anonymous)
-- Multi-factor ratings + pre-seeded professors
-- ============================================

-- Drop previous (safe — migration hasn't been run yet)
DROP TABLE IF EXISTS professor_ratings;
DROP TABLE IF EXISTS professors;

-- Professors table
CREATE TABLE professors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  department TEXT NOT NULL,
  designation TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_professors_name_dept ON professors (LOWER(name), LOWER(department));
CREATE INDEX idx_professors_dept ON professors (department);

-- Ratings table — multi-factor (anonymous)
CREATE TABLE professor_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professor_id UUID NOT NULL REFERENCES professors(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  teaching INTEGER NOT NULL CHECK (teaching >= 1 AND teaching <= 5),
  grading INTEGER NOT NULL CHECK (grading >= 1 AND grading <= 5),
  friendliness INTEGER NOT NULL CHECK (friendliness >= 1 AND friendliness <= 5),
  material INTEGER NOT NULL CHECK (material >= 1 AND material <= 5),
  comment TEXT DEFAULT '',
  batch_year TEXT DEFAULT '',
  department TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_ratings_user_prof ON professor_ratings (user_id, professor_id);
CREATE INDEX idx_ratings_professor ON professor_ratings (professor_id);

-- Enable RLS
ALTER TABLE professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE professor_ratings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read professors" ON professors FOR SELECT USING (true);
CREATE POLICY "Anyone can read ratings" ON professor_ratings FOR SELECT USING (true);
CREATE POLICY "Service role manages professors" ON professors FOR ALL USING (true);
CREATE POLICY "Service role manages ratings" ON professor_ratings FOR ALL USING (true);

-- ── Seed: Mathematics Department (SVNIT) ──
INSERT INTO professors (name, department, designation) VALUES
  ('Dr. Jayesh M. Dhodiya',          'Mathematics', 'HOD & Associate Professor'),
  ('Dr. A. K. Shukla',               'Mathematics', 'Professor'),
  ('Dr. V. H. Pradhan',              'Mathematics', 'Professor'),
  ('Dr. Neeru Adlakha',              'Mathematics', 'Professor'),
  ('Dr. Sushil Kumar',               'Mathematics', 'Professor'),
  ('Dr. Ranjan Kumar Jana',          'Mathematics', 'Associate Professor'),
  ('Dr. Twinkle R. Singh',           'Mathematics', 'Associate Professor'),
  ('Dr. Ramakanta Meher',            'Mathematics', 'Associate Professor'),
  ('Indira P. Tripathi',             'Mathematics', 'Assistant Professor'),
  ('Dr. Shailesh Kumar Srivastava',  'Mathematics', 'Assistant Professor'),
  ('Dr. Raj Kamal Maurya',           'Mathematics', 'Assistant Professor'),
  ('Dr. Amit Sharma',                'Mathematics', 'Assistant Professor'),
  ('Dr. Sudeep Singh Sanga',         'Mathematics', 'Assistant Professor'),
  ('Dr. Saroj R. Yadav',             'Mathematics', 'Assistant Professor'),
  ('Dr. Sourav Gupta',               'Mathematics', 'Assistant Professor'),
  ('Dr. Shivam Bajpeyi',             'Mathematics', 'Assistant Professor')
ON CONFLICT DO NOTHING;
