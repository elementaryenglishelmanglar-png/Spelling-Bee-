-- Add logo column to invited_schools
ALTER TABLE invited_schools 
ADD COLUMN IF NOT EXISTS logo TEXT;

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES invited_schools(id) ON DELETE CASCADE NOT NULL,
    amount NUMERIC NOT NULL,
    method TEXT DEFAULT 'Cash USD' NOT NULL,
    payment_date DATE NOT NULL,
    observations TEXT,
    status TEXT DEFAULT 'pending' NOT NULL, -- pending, verified, rejected
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable read access for all users" ON payments FOR SELECT USING (true);
CREATE POLICY "Enable insert for all users" ON payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for all users" ON payments FOR UPDATE USING (true);
CREATE POLICY "Enable delete for all users" ON payments FOR DELETE USING (true);
