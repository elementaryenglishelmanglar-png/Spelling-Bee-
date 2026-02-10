export type GradeLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

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
  photo?: string; // Base64 string of the student's photo
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

export type Role = 'teacher' | 'student' | null;

export type ViewState =
  | 'dashboard'
  | 'manage'
  | 'students'
  | 'session'
  | 'history'
  | 'student-generator'
  | 'student-drill';