-- Políticas RLS para Storage: permitir que la app (anon) suba y lea imágenes.
-- Ejecuta este SQL en Supabase → SQL Editor si obtienes "new row violates row-level security policy" al añadir palabras o estudiantes con imagen.
-- Si al ejecutar sale "policy already exists", descomenta y ejecuta primero el bloque DROP de abajo, luego vuelve a ejecutar este archivo.

-- DROP POLICY IF EXISTS "spellbee_word_images_select" ON storage.objects;
-- DROP POLICY IF EXISTS "spellbee_word_images_insert" ON storage.objects;
-- DROP POLICY IF EXISTS "spellbee_word_images_update" ON storage.objects;
-- DROP POLICY IF EXISTS "spellbee_word_images_delete" ON storage.objects;
-- DROP POLICY IF EXISTS "spellbee_student_photos_select" ON storage.objects;
-- DROP POLICY IF EXISTS "spellbee_student_photos_insert" ON storage.objects;
-- DROP POLICY IF EXISTS "spellbee_student_photos_update" ON storage.objects;
-- DROP POLICY IF EXISTS "spellbee_student_photos_delete" ON storage.objects;

-- word-images: lectura pública
CREATE POLICY "spellbee_word_images_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'word-images');

-- word-images: anon puede insertar, actualizar y borrar
CREATE POLICY "spellbee_word_images_insert"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'word-images');

CREATE POLICY "spellbee_word_images_update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'word-images');

CREATE POLICY "spellbee_word_images_delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'word-images');

-- student-photos: lectura pública
CREATE POLICY "spellbee_student_photos_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'student-photos');

-- student-photos: anon puede insertar, actualizar y borrar
CREATE POLICY "spellbee_student_photos_insert"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'student-photos');

CREATE POLICY "spellbee_student_photos_update"
ON storage.objects FOR UPDATE
TO public
USING (bucket_id = 'student-photos');

CREATE POLICY "spellbee_student_photos_delete"
ON storage.objects FOR DELETE
TO public
USING (bucket_id = 'student-photos');
