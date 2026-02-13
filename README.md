<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15zM6j_UxyTc0MXQWF-LDfXOgNNHPHSxv

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy en Vercel

1. Sube el proyecto a GitHub y conéctalo en [Vercel](https://vercel.com).
2. En **Settings → Environment Variables** añade:
   - `GEMINI_API_KEY`: tu API key de Gemini (necesaria para enriquecer palabras).
   - (Opcional) `VITE_TEACHER_CREDENTIALS`: usuarios para Teacher/Coordinador en formato `usuario1:clave1,usuario2:clave2`. Si no la defines, se usan los usuarios por defecto.
3. Deploy: Vercel usará `vercel.json` (build `npm run build`, salida `dist`).

Puedes cambiar las credenciales editando `lib/auth.ts` o definiendo la variable de entorno `VITE_TEACHER_CREDENTIALS` en Vercel (formato: `user1:pass1,user2:pass2`). La sesión se guarda en `sessionStorage` y se mantiene hasta cerrar la pestaña o hacer logout.

## Backend con Supabase (datos en el host)

Si configuras Supabase, las **palabras**, **estudiantes** y **sesiones** (y sus imágenes) se guardan en la nube y se comparten entre todos los dispositivos. Si no configuras Supabase, la app sigue funcionando con datos locales en el navegador (localStorage).

### 1. Crear proyecto en Supabase

1. Entra en [supabase.com](https://supabase.com), crea un proyecto y anota la **URL** y la **anon key** (Settings → API).

### 2. Ejecutar la migración SQL

En el **SQL Editor** de tu proyecto Supabase, ejecuta el contenido del archivo  
`supabase/migrations/20250208000000_initial_schema.sql`.  
Eso crea las tablas `words`, `students` y `sessions` y las políticas RLS.

### 3. Crear buckets de Storage para imágenes

En **Storage** del dashboard:

1. Crea un bucket llamado **`word-images`** y márcalo como **público**.
2. Crea un bucket llamado **`student-photos`** y márcalo como **público**.
3. En cada bucket, en **Policies**, añade:
   - Una política que permita **lectura pública** (SELECT para todos).
   - Una política que permita **insert/update/delete** para el rol `anon` (o "Allow all" si prefieres).

### 4. Variables de entorno

Añade en tu `.env.local` (local) y en **Vercel → Environment Variables** (deploy):

- `VITE_SUPABASE_URL`: URL del proyecto (ej. `https://xxxx.supabase.co`)
- `VITE_SUPABASE_ANON_KEY`: clave anon/public del proyecto

Tras desplegar, los datos y las imágenes se guardarán en Supabase y serán los mismos para todos los que usen la app.
