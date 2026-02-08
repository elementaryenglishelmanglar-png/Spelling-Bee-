-- Spelling Bee Manager: tablas y Storage
-- Ejecuta este SQL en el editor SQL de tu proyecto Supabase (Dashboard → SQL Editor).

-- Tabla: palabras por grado
CREATE TABLE IF NOT EXISTS words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  definition TEXT NOT NULL,
  example TEXT NOT NULL,
  grade SMALLINT NOT NULL CHECK (grade >= 1 AND grade <= 11),
  difficulty TEXT CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: estudiantes registrados
CREATE TABLE IF NOT EXISTS students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  school TEXT NOT NULL,
  grade SMALLINT NOT NULL CHECK (grade >= 1 AND grade <= 11),
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla: sesiones de spelling bee (attempts como JSONB)
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date TEXT NOT NULL,
  grade SMALLINT NOT NULL CHECK (grade >= 1 AND grade <= 11),
  moderator TEXT NOT NULL,
  stage TEXT CHECK (stage IN ('Play-offs', 'Final')),
  contest_type TEXT CHECK (contest_type IN ('Internal', 'Interschool')),
  attempts JSONB NOT NULL DEFAULT '[]',
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_words_grade ON words(grade);
CREATE INDEX IF NOT EXISTS idx_students_grade ON students(grade);
CREATE INDEX IF NOT EXISTS idx_students_school ON students(school);
CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions(created_at DESC);

-- RLS: permitir lectura y escritura para anon (app pública; opcional restringir después con auth)
ALTER TABLE words ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for words" ON words FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for students" ON students FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);

-- Storage: crea dos buckets en Dashboard → Storage: "word-images" y "student-photos" (públicos).
-- Luego en cada bucket → Policies: "Allow public read" y "Allow anon upload/update/delete".
-- Ver README para más detalle.
