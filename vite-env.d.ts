/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TEACHER_CREDENTIALS?: string;
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
