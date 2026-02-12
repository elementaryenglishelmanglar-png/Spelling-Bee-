-- Create the table for Invited Schools
CREATE TABLE IF NOT EXISTS invited_schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL, -- Storing simple passwords as requested
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Update students table to link to invited_schools
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES invited_schools(id) ON DELETE SET NULL;

-- Add photo_url to students if it doesn't exist (it might already, checking just in case)
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Policy to allow public read access (simplification for this phase)
ALTER TABLE invited_schools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON invited_schools FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON invited_schools FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON invited_schools FOR UPDATE USING (true);
