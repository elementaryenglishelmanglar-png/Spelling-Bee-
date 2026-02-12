-- 1. Update students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password TEXT,
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0;

-- 2. Create student_stats table
CREATE TABLE IF NOT EXISTS student_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    word_id TEXT NOT NULL, -- Words might have string IDs based on types.ts
    is_correct BOOLEAN NOT NULL,
    time_taken INTEGER NOT NULL, -- seconds
    points_earned INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Enable RLS
ALTER TABLE student_stats ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Public read (for leaderboard)
CREATE POLICY "Enable read access for all users" ON student_stats FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON student_stats FOR INSERT WITH CHECK (true);

-- 5. XP Trigger
CREATE OR REPLACE FUNCTION update_student_xp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE students
    SET total_xp = total_xp + NEW.points_earned
    WHERE id = NEW.student_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_stat_insert ON student_stats;
CREATE TRIGGER on_stat_insert
AFTER INSERT ON student_stats
FOR EACH ROW
EXECUTE FUNCTION update_student_xp();
