-- ============================================================
-- MitrRAI — Deduplicate students + enforce unique admission_number
-- ============================================================
-- Step 1: For each duplicate admission_number, keep the row whose
--         id appears in auth.users (i.e. has a valid auth account)
--         and delete the orphan rows.
-- Step 2: Add UNIQUE constraint on admission_number so this can
--         never happen again.
-- Step 3: Add UNIQUE constraint on email for the same reason.
-- ============================================================

-- 1a. Delete orphan students rows (no matching auth user)
DELETE FROM students
WHERE id NOT IN (
  SELECT id FROM auth.users
);

-- 1b. Among remaining duplicates by admission_number,
--     keep the newest (largest created_at / id) per admission_number.
DELETE FROM students
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(TRIM(admission_number))
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM students
    WHERE admission_number IS NOT NULL AND TRIM(admission_number) != ''
  ) ranked
  WHERE rn > 1
);

-- 1c. Among remaining duplicates by email (different emails, same person),
--     keep one per email.
DELETE FROM students
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY LOWER(TRIM(email))
             ORDER BY created_at DESC NULLS LAST, id DESC
           ) AS rn
    FROM students
    WHERE email IS NOT NULL AND TRIM(email) != ''
  ) ranked
  WHERE rn > 1
);

-- 2. Add unique constraint on admission_number (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS students_admission_number_unique
  ON students (LOWER(TRIM(admission_number)))
  WHERE admission_number IS NOT NULL AND TRIM(admission_number) != '';

-- 3. Add unique constraint on email (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS students_email_unique
  ON students (LOWER(TRIM(email)))
  WHERE email IS NOT NULL AND TRIM(email) != '';
