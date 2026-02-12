-- 1. Create student_achievements table
CREATE TABLE IF NOT EXISTS student_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE NOT NULL,
    badge_key TEXT NOT NULL,
    unlocked_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(student_id, badge_key)
);

-- 2. Add streak tracking to students table
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_practice_date DATE;

-- 3. Enable RLS for achievements
ALTER TABLE student_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for all" ON student_achievements FOR SELECT USING (true);
CREATE POLICY "Enable insert for own profile" ON student_achievements FOR INSERT WITH CHECK (true);

-- 4. Trigger to update streaks (optional but recommended for consistency)
-- For now, we might handle streak updates in the application logic to keep it simple, 
-- or use a trigger on student_stats. Let's do a simple trigger on student_stats.

CREATE OR REPLACE FUNCTION maintain_streak()
RETURNS TRIGGER AS $$
DECLARE
    last_date DATE;
    current_date DATE;
BEGIN
    current_date := (NEW.created_at AT TIME ZONE 'UTC')::DATE;
    
    SELECT last_practice_date INTO last_date FROM students WHERE id = NEW.student_id;
    
    IF last_date IS NULL OR last_date < (current_date - INTERVAL '1 day') THEN
        -- Streak broken or new start
        UPDATE students 
        SET current_streak = 1, last_practice_date = current_date 
        WHERE id = NEW.student_id;
    ELSIF last_date = (current_date - INTERVAL '1 day') THEN
        -- Consecutive day
        UPDATE students 
        SET current_streak = current_streak + 1, last_practice_date = current_date 
        WHERE id = NEW.student_id;
    ELSIF last_date = current_date THEN
        -- Same day, do nothing to streak
        NULL;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_stat_streak ON student_stats;
CREATE TRIGGER on_stat_streak
AFTER INSERT ON student_stats
FOR EACH ROW
EXECUTE FUNCTION maintain_streak();
