export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export interface WordEntry {
  id: string;
  word: string;
  definition: string;
  example: string;
  grade: GradeLevel;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  image?: string; // Base64 string for word flashcard image
  audioUrl?: string; // URL for the pronunciation audio file
}

export interface WordEnrichmentResponse {
  definition: string;
  example: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
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
}

export interface Achievement {
  id: string;
  studentId: string;
  badgeKey: string;
  unlockedAt: string;
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

export type ViewState =
  | 'dashboard'
  | 'manage'
  | 'students'
  | 'session'
  | 'history'
  | 'student-generator'
  | 'student-drill';