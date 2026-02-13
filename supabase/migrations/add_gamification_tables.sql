-- Add coins to students table
ALTER TABLE students ADD COLUMN IF NOT EXISTS coins INTEGER DEFAULT 0;

-- Create student_items table for inventory
CREATE TABLE IF NOT EXISTS student_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  purchased_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_items_student_id ON student_items(student_id);

-- Create student_achievements table
CREATE TABLE IF NOT EXISTS student_achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  badge_key TEXT NOT NULL,
  unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Index for achievements
CREATE INDEX IF NOT EXISTS idx_student_achievements_student_id ON student_achievements(student_id);
