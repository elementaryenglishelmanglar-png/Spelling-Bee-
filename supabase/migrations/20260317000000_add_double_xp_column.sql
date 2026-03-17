-- Add double_xp_ends_at to students table to track potion effect
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS double_xp_ends_at TIMESTAMP WITH TIME ZONE;
