import React, { useState, useEffect } from 'react';
import { GradeLevel, ViewState, WordEntry, Session, Role, StudentProfile } from './types';
import { Dashboard } from './views/Dashboard';
import { PracticeMode } from './views/PracticeMode'; // Teacher Session Mode
import { HistoryView } from './views/HistoryView';
import { WordList } from './components/WordList';
import { WordForm } from './components/WordForm';
import { WelcomeScreen } from './views/WelcomeScreen';
import { StudentGenerator } from './views/StudentGenerator';
import { StudentDrill } from './views/StudentDrill';
import { StudentsManager } from './views/StudentsManager'; // New View
import { LayoutDashboard, List, Play, Book, History, LogOut, Sparkles, GraduationCap, Users } from 'lucide-react';
import { hasTeacherSession, clearTeacherSession } from './lib/auth';
import { ToastProvider, useToast } from './lib/toastContext';
import { ToastContainer } from './components/Toast';
import { LoadingOverlay } from './components/LoadingSpinner';

import {
  isSupabaseConfigured,
  fetchWords as fetchWordsFromSupabase,
  fetchStudents as fetchStudentsFromSupabase,
  fetchSessions as fetchSessionsFromSupabase,
  addWord as addWordToSupabase,
  updateWord as updateWordInSupabase,
  deleteWord as deleteWordFromSupabase,
  addStudent as addStudentToSupabase,
  updateStudent as updateStudentInSupabase,
  deleteStudent as deleteStudentFromSupabase,
  addSession as addSessionToSupabase,
} from './services/supabaseData';

const WORDS_STORAGE_KEY = 'spellbound_words_v1';
const SESSIONS_STORAGE_KEY = 'spellbound_sessions_v1';
const STUDENTS_STORAGE_KEY = 'spellbound_students_v1';

// Imagen de la abeja: guarda tu archivo como public/bee.png (PNG, JPG o WebP)
const BEE_IMAGE_URL = "/bee.png";

const AppContent: React.FC = () => {
  const { showToast, toasts, removeToast } = useToast();
  const [role, setRole] = useState<Role>(() => (hasTeacherSession() ? 'teacher' : null));
  const [view, setView] = useState<ViewState>('dashboard');
  
  const [words, setWords] = useState<WordEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [manageGrade, setManageGrade] = useState<GradeLevel>(1);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState(false);

  // Cargar datos: Supabase o localStorage
  useEffect(() => {
    let cancelled = false;
    setDataError(null);
    if (isSupabaseConfigured()) {
      setDataLoading(true);
      (async () => {
        try {
          const [w, s, sess] = await Promise.all([
            fetchWordsFromSupabase(),
            fetchStudentsFromSupabase(),
            fetchSessionsFromSupabase(),
          ]);
          if (cancelled) return;
          setWords(w);
          setStudents(s);
          setSessions(sess);
          if (!cancelled) showToast('Data loaded successfully', 'success');
        } catch (e) {
          if (!cancelled) {
            const errorMsg = e instanceof Error ? e.message : 'Error loading data';
            setDataError(errorMsg);
            showToast(`Failed to load data: ${errorMsg}`, 'error');
          }
        } finally {
          if (!cancelled) setDataLoading(false);
        }
      })();
    } else {
      const savedWords = localStorage.getItem(WORDS_STORAGE_KEY);
      if (savedWords) {
        try {
          setWords(JSON.parse(savedWords));
        } catch (e) {
          console.error("Failed to parse words", e);
        }
      } else {
        setWords([]);
        localStorage.setItem(WORDS_STORAGE_KEY, '[]');
      }
      const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
      if (savedSessions) {
        try {
          setSessions(JSON.parse(savedSessions));
        } catch (e) {
          console.error("Failed to parse sessions", e);
        }
      }
      const savedStudents = localStorage.getItem(STUDENTS_STORAGE_KEY);
      if (savedStudents) {
        try {
          setStudents(JSON.parse(savedStudents));
        } catch (e) {
          console.error("Failed to parse students", e);
        }
      }
      setDataLoading(false);
    }
    return () => { cancelled = true; };
  }, []);

  // Persistir a localStorage solo cuando NO usamos Supabase
  useEffect(() => {
    if (dataLoading || isSupabaseConfigured()) return;
    if (words.length > 0) localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(words));
  }, [words, dataLoading]);
  useEffect(() => {
    if (dataLoading || isSupabaseConfigured()) return;
    if (sessions.length > 0) localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions, dataLoading]);
  useEffect(() => {
    if (dataLoading || isSupabaseConfigured()) return;
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  }, [students, dataLoading]);

  const handleRoleSelect = (newRole: Role) => {
    setRole(newRole);
    // Set default view based on role
    if (newRole === 'teacher') setView('dashboard');
    if (newRole === 'student') setView('student-generator');
  };

  const handleLogout = () => {
    clearTeacherSession();
    setRole(null);
  };

  const addWord = async (newWord: WordEntry) => {
    if (isSupabaseConfigured()) {
      try {
        const added = await addWordToSupabase(newWord);
        setWords(prev => [...prev, added]);
        showToast(`Word "${newWord.word}" added successfully`, 'success');
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to add word';
        showToast(errorMsg, 'error');
        console.error('Failed to add word', e);
      }
    } else {
      setWords(prev => [...prev, newWord]);
      showToast(`Word "${newWord.word}" added successfully`, 'success');
    }
  };

  const updateWord = async (updatedWord: WordEntry) => {
    if (isSupabaseConfigured()) {
      try {
        const updated = await updateWordInSupabase(updatedWord);
        setWords(prev => prev.map(w => w.id === updated.id ? updated : w));
        showToast(`Word "${updatedWord.word}" updated successfully`, 'success');
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to update word';
        showToast(errorMsg, 'error');
        console.error('Failed to update word', e);
      }
    } else {
      setWords(prev => prev.map(w => w.id === updatedWord.id ? updatedWord : w));
      showToast(`Word "${updatedWord.word}" updated successfully`, 'success');
    }
  };

  const deleteWord = async (id: string) => {
    const word = words.find(w => w.id === id);
    if (isSupabaseConfigured()) {
      try {
        await deleteWordFromSupabase(id);
        setWords(prev => prev.filter(w => w.id !== id));
        showToast(`Word "${word?.word || ''}" deleted successfully`, 'success');
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to delete word';
        showToast(errorMsg, 'error');
        console.error('Failed to delete word', e);
      }
    } else {
      setWords(prev => prev.filter(w => w.id !== id));
      showToast(`Word "${word?.word || ''}" deleted successfully`, 'success');
    }
  };

  const saveSession = async (newSession: Session) => {
    setSavingSession(true);
    try {
      if (isSupabaseConfigured()) {
        await addSessionToSupabase(newSession);
      }
      setSessions(prev => [newSession, ...prev]);
      showToast('Session saved successfully!', 'success');
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to save session';
      showToast(errorMsg, 'error');
      console.error('Failed to save session', e);
    } finally {
      setSavingSession(false);
    }
  };

  const addStudent = async (newStudent: StudentProfile) => {
    if (isSupabaseConfigured()) {
      try {
        const added = await addStudentToSupabase(newStudent);
        setStudents(prev => [...prev, added]);
      } catch (e) {
        console.error('Failed to add student', e);
      }
    } else {
      setStudents(prev => [...prev, newStudent]);
    }
  };

  const updateStudent = async (updated: StudentProfile) => {
    if (isSupabaseConfigured()) {
      try {
        const result = await updateStudentInSupabase(updated);
        setStudents(prev => prev.map(s => s.id === result.id ? result : s));
      } catch (e) {
        console.error('Failed to update student', e);
      }
    } else {
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
    }
  };

  const deleteStudent = async (id: string) => {
    if (isSupabaseConfigured()) {
      try {
        await deleteStudentFromSupabase(id);
        setStudents(prev => prev.filter(s => s.id !== id));
      } catch (e) {
        console.error('Failed to delete student', e);
      }
    } else {
      setStudents(prev => prev.filter(s => s.id !== id));
    }
  };

  const NavButton = ({ target, icon: Icon, label }: { target: ViewState, icon: any, label: string }) => (
    <button
      onClick={() => setView(target)}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm font-bold ${
        view === target 
          ? role === 'teacher' ? 'bg-stone-800 text-yellow-400' : 'bg-yellow-400 text-stone-900 shadow-sm'
          : 'text-stone-500 hover:bg-orange-50 hover:text-stone-800'
      }`}
    >
      <Icon size={18} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  // 1. Welcome Screen
  if (!role) {
    return <WelcomeScreen onSelectRole={handleRoleSelect} beeImageUrl={BEE_IMAGE_URL} />;
  }

  // 2. Loading inicial de datos
  if (dataLoading) {
    return (
      <div className="min-h-screen bg-orange-50/30 flex items-center justify-center font-sans">
        <div className="text-center text-stone-600">
          <div className="inline-block w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="font-medium">Cargando datos...</p>
        </div>
      </div>
    );
  }

  // 3. Main App Layout
  return (
    <div className="min-h-screen bg-orange-50/30 flex flex-col font-sans">
      <LoadingOverlay isLoading={savingSession} text="Saving session..." />
      {dataError && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-center text-sm font-medium">
          {dataError} (comprobando conexión o variables de Supabase)
        </div>
      )}
      {/* Navbar */}
      <nav className="bg-white border-b border-stone-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${role === 'teacher' ? 'bg-stone-800 text-yellow-400' : 'bg-yellow-400 text-stone-900'}`}>
                <Book size={20} strokeWidth={2.5} />
              </div>
              <span className="text-lg sm:text-xl font-bold text-stone-800">
                Spelling Bee <span className="hidden sm:inline text-stone-400">|</span> <span className="text-stone-500 text-sm font-medium uppercase tracking-widest ml-1">{role}</span>
              </span>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              {role === 'teacher' && (
                <>
                  <NavButton target="dashboard" icon={LayoutDashboard} label="Dashboard" />
                  <NavButton target="students" icon={Users} label="Students" />
                  <NavButton target="manage" icon={List} label="Lists" />
                  <NavButton target="session" icon={Play} label="Session" />
                  <NavButton target="history" icon={History} label="History" />
                </>
              )}
              
              {role === 'student' && (
                <>
                  <NavButton target="student-generator" icon={Sparkles} label="Practice" />
                  <NavButton target="student-drill" icon={GraduationCap} label="Exercises" />
                </>
              )}

              <div className="h-6 w-px bg-stone-200 mx-2"></div>
              
              <button 
                onClick={handleLogout}
                className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Switch Role / Logout"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* --- TEACHER VIEWS --- */}
        {role === 'teacher' && (
          <>
            {view === 'dashboard' && <Dashboard words={words} sessions={sessions} onChangeView={setView} beeImageUrl={BEE_IMAGE_URL} />}
            
            {view === 'students' && (
                <StudentsManager 
                    students={students} 
                    onAddStudent={addStudent} 
                    onUpdateStudent={updateStudent}
                    onDeleteStudent={deleteStudent} 
                />
            )}
            
            {view === 'manage' && (
              <div className="animate-fade-in space-y-6">
                 <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-stone-800">Manage Word Lists</h2>
                    <p className="text-stone-500">Add, remove, and review words for each grade level.</p>
                  </div>
                  <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                      <button
                        key={g}
                        onClick={() => setManageGrade(g as GradeLevel)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${
                          manageGrade === g
                            ? 'bg-yellow-400 text-stone-900 shadow-md'
                            : 'text-stone-500 hover:bg-orange-50 hover:text-stone-800'
                        }`}
                      >
                        Grade {g}
                      </button>
                    ))}
                  </div>
                </header>
                <WordForm currentGrade={manageGrade} onAddWord={addWord} />
                <div className="bg-stone-200 h-px w-full my-6"></div>
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-stone-700 flex items-center justify-between">
                    <span>Current List (Grade {manageGrade})</span>
                    <span className="text-xs font-bold bg-stone-200 text-stone-600 px-2 py-1 rounded-full">
                      {words.filter(w => w.grade === manageGrade).length} words
                    </span>
                  </h3>
                  <WordList 
                    words={words} 
                    currentGrade={manageGrade} 
                    onDelete={deleteWord} 
                    onUpdate={updateWord}
                  />
                </div>
              </div>
            )}

            {view === 'session' && (
              <PracticeMode 
                words={words} 
                registeredStudents={students}
                onSaveSession={saveSession} 
              />
            )}

            {view === 'history' && (
              <HistoryView sessions={sessions} />
            )}
          </>
        )}

        {/* --- STUDENT VIEWS --- */}
        {role === 'student' && (
          <>
            {view === 'student-generator' && <StudentGenerator words={words} beeImageUrl={BEE_IMAGE_URL} />}
            {view === 'student-drill' && <StudentDrill words={words} />}
          </>
        )}

      </main>
      
      <footer className="bg-white border-t border-stone-200 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center text-stone-400 text-sm">
          <p>© {new Date().getFullYear()} Spelling Bee Manager. Powered by Gemini API.</p>
        </div>
      </footer>
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;