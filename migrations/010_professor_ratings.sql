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

-- ── Seed: Artificial Intelligence Department (SVNIT) ──
INSERT INTO professors (name, department, designation) VALUES
  ('Dr. Tanmoy Hazra',               'Artificial Intelligence', 'Assistant Professor, Ph. D.'),
  ('Dr. Rahul Dixit',                'Artificial Intelligence', 'Assistant Professor, Ph. D.'),
  ('Dr. Nitesh A. Funde',            'Artificial Intelligence', 'Assistant Professor, Ph. D.'),
  ('Dr. Praveen Kumar Chandaliya',   'Artificial Intelligence', 'Assistant Professor, Ph. D.'),
  ('Dr. Pruthwik Mishra',            'Artificial Intelligence', 'Assistant Professor, Ph. D.'),
  ('Dr. Rohit Kumar',                'Artificial Intelligence', 'Assistant Professor, Ph. D.'),
  ('Dr. Rahul Shrivastava',          'Artificial Intelligence', 'Assistant Professor, Ph. D.'),
  ('Dr. Sankhadeep Chatterjee',      'Artificial Intelligence', 'Assistant Professor, Ph. D.'),
  ('Dr. Sudhakar Mishra',            'Artificial Intelligence', 'Assistant Professor, Ph. D.')
ON CONFLICT DO NOTHING;

-- ── Seed: Computer Science Department (SVNIT) ──
INSERT INTO professors (name, department, designation) VALUES
  ('Dr. Sankita J. Patel',           'Computer Science', 'Associate Professor, Ph. D.'),
  ('Dr. Devesh C. Jinwala',          'Computer Science', 'Professor (HAG), Ph. D.'),
  ('Dr. Dhiren R. Patel',            'Computer Science', 'Professor (HAG), Ph. D.'),
  ('Dr. Mukesh A. Zaveri',           'Computer Science', 'Professor, Ph. D.'),
  ('Dr. Ritu Tiwari',                'Computer Science', 'Professor, Ph. D.'),
  ('Dr. Rupa G. Mehta',              'Computer Science', 'Professor, Ph. D.'),
  ('Dr. Bhavesh N. Gohil',           'Computer Science', 'Associate Professor, Ph. D.'),
  ('Dr. Dipti P. Rana',              'Computer Science', 'Associate Professor, Ph. D.'),
  ('Shri. R. P. Gohil',              'Computer Science', 'Associate Professor, M. Tech.'),
  ('Dr. Krupa N. Jariwala',          'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Balu L. Parne',              'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Chandra Prakash',            'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Keyur Parmar',               'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Alok Kumar',                 'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Abhilasha Chaudhuri',        'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Anugrah Jain',               'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Naveen Kumar',               'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Vishesh P. Gaikwad',         'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Anirban Bhattacharjee',      'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Sourajit Behera',            'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Siba Sankar Sahu',           'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Shrikant Malviya',           'Computer Science', 'Assistant Professor, Ph. D.'),
  ('Dr. Abhinav Malviya',            'Computer Science', 'Assistant Professor, Ph. D.')
ON CONFLICT DO NOTHING;

-- ── Seed: Civil Engineering Department (SVNIT) ──
INSERT INTO professors (name, department, designation) VALUES
  ('Dr. V. L. Manekar',              'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. J. N. Patel',                'Civil Engineering', 'Professor (HAG), Ph. D.'),
  ('Dr. P. L. Patel',                'Civil Engineering', 'Professor (HAG), Ph. D.'),
  ('Dr. C. D. Modhera',              'Civil Engineering', 'Professor (HAG), Ph. D.'),
  ('Dr. Atul K. Desai',              'Civil Engineering', 'Professor (HAG), Ph. D.'),
  ('Dr. C. H. Solanki',              'Civil Engineering', 'Professor (HAG), Ph. D.'),
  ('Dr. G. J. Joshi',                'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. Krupesh A. Chauhan',         'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. M. Mansoor Ahammed',         'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. P. G. Agnihotri',            'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. Rakesh Kumar',               'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. Sandip A. Vasanwala',        'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. S. M. Yadav',                'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. Ashish Dhamaniya',           'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. Dilip A. Patel',             'Civil Engineering', 'Professor, Ph. D, LLB.'),
  ('Dr. K. D. Yadav',                'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. Shriniwas S. Arkatkar',      'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. Yogesh D. Patil',            'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. Gaurang R. Vesmawala',       'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. P. V. Timbadiya',            'Civil Engineering', 'Professor, Ph. D.'),
  ('Dr. Satyajit Patel',             'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. S. R. Suryawanshi',          'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. Anant Parghi',               'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. Bhaven N. Tandel',           'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. Patel Chetankumar Ramanlal', 'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. Ganesh D. Kale',             'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. B. Kondraivendhan',          'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. Namrata D. Jariwala',        'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. Shailendra Kumar',           'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. Shruti J. Shukla',           'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. Tailor Ravin Maheshkumar',   'Civil Engineering', 'Associate Professor, Ph. D.'),
  ('Dr. J. B. Patel',                'Civil Engineering', 'Associate Professor, M. Tech.'),
  ('Dr. Jitesh T. Chavda',           'Civil Engineering', 'Assistant Professor, Ph. D.'),
  ('Dr. Kashyap A. Patel',           'Civil Engineering', 'Assistant Professor, Ph. D.'),
  ('Dr. Banti A. Gedam',             'Civil Engineering', 'Assistant Professor, Ph. D.'),
  ('Shri. Amit J. Solanki',          'Civil Engineering', 'Assistant Professor, M. E.'),
  ('Dr. Smaranika Panda',            'Civil Engineering', 'Assistant Professor, Ph. D.'),
  ('Dr. Tamizharasi G',              'Civil Engineering', 'Assistant Professor, Ph. D.'),
  ('Dr. Vishisht Bhaiya',            'Civil Engineering', 'Assistant Professor, Ph. D.')
ON CONFLICT DO NOTHING;

-- ── Seed: Physics Department (SVNIT) ──
INSERT INTO professors (name, department, designation) VALUES
  ('Dr. Kamlesh N. Pathak',           'Physics', 'Professor'),
  ('Dr. Vipul Kheraj',                'Physics', 'Professor'),
  ('Dr. Debesh R. Roy',               'Physics', 'Associate Professor'),
  ('Dr. Dimple V. Shah',              'Physics', 'Associate Professor'),
  ('Dr. Y. A. Sonvane',               'Physics', 'Associate Professor'),
  ('Dr. Lalit Kumar Saini',           'Physics', 'Associate Professor'),
  ('Dr. Ajay Kumar Rai',              'Physics', 'Associate Professor'),
  ('Dr. Shail Pandey',                'Physics', 'Assistant Professor'),
  ('Dr. Sharad Kumar Yadav',          'Physics', 'Assistant Professor'),
  ('Dr. Vikas Kumar Ojha',            'Physics', 'Assistant Professor'),
  ('Dr. Mithun Karmakar',             'Physics', 'Assistant Professor'),
  ('Dr. Dipika Patel',                'Physics', 'Assistant Professor'),
  ('Dr. Himanshu Pandey',             'Physics', 'Assistant Professor')
ON CONFLICT DO NOTHING;

-- ── Seed: Chemistry Department (SVNIT) ──
INSERT INTO professors (name, department, designation) VALUES
  ('Dr. Ritambhara Jangir',           'Chemistry', 'Assistant Professor'),
  ('Dr. Togati Naveen',               'Chemistry', 'Assistant Professor'),
  ('Dr. A. Sivaiah',                   'Chemistry', 'Assistant Professor'),
  ('Dr. Lata Rana',                    'Chemistry', 'Assistant Professor'),
  ('Dr. Jigneshkumar V. Rohit',       'Chemistry', 'Assistant Professor'),
  ('Dr. Subrata Dutta',               'Chemistry', 'Assistant Professor'),
  ('Dr. Arup Kumar Ghosh',            'Chemistry', 'Assistant Professor')
ON CONFLICT DO NOTHING;
