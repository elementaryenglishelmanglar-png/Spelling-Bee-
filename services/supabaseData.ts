import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { WordEntry, StudentProfile, Session, GradeLevel, School, Payment } from '../types';

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
      difficulty: entry.difficulty ?? null,
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
    difficulty: data.difficulty ?? undefined,
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
    difficulty: entry.difficulty ?? null,
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
    difficulty: data.difficulty ?? undefined,
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
    school: row.school_name ?? 'Unknown School', // Fallback
    grade: row.grade as GradeLevel,
    schoolId: row.school_id ?? undefined,
    photo: row.photo_url ?? undefined,
    total_xp: row.total_xp,
    current_streak: row.current_streak,
    last_practice_date: row.last_practice_date,
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

  // 2. Transaction (Deduct coins + Add Item)
  // Note: simpler to do sequentially without Rpc for now, though not atomic.

  // Update coins
  const { error: updateError } = await supabase
    .from('students')
    .update({ coins: newBalance })
    .eq('id', studentId);

  if (updateError) return false;

  // Add item
  // Check if exists first to increment quantity
  const { data: existing } = await supabase
    .from('student_items')
    .select('*')
    .eq('student_id', studentId)
    .eq('item_id', itemId)
    .single();

  if (existing) {
    await supabase
      .from('student_items')
      .update({ quantity: existing.quantity + 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('student_items')
      .insert({
        student_id: studentId,
        item_id: itemId,
        quantity: 1
      });
  }

  return true;
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

export async function checkAndUpdateStreak(studentId: string): Promise<{ streak: number, message?: string }> {
  if (!isSupabaseConfigured()) return { streak: 0 };

  const today = new Date().toISOString().split('T')[0];

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

  // Check if yesterday
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

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
    // Check for Streak Freeze
    const { data: freezeItem } = await supabase
      .from('student_items')
      .select('*')
      .eq('student_id', studentId)
      .eq('item_id', 'streak_freeze')
      .gt('quantity', 0)
      .single();

    if (freezeItem) {
      // Use Streak Freeze
      await supabase
        .from('student_items')
        .update({ quantity: freezeItem.quantity - 1 })
        .eq('id', freezeItem.id);

      // Keep streak (don't increment, but don't reset? Or increment? Usually you carry over)
      // Let's say we Keep it and just update the date to today so they don't lose it.
      // Actually, if they practice *today*, they should keep the streak AND increment it, effectively bridging the gap.
      // But if the gap is huge (e.g. 5 days ago), one freeze might not be enough?
      // Simplified: If last practice was NOT yesterday, but we have a freeze, we consume it to "pretend" we practiced yesterday.
      // So we effectively Increment the old streak.

      const savedStreak = (student.current_streak || 0) + 1;
      await supabase
        .from('students')
        .update({ current_streak: savedStreak, last_practice_date: today })
        .eq('id', studentId);

      return { streak: savedStreak, message: "Streak Frozen Used! Streak Saved!" };
    } else {
      // Reset Streak
      // If it's the very first time (lastDate is null), streak becomes 1.
      const newStreak = 1;
      await supabase
        .from('students')
        .update({ current_streak: newStreak, last_practice_date: today })
        .eq('id', studentId);
      return { streak: newStreak, message: lastDate ? "Streak Reset!" : "First Day!" };
    }
  }
}
