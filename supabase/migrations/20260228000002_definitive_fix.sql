-- ====================================================
-- DEFINITIVE FIX: Run this entire block in Supabase SQL Editor
-- ====================================================

-- 1. Drop the old difficulty constraint that blocks inserts
ALTER TABLE words DROP CONSTRAINT IF EXISTS words_difficulty_check;

-- 2. Drop the difficulty column entirely (no longer used)
ALTER TABLE words DROP COLUMN IF EXISTS difficulty;

-- 3. Add part_of_speech and theme columns if they don't exist yet
ALTER TABLE words ADD COLUMN IF NOT EXISTS part_of_speech TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS theme TEXT;

-- 4. Fix the grade constraint to allow grade 12 (used internally for "Group 3" / Pre-K)
ALTER TABLE words DROP CONSTRAINT IF EXISTS words_grade_check;
ALTER TABLE words ADD CONSTRAINT words_grade_check CHECK (grade >= 1 AND grade <= 12);

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_grade_check;
ALTER TABLE students ADD CONSTRAINT students_grade_check CHECK (grade >= 1 AND grade <= 12);

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_grade_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_grade_check CHECK (grade >= 1 AND grade <= 12);
