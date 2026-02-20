export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface WordEntry {
  id: string;
  word: string;
  definition: string;
  example: string;
  grade: GradeLevel;
  partOfSpeech?: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction';
  theme?: string;
  image?: string; // Base64 string for word flashcard image
  audioUrl?: string; // URL for the pronunciation audio file
}

export interface WordEnrichmentResponse {
  definition: string;
  example: string;
  partOfSpeech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction';
  theme: string;
}

// The database record for a student
export interface StudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  school: string;
  grade: GradeLevel;
  schoolId?: string; // Link to the Invited School
  photo?: string; // Base64 string of the student's photo
  username?: string;
  password?: string;
  total_xp?: number;
  current_streak?: number;
  last_practice_date?: string;
  coins?: number;
}

export interface Achievement {
  id: string;
  studentId: string;
  badgeKey: string;
  unlockedAt: string;
}

export interface InventoryItem {
  id: string; // unique db id
  studentId: string;
  itemId: string; // e.g. 'streak_freeze'
  quantity: number;
  purchasedAt: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: any; // Lucide icon
}

export interface StudentStat {
  id: string;
  studentId: string;
  wordId: string;
  isCorrect: boolean;
  timeTaken: number;
  pointsEarned: number;
  createdAt: string;
}

// The active participant in a specific session
export interface Student {
  id: string;
  name: string; // Full name for display
  school: string;
  status: 'active' | 'eliminated';
  photo?: string; // Carry over photo to active session
}

export interface Attempt {
  timestamp: number;
  studentId: string;
  studentName: string;
  wordId: string;
  wordText: string;
  typedSpelling: string; // What the teacher typed
  protocolOpened: boolean; // "Say" before spelling
  protocolClosed: boolean; // "Say" after spelling
  wordNumber: number;
  result: 'correct' | 'incorrect' | 'skipped';
  round: number;
  isExtra?: boolean; // For tie-breakers or extra words
}

export type Stage = 'Play-offs' | 'Final';
export type ContestType = 'Internal' | 'Interschool';

export interface Session {
  id: string;
  date: string; // ISO String
  grade: GradeLevel;
  moderator: string; // Teacher/Judge name
  stage?: Stage;
  contestType?: ContestType;
  attempts: Attempt[];
  durationSeconds: number;
}

export interface School {
  id: string;
  name: string;
  username: string;
  password?: string;
  logo?: string; // Base64 or URL
}

export interface Payment {
  id: string;
  schoolId: string;
  amount: number;
  method: string; // Default 'Cash USD'
  date: string;
  observations?: string;
  status: 'pending' | 'verified' | 'rejected';
}

export type Role = 'teacher' | 'student' | 'admin' | 'school' | null;

export interface SchoolResource {
  id: string;
  title: string;
  description?: string;
  fileUrl: string;
  grade: GradeLevel;
  createdAt: string;
}

export type ViewState = 'dashboard' | 'session' | 'history' | 'manage' | 'students' | 'student-generator' | 'student-drill' | 'leaderboard' | 'manage-sponsors' | 'manage-vendors';

export interface Sponsor {
  id: string;
  name: string;
  logoUrl: string;
  websiteUrl?: string;
  tier?: 'Gold' | 'Silver' | 'Bronze';
}

export interface Vendor {
  id: string;
  name: string;
  description: string;
  logoUrl: string; // Or a product image
  location?: string; // Stand number or map location
}