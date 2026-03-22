-- ============================================
-- MitrRAI - Migration 023: Study Rooms Expiry
-- Adds duration_minutes + expires_at to study_rooms
-- Run in Supabase SQL Editor
-- ============================================

ALTER TABLE study_rooms
  ADD COLUMN IF NOT EXISTS duration_minutes INT NOT NULL DEFAULT 120,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Back-fill existing rows: assume 2hr default from created_at
UPDATE study_rooms
SET expires_at = created_at + INTERVAL '120 minutes'
WHERE expires_at IS NULL;

-- Index for efficient active-room queries
CREATE INDEX IF NOT EXISTS idx_study_rooms_expires_at ON study_rooms(expires_at);
