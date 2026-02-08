import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { WordEntry, StudentProfile, Session, GradeLevel } from '../types';

const BUCKET_WORD_IMAGES = 'word-images';
const BUCKET_STUDENT_PHOTOS = 'student-photos';

// --- Helpers: data URL → Blob → upload → public URL
async function uploadDataUrlToStorage(
  bucket: string,
  path: string,
  dataUrl: string
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const { data, error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type,
    upsert: true,
  });
  if (error) throw error;
  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
  return urlData.publicUrl;
}

function isDataUrl(s: string): boolean {
  return s.startsWith('data:');
}

// --- Words
export async function fetchWords(): Promise<WordEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('words').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    word: row.word,
    definition: row.definition,
    example: row.example,
    grade: row.grade as GradeLevel,
    difficulty: row.difficulty ?? undefined,
    image: row.image_url ?? undefined,
  }));
}

export async function addWord(entry: WordEntry): Promise<WordEntry> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  let imageUrl: string | null = null;
  if (entry.image && isDataUrl(entry.image)) {
    imageUrl = await uploadDataUrlToStorage(BUCKET_WORD_IMAGES, `${entry.id}.png`, entry.image);
  } else if (entry.image) {
    imageUrl = entry.image;
  }
  const { data, error } = await supabase
    .from('words')
    .insert({
      id: entry.id,
      word: entry.word,
      definition: entry.definition,
      example: entry.example,
      grade: entry.grade,
      difficulty: entry.difficulty ?? null,
      image_url: imageUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    word: data.word,
    definition: data.definition,
    example: data.example,
    grade: data.grade,
    difficulty: data.difficulty ?? undefined,
    image: data.image_url ?? undefined,
  };
}

export async function updateWord(entry: WordEntry): Promise<WordEntry> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  let imageUrl: string | null = null;
  if (entry.image) {
    if (isDataUrl(entry.image)) {
      imageUrl = await uploadDataUrlToStorage(BUCKET_WORD_IMAGES, `${entry.id}.png`, entry.image);
    } else {
      imageUrl = entry.image;
    }
  }
  const payload: any = {
    word: entry.word,
    definition: entry.definition,
    example: entry.example,
    grade: entry.grade,
    difficulty: entry.difficulty ?? null,
    image_url: imageUrl,
  };
  const { data, error } = await supabase.from('words').update(payload).eq('id', entry.id).select().single();
  if (error) throw error;
  return {
    id: data.id,
    word: data.word,
    definition: data.definition,
    example: data.example,
    grade: data.grade,
    difficulty: data.difficulty ?? undefined,
    image: data.image_url ?? undefined,
  };
}

export async function deleteWord(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  await supabase.storage.from(BUCKET_WORD_IMAGES).remove([`${id}.png`]);
  const { error } = await supabase.from('words').delete().eq('id', id);
  if (error) throw error;
}

// --- Students
export async function fetchStudents(): Promise<StudentProfile[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('students').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    school: row.school,
    grade: row.grade as GradeLevel,
    photo: row.photo_url ?? undefined,
  }));
}

export async function addStudent(profile: StudentProfile): Promise<StudentProfile> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  let photoUrl: string | null = null;
  if (profile.photo && isDataUrl(profile.photo)) {
    photoUrl = await uploadDataUrlToStorage(BUCKET_STUDENT_PHOTOS, `${profile.id}.png`, profile.photo);
  } else if (profile.photo) {
    photoUrl = profile.photo;
  }
  const { data, error } = await supabase
    .from('students')
    .insert({
      id: profile.id,
      first_name: profile.firstName,
      last_name: profile.lastName,
      school: profile.school,
      grade: profile.grade,
      photo_url: photoUrl,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    school: data.school,
    grade: data.grade,
    photo: data.photo_url ?? undefined,
  };
}

export async function deleteStudent(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  await supabase.storage.from(BUCKET_STUDENT_PHOTOS).remove([`${id}.png`]);
  const { error } = await supabase.from('students').delete().eq('id', id);
  if (error) throw error;
}

// --- Sessions
export async function fetchSessions(): Promise<Session[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('sessions').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    date: row.date,
    grade: row.grade as GradeLevel,
    moderator: row.moderator,
    stage: row.stage ?? undefined,
    contestType: row.contest_type ?? undefined,
    attempts: row.attempts ?? [],
    durationSeconds: row.duration_seconds ?? 0,
  }));
}

export async function addSession(session: Session): Promise<Session> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      id: session.id,
      date: session.date,
      grade: session.grade,
      moderator: session.moderator,
      stage: session.stage ?? null,
      contest_type: session.contestType ?? null,
      attempts: session.attempts,
      duration_seconds: session.durationSeconds,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    date: data.date,
    grade: data.grade,
    moderator: data.moderator,
    stage: data.stage ?? undefined,
    contestType: data.contest_type ?? undefined,
    attempts: data.attempts ?? [],
    durationSeconds: data.duration_seconds ?? 0,
  };
}

export { isSupabaseConfigured };
