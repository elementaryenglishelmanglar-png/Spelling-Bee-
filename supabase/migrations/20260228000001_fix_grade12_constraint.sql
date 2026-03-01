-- Fix: Remove the old grade check constraint and allow grade 12 (used internally as "Group 3")
ALTER TABLE words DROP CONSTRAINT IF EXISTS words_grade_check;
ALTER TABLE words ADD CONSTRAINT words_grade_check CHECK (grade >= 1 AND grade <= 12);

ALTER TABLE students DROP CONSTRAINT IF EXISTS students_grade_check;
ALTER TABLE students ADD CONSTRAINT students_grade_check CHECK (grade >= 1 AND grade <= 12);

ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_grade_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_grade_check CHECK (grade >= 1 AND grade <= 12);
