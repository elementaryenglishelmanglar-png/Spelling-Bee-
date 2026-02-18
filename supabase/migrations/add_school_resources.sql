-- Create school_resources table for PDF downloads
CREATE TABLE IF NOT EXISTS school_resources (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  grade INTEGER NOT NULL CHECK (grade >= 1 AND grade <= 12), -- 12 = Group 3
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);


-- Index for faster lookups by grade
CREATE INDEX IF NOT EXISTS idx_school_resources_grade ON school_resources(grade);

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('school-resources', 'school-resources', true) 
ON CONFLICT (id) DO NOTHING;

-- Policies for school-resources bucket
CREATE POLICY "school_resources_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'school-resources');

CREATE POLICY "school_resources_insert"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'school-resources');

CREATE POLICY "school_resources_update"
ON storage.objects FOR UPDATE
USING (bucket_id = 'school-resources');

CREATE POLICY "school_resources_delete"
ON storage.objects FOR DELETE
USING (bucket_id = 'school-resources');
