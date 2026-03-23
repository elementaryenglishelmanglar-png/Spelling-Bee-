import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { WordEntry, StudentProfile, Session, GradeLevel, School, Payment, SchoolResource, Sponsor, Vendor } from '../types';

const BUCKET_WORD_IMAGES = 'word-images';
const BUCKET_STUDENT_PHOTOS = 'student-photos';
const BUCKET_SCHOOL_RESOURCES = 'school-resources';

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

  const PAGE_SIZE = 1000;
  let allRows: any[] = [];
  let from = 0;
  let hasMore = true;

  // Paginate to get ALL rows — PostgREST defaults to 1000 max per request
  while (hasMore) {
    const { data, error } = await supabase
      .from('words')
      .select('*')
      .order('created_at', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw error;
    const page = data ?? [];
    allRows = allRows.concat(page);
    hasMore = page.length === PAGE_SIZE;
    from += PAGE_SIZE;
  }

  return allRows.map((row: any) => ({
    id: row.id,
    word: row.word,
    definition: row.definition,
    example: row.example,
    grade: row.grade as GradeLevel,
    wordNumber: row.word_number ?? undefined,
    partOfSpeech: row.part_of_speech ?? undefined,
    theme: row.theme ?? undefined,
    image: row.image_url ?? undefined,
    audioUrl: row.audio_url ?? undefined,
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
      word_number: entry.wordNumber ?? null,
      part_of_speech: entry.partOfSpeech ?? null,
      theme: entry.theme ?? null,
      image_url: imageUrl,
      audio_url: entry.audioUrl ?? null,
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
    wordNumber: data.word_number ?? undefined,
    partOfSpeech: data.part_of_speech ?? undefined,
    theme: data.theme ?? undefined,
    image: data.image_url ?? undefined,
    audioUrl: data.audio_url ?? undefined,
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
    word_number: entry.wordNumber ?? null,
    part_of_speech: entry.partOfSpeech ?? null,
    theme: entry.theme ?? null,
    image_url: imageUrl,
    audio_url: entry.audioUrl ?? null,
  };
  const { data, error } = await supabase.from('words').update(payload).eq('id', entry.id).select().single();
  if (error) throw error;
  return {
    id: data.id,
    word: data.word,
    definition: data.definition,
    example: data.example,
    grade: data.grade,
    wordNumber: data.word_number ?? undefined,
    partOfSpeech: data.part_of_speech ?? undefined,
    theme: data.theme ?? undefined,
    image: data.image_url ?? undefined,
    audioUrl: data.audio_url ?? undefined,
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
    school: row.school, // keeping this as display text for now, or fallback
    schoolId: row.school_id ?? undefined,
    grade: row.grade as GradeLevel,
    photo: row.photo_url ?? undefined,
    username: row.username ?? undefined,
    password: row.password ?? undefined,
    total_xp: row.total_xp ?? 0,
    coins: row.coins ?? 0,
    current_streak: row.current_streak ?? 0,
    last_practice_date: row.last_practice_date ?? undefined,
    double_xp_ends_at: row.double_xp_ends_at ?? undefined,
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
      school_id: profile.schoolId ?? null,
      grade: profile.grade,
      photo_url: photoUrl,
      username: profile.username || null,
      password: profile.password || null,
      total_xp: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    school: data.school,
    schoolId: data.school_id ?? undefined,
    grade: data.grade,
    photo: data.photo_url ?? undefined,
  };
}

export async function updateStudent(profile: StudentProfile): Promise<StudentProfile> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  let photoUrl: string | null = null;
  if (profile.photo) {
    if (isDataUrl(profile.photo)) {
      photoUrl = await uploadDataUrlToStorage(BUCKET_STUDENT_PHOTOS, `${profile.id}.png`, profile.photo);
    } else {
      photoUrl = profile.photo;
    }
  }
  const payload: any = {
    first_name: profile.firstName,
    last_name: profile.lastName,
    school: profile.school,
    school_id: profile.schoolId ?? null,
    grade: profile.grade,
    photo_url: photoUrl,
    username: profile.username,
    password: profile.password,
  };
  const { data, error } = await supabase.from('students').update(payload).eq('id', profile.id).select().single();
  if (error) throw error;
  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    school: data.school,
    schoolId: data.school_id ?? undefined,
    grade: data.grade,
    photo: data.photo_url ?? undefined,
    username: data.username,
    password: data.password,
    total_xp: data.total_xp,
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

export async function deleteSession(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");
  const { error } = await supabase.from('sessions').delete().eq('id', id);
  if (error) throw error;
}

// --- Schools
export async function fetchSchools(): Promise<School[]> {
  if (!isSupabaseConfigured()) return [];
  const { data, error } = await supabase.from('invited_schools').select('*').order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    username: row.username,
    logo: row.logo,
    // password is not returned for security
  }));
}

export async function addSchool(school: School): Promise<School> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('invited_schools')
    .insert({
      id: school.id,
      name: school.name,
      username: school.username,
      password: school.password, // Simple storage as requested
      logo: school.logo
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    username: data.username,
    logo: data.logo
  };
}

export async function updateSchool(school: School): Promise<School> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

  const updates: any = {
    name: school.name,
    username: school.username,
  };

  if (school.password) updates.password = school.password;
  if (school.logo) updates.logo = school.logo;

  const { data, error } = await supabase
    .from('invited_schools')
    .update(updates)
    .eq('id', school.id)
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    username: data.username,
    logo: data.logo
  };
}

export async function deleteSchool(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

  const { error } = await supabase
    .from('invited_schools')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function validateSchoolLogin(username: string, password: string): Promise<School | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('invited_schools')
    .select('*')
    .eq('username', username)
    .eq('password', password) // Simple check
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    username: data.username,
    logo: data.logo
  };
}

// --- School Resources (PDFs)
export async function fetchSchoolResources(grade?: number): Promise<SchoolResource[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase.from('school_resources').select('*').order('created_at', { ascending: false });
  if (grade) {
    query = query.eq('grade', grade);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    fileUrl: row.file_url,
    grade: row.grade as GradeLevel,
    createdAt: row.created_at
  }));
}

export async function addSchoolResource(resource: SchoolResource, file: File | null): Promise<SchoolResource> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  let publicUrl = resource.fileUrl; // Start with provided url (for links)

  // Upload file if provided
  if (file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${resource.id}.${fileExt}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_SCHOOL_RESOURCES)
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from(BUCKET_SCHOOL_RESOURCES)
      .getPublicUrl(fileName);

    publicUrl = urlData.publicUrl;
  }

  // Insert Record
  const { data, error } = await supabase
    .from('school_resources')
    .insert({
      id: resource.id,
      title: resource.title,
      description: resource.description,
      file_url: publicUrl,
      grade: resource.grade
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    fileUrl: data.file_url,
    grade: data.grade,
    createdAt: data.created_at
  };
}

export async function updateSchoolResource(id: string, updates: Partial<SchoolResource>): Promise<SchoolResource> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  
  const payload: any = {};
  if (updates.title !== undefined) payload.title = updates.title;
  if (updates.description !== undefined) payload.description = updates.description;
  if (updates.fileUrl !== undefined) payload.file_url = updates.fileUrl;
  if (updates.grade !== undefined) payload.grade = updates.grade;

  const { data, error } = await supabase
    .from('school_resources')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    title: data.title,
    description: data.description,
    fileUrl: data.file_url,
    grade: data.grade,
    createdAt: data.created_at
  };
}

export async function deleteSchoolResource(id: string, fileUrl: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');

  // Extract filename from URL to delete from storage
  // Only attempt deletion for Supabase hosted files
  if (fileUrl.includes('supabase.co') && fileUrl.includes(BUCKET_SCHOOL_RESOURCES)) {
    const fileName = fileUrl.split('/').pop();
    if (fileName) {
      await supabase.storage.from(BUCKET_SCHOOL_RESOURCES).remove([fileName]);
    }
  }

  const { error } = await supabase.from('school_resources').delete().eq('id', id);
  if (error) throw error;
}

// --- Payments
export async function fetchPayments(schoolId?: string): Promise<Payment[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase.from('payments').select('*').order('created_at', { ascending: false });

  if (schoolId) {
    query = query.eq('school_id', schoolId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching payments:', error);
    throw error;
  }

  return (data || []).map((p: any) => ({
    id: p.id,
    schoolId: p.school_id,
    amount: Number(p.amount),
    method: p.method,
    date: p.payment_date,
    observations: p.observations,
    status: p.status
  }));
}

export async function addPayment(payment: Payment): Promise<Payment> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

  const { data, error } = await supabase
    .from('payments')
    .insert({
      id: payment.id,
      school_id: payment.schoolId,
      amount: payment.amount,
      method: payment.method,
      payment_date: payment.date,
      observations: payment.observations,
      status: payment.status
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    schoolId: data.school_id,
    amount: Number(data.amount),
    method: data.method,
    date: data.payment_date,
    observations: data.observations,
    status: data.status
  };
}

export async function deletePayment(id: string): Promise<void> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

  const { error } = await supabase
    .from('payments')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function updatePayment(id: string, updates: Partial<Payment>): Promise<Payment> {
  if (!isSupabaseConfigured()) throw new Error("Supabase not configured");

  const payload: any = {};
  if (updates.status) payload.status = updates.status;
  if (updates.observations) payload.observations = updates.observations;

  const { data, error } = await supabase
    .from('payments')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    schoolId: data.school_id,
    amount: Number(data.amount),
    method: data.method,
    date: data.payment_date,
    observations: data.observations,
    status: data.status
  };
}

export { isSupabaseConfigured };

// --- Student Auth & Stats
export async function studentLogin(username: string): Promise<StudentProfile | null> {
  if (!isSupabaseConfigured()) return null;
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('username', username)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    school: data.school,
    schoolId: data.school_id ?? undefined,
    grade: data.grade,
    photo: data.photo_url ?? undefined,
    username: data.username,
    password: data.password,
    total_xp: data.total_xp ?? 0,
    double_xp_ends_at: data.double_xp_ends_at ?? undefined,
  };
}

export async function recordStudentStat(stat: { studentId: string; wordId: string; isCorrect: boolean; timeTaken: number; pointsEarned: number }): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const { error } = await supabase.from('student_stats').insert({
    student_id: stat.studentId,
    word_id: stat.wordId,
    is_correct: stat.isCorrect,
    time_taken: stat.timeTaken,
    points_earned: stat.pointsEarned
  });
  if (error) console.error("Error recording stat:", error);
}

export async function fetchLeaderboard(grade?: number): Promise<StudentProfile[]> {
  if (!isSupabaseConfigured()) return [];

  let query = supabase
    .from('students')
    .select('*')
    .gt('total_xp', 0)
    .order('total_xp', { ascending: false })
    .limit(50);

  if (grade) {
    query = query.eq('grade', grade);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    school: row.school ?? 'Unknown School', // Fallback
    grade: row.grade as GradeLevel,
    schoolId: row.school_id ?? undefined,
    photo: row.photo_url ?? undefined,
    total_xp: row.total_xp,
    current_streak: row.current_streak,
    last_practice_date: row.last_practice_date,
    double_xp_ends_at: row.double_xp_ends_at ?? undefined,
  }));
}

export async function fetchStudentAchievements(studentId: string): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];

  // In a real app we would fetch from 'student_achievements' table
  // For now, since the table might not exist in all environments or types might be missing,
  // we can return an empty array or try to fetch if table exists.

  // Attempt fetch
  try {
    const { data, error } = await supabase
      .from('student_achievements')
      .select('*')
      .eq('student_id', studentId);

    if (error) {
      console.warn("Could not fetch achievements (table might not exist yet):", error);
      return [];
    }

    return (data ?? []).map((row: any) => ({
      id: row.id,
      studentId: row.student_id,
      badgeKey: row.badge_key,
      unlockedAt: row.unlocked_at
    }));
  } catch (e) {
    return [];
  }
}

export async function unlockAchievement(studentId: string, badgeKey: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    // Check if already unlocked to avoid duplicates
    const { data: existing } = await supabase
      .from('student_achievements')
      .select('id')
      .eq('student_id', studentId)
      .eq('badge_key', badgeKey)
      .single();

    if (existing) return false; // Already unlocked

    const { error } = await supabase
      .from('student_achievements')
      .insert({ student_id: studentId, badge_key: badgeKey });

    if (error) {
      console.warn('Could not unlock achievement:', error);
      return false;
    }
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Evaluates all achievement conditions for a student and unlocks any newly earned ones.
 * Call this after any significant game event (correct answer, session end, etc.)
 * Returns an array of newly unlocked badge keys so the UI can show a celebration.
 */
export async function checkAndUnlockAchievements(
  studentId: string,
  context: {
    totalXp?: number;
    currentStreak?: number;
    sessionCorrectStreak?: number;  // consecutive correct in current session
    leaderboardRank?: number;
    timeTakenSeconds?: number;      // time of last answer (speed_demon)
    totalCorrectAnswers?: number;   // all-time correct answers
    coinsBalance?: number;          // current coin balance
    inventoryItemCount?: number;    // # of distinct items owned
  }
): Promise<string[]> {
  if (!isSupabaseConfigured()) return [];

  const existing = await fetchStudentAchievements(studentId);
  const unlockedKeys = new Set(existing.map((a: any) => a.badgeKey));
  const newlyUnlocked: string[] = [];

  const tryUnlock = async (key: string, condition: boolean) => {
    if (condition && !unlockedKeys.has(key)) {
      const success = await unlockAchievement(studentId, key);
      if (success) newlyUnlocked.push(key);
    }
  };

  const xp       = context.totalXp ?? 0;
  const streak   = context.currentStreak ?? 0;
  const sess     = context.sessionCorrectStreak ?? 0;
  const rank     = context.leaderboardRank ?? 99999;
  const t        = context.timeTakenSeconds ?? 99;
  const correct  = context.totalCorrectAnswers ?? 0;
  const coins    = context.coinsBalance ?? 0;
  const items    = context.inventoryItemCount ?? 0;

  await Promise.all([
    // ── Milestone ─────────────────────────────────────
    tryUnlock('first_win',        xp > 0 || sess >= 1),

    // ── Daily Streak ──────────────────────────────────
    tryUnlock('streak_3',         streak >= 3),
    tryUnlock('streak_7',         streak >= 7),
    tryUnlock('streak_14',        streak >= 14),
    tryUnlock('streak_30',        streak >= 30),
    tryUnlock('streak_60',        streak >= 60),
    tryUnlock('streak_100',       streak >= 100),

    // ── XP Tiers ──────────────────────────────────────
    tryUnlock('xp_100',           xp >= 100),
    tryUnlock('xp_500',           xp >= 500),
    tryUnlock('xp_1000',          xp >= 1000),
    tryUnlock('xp_2500',          xp >= 2500),
    tryUnlock('xp_5000',          xp >= 5000),
    tryUnlock('xp_10000',         xp >= 10000),
    tryUnlock('xp_15000',         xp >= 15000),
    tryUnlock('xp_25000',         xp >= 25000),
    tryUnlock('xp_50000',         xp >= 50000),

    // ── In-Session Streak ─────────────────────────────
    tryUnlock('hotstreak_10',     sess >= 10),
    tryUnlock('perfect_round',    sess >= 20),   // Perfectionist — 20 in a row
    tryUnlock('hotstreak_30',     sess >= 30),
    tryUnlock('hotstreak_50',     sess >= 50),

    // ── Speed ─────────────────────────────────────────
    tryUnlock('speed_demon',      t > 0 && t <= 3),

    // ── Total Correct Answers ─────────────────────────
    tryUnlock('correct_50',       correct >= 50),
    tryUnlock('correct_200',      correct >= 200),
    tryUnlock('correct_500',      correct >= 500),
    tryUnlock('correct_1000',     correct >= 1000),
    tryUnlock('correct_2500',     correct >= 2500),

    // ── Rank ──────────────────────────────────────────
    tryUnlock('top_5',            rank >= 1 && rank <= 5),
    tryUnlock('top_3',            rank >= 1 && rank <= 3),
    tryUnlock('champion',         rank === 1),

    // ── Economy ───────────────────────────────────────
    tryUnlock('coins_100',        coins >= 100),
    tryUnlock('coins_500',        coins >= 500),
    tryUnlock('first_purchase',   items >= 1),
    tryUnlock('collector',        items >= 3),

    // ── Prestige ──────────────────────────────────────
    tryUnlock('master',           xp >= 7001),
  ]);

  return newlyUnlocked;
}

// --- Gamification & Shop
export async function fetchStudentInventory(studentId: string): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('student_items')
      .select('*')
      .eq('student_id', studentId);

    if (error) {
      console.warn("Could not fetch inventory:", error);
      return [];
    }

    return data.map((item: any) => ({
      id: item.id,
      studentId: item.student_id,
      itemId: item.item_id,
      quantity: item.quantity,
      purchasedAt: item.purchased_at
    }));
  } catch (e) {
    return [];
  }
}

export async function purchaseItem(studentId: string, itemId: string, cost: number): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;

  // 1. Check/Deduct coins
  const { data: student, error: fetchError } = await supabase
    .from('students')
    .select('coins')
    .eq('id', studentId)
    .single();

  if (fetchError || !student || (student.coins || 0) < cost) {
    return false; // Not enough coins or error
  }

  const newBalance = (student.coins || 0) - cost;

  // 2. Deduct coins first
  const { error: updateError } = await supabase
    .from('students')
    .update({ coins: newBalance })
    .eq('id', studentId);

  if (updateError) return false;

  // 3. Add item to inventory — check if exists first to increment quantity
  const { data: existing } = await supabase
    .from('student_items')
    .select('*')
    .eq('student_id', studentId)
    .eq('item_id', itemId)
    .single();

  let itemError: any = null;

  if (existing) {
    const { error } = await supabase
      .from('student_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id);
    itemError = error;
  } else {
    const { error } = await supabase
      .from('student_items')
      .insert({
        student_id: studentId,
        item_id: itemId,
        quantity: 1
      });
    itemError = error;
  }

  // 4. If saving the item failed, refund the coins to avoid silent loss
  if (itemError) {
    console.error('Error saving item to inventory, refunding coins:', itemError);
    await supabase
      .from('students')
      .update({ coins: student.coins })
      .eq('id', studentId);
    return false;
  }

  return true;
}

export async function consumeInventoryItem(inventoryRowId: string, currentQuantity: number): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    if (currentQuantity <= 1) {
      await supabase.from('student_items').delete().eq('id', inventoryRowId);
    } else {
      await supabase.from('student_items').update({ quantity: currentQuantity - 1 }).eq('id', inventoryRowId);
    }
    return true;
  } catch (e) {
    return false;
  }
}

export async function addCoins(studentId: string, amount: number): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // RPC is better for atomic increment, but let's stick to select+update for consistency if RPC not set up
  // Actually, let's try a simple RPC call if it existed, otherwise fallback.
  // We'll stick to select-update for safety in this "no-rpc" assumption env.

  const { data: student } = await supabase.from('students').select('coins').eq('id', studentId).single();
  if (student) {
    const current = student.coins || 0;
    await supabase.from('students').update({ coins: current + amount }).eq('id', studentId);
  }
}

export async function activateDoubleXP(studentId: string, inventoryRowId: string, currentQuantity: number): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const endsAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 mins from now
    const { error: updateError } = await supabase
      .from('students')
      .update({ double_xp_ends_at: endsAt })
      .eq('id', studentId);
      
    if (updateError) throw updateError;
    
    // Consume the potion
    await consumeInventoryItem(inventoryRowId, currentQuantity);
    return true;
  } catch (e) {
    console.error("Error activating double xp:", e);
    return false;
  }
}

export async function checkAndUpdateStreak(studentId: string): Promise<{ streak: number, message?: string }> {
  if (!isSupabaseConfigured()) return { streak: 0 };

  // Use local date to avoid UTC timezone mismatch for students in Latin America (UTC-4/UTC-5)
  const todayLocal = new Date();
  const today = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;

  const { data: student, error } = await supabase
    .from('students')
    .select('current_streak, last_practice_date')
    .eq('id', studentId)
    .single();

  if (error || !student) return { streak: 0 };

  const lastDate = student.last_practice_date;

  // Already practiced today
  if (lastDate === today) {
    return { streak: student.current_streak || 0 };
  }

  // Check if yesterday — use local date to stay consistent with the local-date `today` above
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  if (lastDate === yesterdayStr) {
    // Increment streak
    const newStreak = (student.current_streak || 0) + 1;
    await supabase
      .from('students')
      .update({ current_streak: newStreak, last_practice_date: today })
      .eq('id', studentId);
    return { streak: newStreak, message: "Streak Increased!" };
  } else {
    // Missed a day (or more)
    // Check for any streak protection item (streak_freeze preferred, then streak_shield)
    const { data: freezeItem } = await supabase
      .from('student_items')
      .select('*')
      .eq('student_id', studentId)
      .in('item_id', ['streak_freeze', 'streak_shield'])
      .gt('quantity', 0)
      .order('item_id', { ascending: true }) // streak_freeze < streak_shield alphabetically — prefer freeze
      .limit(1)
      .single();

    if (freezeItem) {
      // Use the protection item (streak_freeze or streak_shield)
      await supabase
        .from('student_items')
        .update({ quantity: freezeItem.quantity - 1 })
        .eq('id', freezeItem.id);

      const savedStreak = (student.current_streak || 0) + 1;
      await supabase
        .from('students')
        .update({ current_streak: savedStreak, last_practice_date: today })
        .eq('id', studentId);
      const itemName = freezeItem.item_id === 'streak_freeze' ? 'Streak Freeze' : 'Streak Shield';
      return { streak: savedStreak, message: `${itemName} used! Streak saved!` };
    } else {
      // Reset Streak
      const newStreak = 1;
      await supabase
        .from('students')
        .update({ current_streak: newStreak, last_practice_date: today })
        .eq('id', studentId);

      return { streak: newStreak, message: 'Streak reset — missed a day.' };
    }
  }
}

// --- Sponsors
export async function fetchSponsors(): Promise<Sponsor[]> {
  if (!isSupabaseConfigured()) {
    const local = localStorage.getItem('spellbound_sponsors');
    return local ? JSON.parse(local) : [];
  }
  const { data, error } = await supabase.from('sponsors').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    websiteUrl: row.website_url,
    tier: row.tier
  }));
}

export async function addSponsor(sponsor: Sponsor): Promise<Sponsor> {
  if (!isSupabaseConfigured()) {
    const current = await fetchSponsors();
    const updated = [...current, sponsor];
    localStorage.setItem('spellbound_sponsors', JSON.stringify(updated));
    return sponsor;
  }

  let logoUrl = sponsor.logoUrl;
  if (isDataUrl(logoUrl)) {
    // Assume bucket exists or repurpose existing bucket for now if strict
    // ideally create 'sponsors' bucket. using 'school-resources' or 'word-images' as fallback?
    // Let's use 'school-resources' for now to avoid creating new bucket logic if not needed, or 'word-images'
    // actually let's stick to base64 if bucket not guaranteed or just upload to 'word-images' generic
    logoUrl = await uploadDataUrlToStorage(BUCKET_WORD_IMAGES, `sponsor-${sponsor.id}.png`, logoUrl);
  }

  const { data, error } = await supabase
    .from('sponsors')
    .insert({
      id: sponsor.id,
      name: sponsor.name,
      logo_url: logoUrl,
      website_url: sponsor.websiteUrl,
      tier: sponsor.tier
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    logoUrl: data.logo_url,
    websiteUrl: data.website_url,
    tier: data.tier
  };
}

export async function deleteSponsor(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const current = await fetchSponsors();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem('spellbound_sponsors', JSON.stringify(updated));
    return;
  }
  const { error } = await supabase.from('sponsors').delete().eq('id', id);
  if (error) throw error;
}

// --- Vendors
export async function fetchVendors(): Promise<Vendor[]> {
  if (!isSupabaseConfigured()) {
    const local = localStorage.getItem('spellbound_vendors');
    return local ? JSON.parse(local) : [];
  }
  const { data, error } = await supabase.from('vendors').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    logoUrl: row.logo_url,
    location: row.location
  }));
}

export async function addVendor(vendor: Vendor): Promise<Vendor> {
  if (!isSupabaseConfigured()) {
    const current = await fetchVendors();
    const updated = [...current, vendor];
    localStorage.setItem('spellbound_vendors', JSON.stringify(updated));
    return vendor;
  }

  let logoUrl = vendor.logoUrl;
  if (isDataUrl(logoUrl)) {
    logoUrl = await uploadDataUrlToStorage(BUCKET_WORD_IMAGES, `vendor-${vendor.id}.png`, logoUrl);
  }

  const { data, error } = await supabase
    .from('vendors')
    .insert({
      id: vendor.id,
      name: vendor.name,
      description: vendor.description,
      logo_url: logoUrl,
      location: vendor.location
    })
    .select()
    .single();

  if (error) throw error;
  return {
    id: data.id,
    name: data.name,
    description: data.description,
    logoUrl: data.logo_url,
    location: data.location
  };
}

export async function deleteVendor(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    const current = await fetchVendors();
    const updated = current.filter(v => v.id !== id);
    localStorage.setItem('spellbound_vendors', JSON.stringify(updated));
    return;
  }
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchStudentWordStats(studentId: string): Promise<any[]> {
  if (!isSupabaseConfigured()) return [];

  // Fetch last 500 attempts to build a good history profile
  const { data, error } = await supabase
    .from('student_stats')
    .select('*')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.warn("Could not fetch student stats for SRS:", error);
    return [];
  }

  return data ?? [];
}
