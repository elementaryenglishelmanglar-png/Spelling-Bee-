import React, { useState, useMemo, useEffect } from 'react';
import { StudentProfile, GradeLevel, WordEntry } from '../types';
import { Volume2, Eye, EyeOff, RefreshCw, ArrowRight, LogIn, User, Sparkles, GraduationCap, Trophy, LayoutDashboard, Award } from 'lucide-react';
import { studentLogin } from '../services/supabaseData';
import { StudentDrill } from './StudentDrill';
import { StudentDashboard } from './StudentDashboard';

interface StudentGeneratorProps {
  words: WordEntry[];
  beeImageUrl?: string;
  activeStudent: StudentProfile | null;
  onLogin: (student: StudentProfile) => void;
  onRefreshStudent?: () => void;
}

export const StudentGenerator: React.FC<StudentGeneratorProps> = ({ words, beeImageUrl, activeStudent, onLogin, onRefreshStudent }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(activeStudent?.grade || 1);
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [mode, setMode] = useState<'dashboard' | 'generator' | 'drill'>('dashboard');

  // Login State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Update selected grade if activeStudent changes
  useEffect(() => {
    if (activeStudent) {
      setSelectedGrade(activeStudent.grade);
    }
  }, [activeStudent]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setLoginError('');

    try {
      const student = await studentLogin(username);
      if (student && student.password === password) {
        onLogin(student);
        setUsername('');
        setPassword('');
      } else {
        setLoginError('Invalid username or password');
      }
    } catch (err) {
      setLoginError('Login failed. Please try again.');
    } finally {
      setLoggingIn(false);
    }
  };

  const gradeWords = useMemo(() => words.filter(w => w.grade === selectedGrade), [words, selectedGrade]);

  const generateWord = () => {
    if (gradeWords.length === 0) return;

    // Avoid immediate repeat if possible
    let nextWord;
    if (gradeWords.length === 1) {
      nextWord = gradeWords[0];
    } else {
      do {
        const randomIndex = Math.floor(Math.random() * gradeWords.length);
        nextWord = gradeWords[randomIndex];
      } while (nextWord.id === currentWord?.id);
    }

    setCurrentWord(nextWord);
    setIsRevealed(false);
  };

  const speak = (audioUrl?: string) => {
    if (audioUrl) {
      new Audio(audioUrl).play().catch(e => console.warn("Audio playback failed", e));
    }
  };

  if (!activeStudent) {
    return (
      <div className="max-w-md mx-auto mt-12 animate-fade-in">
        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-xl text-center">
          <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <User size={40} />
          </div>
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Student Login</h2>
          <p className="text-stone-500 mb-8">Enter your credentials to start practicing.</p>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
                placeholder="Enter your username"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-500 uppercase mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-yellow-400 outline-none"
                placeholder="Enter your password"
              />
            </div>

            {loginError && (
              <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-2 rounded-lg">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn || !username || !password}
              className="w-full py-4 bg-yellow-400 hover:bg-yellow-300 text-stone-900 rounded-xl font-bold shadow-lg transition-all hover:scale-[1.02] disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
            >
              {loggingIn ? 'Logging in...' : <><LogIn size={20} /> Login</>}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Render Dashboard
  if (mode === 'dashboard') {
    return (
      <StudentDashboard
        student={activeStudent}
        onStartPractice={(newMode) => setMode(newMode)}
        onRefreshStudent={onRefreshStudent}
      />
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in relative">

      {/* Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm flex items-center justify-between">
        <button
          onClick={() => setMode('dashboard')}
          className="flex items-center gap-2 text-stone-500 hover:text-stone-800 font-bold px-4 py-2 rounded-lg hover:bg-stone-50 transition-colors"
        >
          <ArrowRight className="rotate-180" size={18} /> Back to Dashboard
        </button>
        <div className="text-sm font-bold text-stone-400 uppercase tracking-widest">
          {mode === 'generator' ? 'Word Generator' : 'Exercises'}
        </div>
      </div>

      {mode === 'generator' && (
        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm text-center relative z-10 animate-fade-in">
          <h2 className="text-2xl font-bold text-stone-800 mb-2">Random Word Generator</h2>
          <p className="text-stone-500 mb-6">
            Practicing <span className="font-bold text-stone-800">Grade {selectedGrade}</span> words
          </p>

          {/* Grade selection removed for students */}

          {!currentWord ? (
            <div className="py-12 border-2 border-dashed border-stone-200 rounded-xl bg-orange-50/50 flex flex-col items-center">
              {beeImageUrl && (
                <img src={beeImageUrl} className="w-24 h-24 object-contain mb-4 animate-bounce" alt="Waiting Bee" />
              )}
              <p className="text-stone-400 mb-4 font-medium">{gradeWords.length} words available for Grade {selectedGrade}</p>
              <button
                onClick={generateWord}
                disabled={gradeWords.length === 0}
                className="px-8 py-3 bg-yellow-400 hover:bg-yellow-300 text-stone-900 rounded-full font-bold shadow-lg transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-500"
              >
                Start Practice
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-3xl p-8 text-stone-900 shadow-xl relative overflow-hidden group">
                {beeImageUrl && (
                  <div className="absolute -right-4 -bottom-4 w-32 h-32 opacity-20 group-hover:opacity-40 transition-opacity">
                    <img src={beeImageUrl} className="w-full h-full object-contain transform -rotate-12" alt="Background Bee" />
                  </div>
                )}
                <div className="relative z-10">
                  <p className="text-stone-800 text-xs font-bold uppercase tracking-widest mb-4 opacity-70">Word to Spell</p>

                  {isRevealed ? (
                    <h1 className="text-4xl md:text-5xl font-black mb-6 drop-shadow-sm">{currentWord.word}</h1>
                  ) : (
                    <div className="text-4xl md:text-5xl font-black mb-6 tracking-widest opacity-50">
                      ? ? ? ? ?
                    </div>
                  )}

                  <div className="flex justify-center gap-4">
                    <button
                      onClick={() => speak(currentWord.audioUrl)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/30 hover:bg-white/40 rounded-full backdrop-blur-sm transition-all font-bold"
                    >
                      <Volume2 size={18} /> Pronounce
                    </button>
                    <button
                      onClick={() => setIsRevealed(!isRevealed)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-stone-900/20 hover:bg-stone-900/30 rounded-full backdrop-blur-sm transition-all font-bold text-white"
                    >
                      {isRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                      {isRevealed ? 'Hide' : 'Reveal'}
                    </button>
                  </div>
                </div>
              </div>

              {isRevealed && (
                <div className="bg-white rounded-xl p-6 text-left border border-stone-200 animate-slide-up shadow-sm flex flex-col md:flex-row gap-6">

                  {currentWord.image && (
                    <div className="w-full md:w-1/3 flex-shrink-0">
                      <div className="aspect-square rounded-xl bg-stone-100 overflow-hidden border border-stone-200">
                        <img src={currentWord.image} alt={currentWord.word} className="w-full h-full object-cover" />
                      </div>
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="mb-4">
                      <h4 className="text-xs font-bold text-stone-400 uppercase">Definition</h4>
                      <p className="text-stone-800 font-medium text-lg leading-relaxed">{currentWord.definition}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-400 uppercase">Example Sentence</h4>
                      <p className="text-stone-600 italic text-lg">"{currentWord.example}"</p>
                    </div>
                  </div>

                  {!currentWord.image && beeImageUrl && (
                    <div className="hidden sm:block w-24 flex-shrink-0 flex items-center justify-center self-center opacity-50">
                      <img src={beeImageUrl} className="w-full object-contain" alt="Smart Bee" />
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={generateWord}
                className="w-full py-4 bg-stone-800 hover:bg-stone-900 text-yellow-400 rounded-xl font-bold flex items-center justify-center gap-2 transition-all hover:shadow-md"
              >
                Next Word <ArrowRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}

      {mode === 'drill' && (
        <StudentDrill words={words} activeStudent={activeStudent} />
      )}
    </div>
  );
};