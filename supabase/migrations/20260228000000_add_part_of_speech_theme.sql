-- Este script añade las columnas faltantes que la Inteligencia Artificial necesita guardar.
-- Ve al panel de Supabase -> SQL Editor y pégalo para ejecutarlo:

ALTER TABLE words 
ADD COLUMN IF NOT EXISTS part_of_speech TEXT,
ADD COLUMN IF NOT EXISTS theme TEXT;
