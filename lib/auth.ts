/**
 * Autenticación frontend para Teacher/Coordinador.
 * Usuarios precreados: puedes definir VITE_TEACHER_CREDENTIALS en Vercel
 * con formato "usuario1:clave1,usuario2:clave2" o usar los valores por defecto.
 */

export interface TeacherCredential {
  username: string;
  password: string;
}

const DEFAULT_CREDENTIALS: TeacherCredential[] = [
  { username: 'teacher', password: 'bee2025' },
  { username: 'coordinator', password: 'coord2025' },
];

function getCredentials(): TeacherCredential[] {
  const envCreds = typeof import.meta !== 'undefined' && import.meta.env?.VITE_TEACHER_CREDENTIALS;
  if (envCreds && typeof envCreds === 'string' && envCreds.trim()) {
    return envCreds.split(',').map((pair) => {
      const [username, password] = pair.trim().split(':').map((s) => s.trim());
      return { username: username || '', password: password || '' };
    }).filter((c) => c.username && c.password);
  }
  return DEFAULT_CREDENTIALS;
}

export function validateTeacherCredentials(username: string, password: string): boolean {
  const list = getCredentials();
  return list.some((c) => c.username === username && c.password === password);
}

// --- Admin Session (formerly Teacher) ---
const TEACHER_SESSION_KEY = 'spelling_bee_teacher_session';

export function setTeacherSession(): void {
  try {
    sessionStorage.setItem(TEACHER_SESSION_KEY, 'true');
  } catch (_) { }
}

export function clearTeacherSession(): void {
  try {
    sessionStorage.removeItem(TEACHER_SESSION_KEY);
  } catch (_) { }
}

export function hasTeacherSession(): boolean {
  try {
    return sessionStorage.getItem(TEACHER_SESSION_KEY) === 'true';
  } catch (_) {
    return false;
  }
}

// --- School Session ---
const SCHOOL_SESSION_KEY = 'spelling_bee_school_session';

export interface SchoolSessionData {
  id: string;
  name: string;
  username: string;
}

export function setSchoolSession(data: SchoolSessionData): void {
  try {
    sessionStorage.setItem(SCHOOL_SESSION_KEY, JSON.stringify(data));
  } catch (_) { }
}

export function getSchoolSession(): SchoolSessionData | null {
  try {
    const data = sessionStorage.getItem(SCHOOL_SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (_) {
    return null;
  }
}

export function clearSchoolSession(): void {
  try {
    sessionStorage.removeItem(SCHOOL_SESSION_KEY);
  } catch (_) { }
}

export function hasSchoolSession(): boolean {
  return !!getSchoolSession();
}
