import React, { useState, useEffect } from 'react';
import { GradeLevel, ViewState, WordEntry, Session, Role, StudentProfile, Sponsor } from './types';
import { Dashboard } from './views/Dashboard';
import { PracticeMode } from './views/PracticeMode'; // Teacher Session Mode
import { HistoryView } from './views/HistoryView';
import { WordList } from './components/WordList';
import { WordForm } from './components/WordForm';
import { ExcelImport } from './components/ExcelImport';
import { WelcomeScreen } from './views/WelcomeScreen';
import { StudentGenerator } from './views/StudentGenerator';
import { StudentDrill } from './views/StudentDrill';
import { StudentsManager } from './views/StudentsManager';
import { InvitedSchoolDashboard } from './views/InvitedSchoolDashboard';
import { InterschoolManager } from './views/InterschoolManager';
import { Leaderboard } from './views/Leaderboard';
import { SponsorsManager } from './views/SponsorsManager';
import { VendorsManager } from './views/VendorsManager';
import { LiveEventDisplay } from './views/LiveEventDisplay';
import { LiveEventControls } from './views/LiveEventControls';

import { LayoutDashboard, List, Play, Book, History, LogOut, Sparkles, GraduationCap, Users, School as SchoolIcon, Globe, Trophy, X, Download, Share2, Monitor } from 'lucide-react';
import { hasTeacherSession, clearTeacherSession, hasSchoolSession, getSchoolSession, clearSchoolSession, SchoolSessionData } from './lib/auth';
import { ToastProvider, useToast } from './lib/toastContext';
import { ToastContainer } from './components/Toast';
import { LoadingOverlay } from './components/LoadingSpinner';
import { AnimatePresence } from 'framer-motion';
import { PageTransition } from './components/PageTransition';
import { Analytics } from '@vercel/analytics/react';

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
  deleteSession,
  fetchSponsors,
} from './services/supabaseData';
import { supabase } from './lib/supabase';

const WORDS_STORAGE_KEY = 'spellbound_words_v1';
const SESSIONS_STORAGE_KEY = 'spellbound_sessions_v1';
const STUDENTS_STORAGE_KEY = 'spellbound_students_v1';

// Imagen de la abeja: guarda tu archivo como public/bee.png (PNG, JPG o WebP)
const BEE_IMAGE_URL = "/bee.png";

const AppContent: React.FC = () => {
  const { showToast, toasts, removeToast } = useToast();

  const [role, setRole] = useState<Role>(() => {
    if (hasTeacherSession()) return 'teacher';
    if (hasSchoolSession()) return 'school';
    return null;
  });

  const [schoolSession, setSchoolSession] = useState<SchoolSessionData | null>(() => getSchoolSession());

  const [view, setView] = useState<ViewState>('dashboard');

  const [words, setWords] = useState<WordEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [manageGrade, setManageGrade] = useState<GradeLevel>(1);
  const [dataLoading, setDataLoading] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);
  const [savingSession, setSavingSession] = useState(false);
  const [activeStudent, setActiveStudent] = useState<StudentProfile | null>(null);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIosInstallBanner, setShowIosInstallBanner] = useState(false);

  useEffect(() => {
    // Detect iOS
    const isIos = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      return /iphone|ipad|ipod/.test(userAgent);
    };

    // Detect if app is already in standalone mode
    const isInStandaloneMode = () => ('standalone' in window.navigator) && (window.navigator as any).standalone;

    // Listen for the beforeinstallprompt event (Android / Desktop Chrome)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if app is already installed to hide banner
    window.addEventListener('appinstalled', () => {
      setShowInstallBanner(false);
      setShowIosInstallBanner(false);
      setDeferredPrompt(null);
      showToast('¡App instalada exitosamente!', 'success');
    });

    // If it's iOS and not already installed, show the custom iOS text banner
    if (isIos() && !isInStandaloneMode()) {
      setShowIosInstallBanner(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  useEffect(() => {
    // Load sponsors for global footer usage
    const loadSponsors = async () => {
      try {
        const data = await fetchSponsors();
        setSponsors(data);
      } catch (e) {
        console.error("Failed to load sponsors for footer", e);
      }
    };
    loadSponsors();
  }, [view]);

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
    if (newRole === 'school') {
      const session = getSchoolSession();
      if (session) {
        setSchoolSession(session);
      }
      // InvitedSchoolDashboard doesn't use 'view' state the same way, it has internal tabs, 
      // or we can map it. For now, we just render the component.
    }
  };

  const handleLogout = () => {
    clearTeacherSession();
    clearSchoolSession();
    setRole(null);
    setSchoolSession(null);
    setActiveStudent(null);
    setView('dashboard'); // Reset view
  };

  const addWord = async (newWord: WordEntry) => {
    if (isSupabaseConfigured()) {
      try {
        const added = await addWordToSupabase(newWord);
        setWords(prev => [...prev, added]);
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to add word';
        showToast(`Failed to save "${newWord.word}": ${errorMsg}`, 'error');
        console.error('Failed to add word', e);
        throw e; // Re-throw so ExcelImport can detect and count the failure
      }
    } else {
      setWords(prev => [...prev, newWord]);
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
        showToast(`Student "${newStudent.firstName} ${newStudent.lastName}" registered successfully`, 'success');
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to add student';
        showToast(`Error registering student: ${errorMsg}`, 'error');
        console.error('Failed to add student', e);
      }
    } else {
      setStudents(prev => [...prev, newStudent]);
      showToast(`Student "${newStudent.firstName} ${newStudent.lastName}" registered successfully`, 'success');
    }
  };

  const updateStudent = async (updated: StudentProfile) => {
    if (isSupabaseConfigured()) {
      try {
        const result = await updateStudentInSupabase(updated);
        setStudents(prev => prev.map(s => s.id === result.id ? result : s));
        showToast(`Student "${updated.firstName} ${updated.lastName}" updated successfully`, 'success');
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to update student';
        showToast(`Error updating student: ${errorMsg}`, 'error');
        console.error('Failed to update student', e);
      }
    } else {
      setStudents(prev => prev.map(s => s.id === updated.id ? updated : s));
      showToast(`Student "${updated.firstName} ${updated.lastName}" updated successfully`, 'success');
    }
  };

  const deleteStudent = async (id: string) => {
    if (isSupabaseConfigured()) {
      try {
        await deleteStudentFromSupabase(id);
        setStudents(prev => prev.filter(s => s.id !== id));
        showToast('Student deleted successfully', 'success');
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'Failed to delete student';
        showToast(`Error deleting student: ${errorMsg}`, 'error');
        console.error('Failed to delete student', e);
      }
    } else {
      setStudents(prev => prev.filter(s => s.id !== id));
      showToast('Student deleted successfully', 'success');
    }
  };

  const NavButton = ({ target, icon: Icon, label }: { target: ViewState | 'interschool', icon: any, label: string }) => (
    <button
      onClick={() => setView(target as ViewState)}
      className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg transition-all text-sm font-bold flex-shrink-0 ${view === target
        ? role === 'teacher' ? 'bg-stone-800 text-amber-500 shadow-[inset_0_-2px_0_0_#f59e0b]' : 'bg-amber-400 text-stone-900 shadow-sm'
        : role === 'teacher' ? 'text-stone-400 hover:text-stone-100 hover:bg-stone-800/50' : 'text-stone-500 hover:bg-orange-50 hover:text-stone-800'
        }`}
    >
      <Icon size={18} className={view === target && role === 'teacher' ? 'animate-pulse' : ''} />
      <span>{label}</span>
    </button>
  );

  const refreshActiveStudent = async () => {
    if (!activeStudent || !isSupabaseConfigured()) return;
    const { data, error } = await supabase.from('students').select('*').eq('id', activeStudent.id).single();
    if (data) {
      setActiveStudent({
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
        coins: data.coins,
      });
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    // Show the install prompt
    deferredPrompt.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    // We've used the prompt, and can't use it again, throw it away
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  // 1. Welcome Screen
  if (!role) {
    return <WelcomeScreen onSelectRole={handleRoleSelect} beeImageUrl={BEE_IMAGE_URL} />;
  }

  // 2. School Dashboard (No global nav for this role, it has its own)
  if (role === 'school') {
    if (!schoolSession) return <WelcomeScreen onSelectRole={handleRoleSelect} beeImageUrl={BEE_IMAGE_URL} />;
    return (
      <div className="font-sans">
        <InvitedSchoolDashboard school={schoolSession} onLogout={handleLogout} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    );
  }

  // 3. Live Control Panel — fullscreen admin remote (teacher only)
  if (role === 'teacher' && view === 'live-control') {
    return (
      <div className="min-h-screen bg-stone-950 font-sans">
        <LiveEventControls onBack={() => setView('dashboard')} />
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    );
  }


  // 4. Loading inicial de datos
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

  // Inline PWA install card (used inside student & teacher views, not sticky-top)
  const PwaInstallCard = () => {
    if (!showInstallBanner && !showIosInstallBanner) return null;
    return (
      <div className="animate-fade-in mb-4">
        {showInstallBanner && (
          <div className="flex items-center justify-between gap-3 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-md">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐝</span>
              <div>
                <p className="text-sm font-semibold leading-tight">Instala la App oficial del Spelling Bee</p>
                <p className="text-stone-400 text-xs mt-0.5">Acceso rápido desde tu pantalla de inicio</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 text-stone-900 text-xs font-bold rounded-xl hover:bg-amber-500 transition-colors"
              >
                <Download size={13} />
                Instalar
              </button>
              <button
                onClick={() => setShowInstallBanner(false)}
                className="p-1 text-stone-400 hover:text-white transition-colors"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        {showIosInstallBanner && (
          <div className="flex items-center justify-between gap-3 bg-stone-900 text-white px-4 py-3 rounded-2xl shadow-md mt-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐝</span>
              <div>
                <p className="text-sm font-semibold leading-tight">Instala la App oficial del Spelling Bee</p>
                <p className="text-stone-400 text-xs mt-0.5">
                  Pulsa <Share2 size={11} className="inline mx-0.5" /> Compartir → "Agregar a pantalla de inicio"
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowIosInstallBanner(false)}
              className="p-1 text-stone-400 hover:text-white transition-colors flex-shrink-0"
              aria-label="Cerrar"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Bottom navigation tab for students
  const StudentBottomNav = () => {
    const tabs = [
      { target: 'student-generator' as ViewState, icon: Sparkles, label: 'Student Zone' },
      { target: 'leaderboard' as ViewState, icon: Trophy, label: 'Leaderboard' },
    ];
    return (
      <nav
        aria-label="Student navigation"
        className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {tabs.map(({ target, icon: Icon, label }) => {
          const isActive = view === target;
          return (
            <button
              key={target}
              onClick={() => setView(target)}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-semibold transition-colors
                ${isActive
                  ? 'text-amber-500'
                  : 'text-stone-400 hover:text-stone-600'
                }`}
            >
              <Icon
                size={22}
                strokeWidth={isActive ? 2.5 : 1.8}
                className={isActive ? 'text-amber-500' : 'text-stone-400'}
              />
              <span>{label}</span>
            </button>
          );
        })}
        {/* Logout tab */}
        <button
          onClick={handleLogout}
          className="flex-shrink-0 flex flex-col items-center justify-center gap-1 py-2.5 px-4 text-[11px] font-semibold text-stone-400 hover:text-red-500 transition-colors"
          title="Exit"
        >
          <LogOut size={22} strokeWidth={1.8} />
          <span>Exit</span>
        </button>
      </nav>
    );
  };

  // 4. Main App Layout (Admin & Student)
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      <LoadingOverlay isLoading={savingSession} text="Saving session..." />

      {dataError && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 px-4 py-2 text-center text-sm font-medium">
          {dataError} (comprobando conexión o variables de Supabase)
        </div>
      )}

      {/* ── Top Navigation Bar (Teachers only) ── */}
      {role === 'teacher' && (
        <nav className="bg-stone-900 border-b border-stone-800 sticky top-0 z-50 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between py-3 lg:h-16 gap-3 lg:gap-0">
              {/* Brand */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-stone-800 text-amber-500 shadow-inner">
                    <Book size={20} strokeWidth={2.5} />
                  </div>
                  <span className="text-xl sm:text-2xl font-black text-stone-50 flex items-center gap-2 tracking-tight font-serif">
                    <span className="whitespace-nowrap">Spelling Bee</span>
                    <span className="hidden sm:inline text-stone-700 font-sans font-light">|</span>
                    <span className="text-stone-900 bg-amber-500 text-[10px] sm:text-xs font-black uppercase tracking-widest px-2.5 py-1 rounded-md font-sans">
                      Admin
                    </span>
                  </span>
                </div>

                {/* Mobile Logout (shows in flex row next to brand on small screens) */}
                <button
                  onClick={handleLogout}
                  className="lg:hidden p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800/80 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut size={20} />
                </button>
              </div>

              {/* Nav items (Scrollable horizontally on mobile to prevent accidental touches) */}
              <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
                <NavButton target="dashboard" icon={LayoutDashboard} label="Dashboard" />
                <NavButton target="students" icon={Users} label="Students" />
                <NavButton target="interschool" icon={Globe} label="Interschool" />
                <NavButton target="manage" icon={List} label="Lists" />
                <NavButton target="session" icon={Play} label="Session" />
                <NavButton target="history" icon={History} label="History" />
                <NavButton target="leaderboard" icon={Trophy} label="Leaderboard" />

                {/* ── Launch Live Screen button ── */}
                <button
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?live=1`;
                    window.open(url, '_blank', 'noopener,noreferrer');
                    setView('live-control');

                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold flex-shrink-0 bg-rose-600 text-white hover:bg-rose-500 transition-all animate-pulse hover:[animation:none] shadow-lg shadow-rose-900/40"
                  title="Open live display in a new tab — drag to projector screen and press F11"
                >
                  <Monitor size={17} />
                  <span>Launch Live Screen</span>
                </button>

                <div className="hidden lg:block h-6 w-px bg-stone-700 mx-2" />

                {/* Desktop Logout */}
                <button
                  onClick={handleLogout}
                  className="hidden lg:flex p-2 text-stone-400 hover:text-rose-400 hover:bg-stone-800 rounded-lg transition-colors flex-shrink-0"
                  title="Logout"
                >
                  <LogOut size={18} />
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* ── Main Content ── */}
      <main
        className={`flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6
          ${role === 'student' ? 'pb-28' : 'py-8'}`}
      >
        {/* PWA install card — inline, only when relevant */}
        <PwaInstallCard />

        <AnimatePresence mode="wait">
          <PageTransition key={view}>
            {/* --- TEACHER / ADMIN VIEWS --- */}
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

                {/* @ts-ignore */}
                {view === 'interschool' && <InterschoolManager />}

                {/* @ts-ignore */}
                {view === 'manage-sponsors' && <SponsorsManager />}
                {/* @ts-ignore */}
                {view === 'manage-vendors' && <VendorsManager />}

                {view === 'manage' && (
                  <div className="animate-fade-in space-y-6">
                    <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <h2 className="text-2xl font-bold text-stone-800">Manage Word Lists</h2>
                        <p className="text-stone-500">Add, remove, and review words for each grade level.</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-stone-200 shadow-sm overflow-x-auto">
                        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
                          <button
                            key={g}
                            onClick={() => setManageGrade(g as GradeLevel)}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap ${manageGrade === g
                              ? 'bg-amber-400 text-stone-900 shadow-md'
                              : 'text-stone-500 hover:bg-stone-100 hover:text-stone-800'
                              }`}
                          >
                            {g === 12 ? 'Group 3' : `Grade ${g}`}
                          </button>
                        ))}
                      </div>
                    </header>
                    <WordForm currentGrade={manageGrade} onAddWord={addWord} />
                    <ExcelImport currentGrade={manageGrade} onAddWord={addWord} />
                    <div className="bg-stone-200 h-px w-full my-6" />
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
                  <HistoryView
                    sessions={sessions}
                    onDeleteSession={async (id) => {
                      if (isSupabaseConfigured()) {
                        try {
                          await deleteSession(id);
                          setSessions(prev => prev.filter(s => s.id !== id));
                          showToast('Session deleted', 'success');
                        } catch (e) {
                          showToast('Error deleting session', 'error');
                        }
                      } else {
                        setSessions(prev => prev.filter(s => s.id !== id));
                        showToast('Session deleted', 'success');
                      }
                    }}
                  />
                )}

                {view === 'leaderboard' && <Leaderboard />}

              </>
            )}

            {/* --- STUDENT VIEWS --- */}
            {role === 'student' && (
              <>
                {view === 'student-generator' && (
                  <StudentGenerator
                    words={words}
                    beeImageUrl={BEE_IMAGE_URL}
                    activeStudent={activeStudent}
                    onLogin={setActiveStudent}
                    onRefreshStudent={refreshActiveStudent}
                  />
                )}
                {view === 'student-drill' && (
                  <StudentDrill
                    words={words}
                    activeStudent={activeStudent}
                  />
                )}
                {view === 'leaderboard' && <Leaderboard />}
              </>
            )}
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* ── Student Bottom Navigation Bar ── */}
      {role === 'student' && <StudentBottomNav />}

      {/* ── Footer (Teachers & Admin only) ── */}
      {role === 'teacher' && (
        <footer className="bg-white border-t border-stone-200 py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4">
            {sponsors.length > 0 && (
              <div className="mb-8 border-b border-stone-100 pb-8">
                <h3 className="text-center text-sm font-bold text-stone-400 uppercase tracking-widest mb-6">Event Sponsors</h3>
                <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 opacity-80 grayscale hover:grayscale-0 transition-all duration-500">
                  {sponsors.map(s => (
                    <a
                      key={s.id}
                      href={s.websiteUrl || '#'}
                      target={s.websiteUrl ? '_blank' : '_self'}
                      rel="noreferrer"
                      className="transition-transform hover:scale-110"
                      title={s.name}
                    >
                      <img
                        src={s.logoUrl}
                        alt={s.name}
                        className={`object-contain ${s.tier === 'Gold' ? 'h-16 md:h-20' :
                          s.tier === 'Silver' ? 'h-12 md:h-16' :
                            'h-8 md:h-12'
                          }`}
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
            <div className="text-center text-stone-400 text-sm">
              <p>© {new Date().getFullYear()} Colegio Integral El Manglar, Brindando oportunidades de vida a nuestros estudiantes</p>
            </div>
          </div>
        </footer>
      )}

      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
};

const App: React.FC = () => {
  // ── Standalone Live Display mode ──────────────────────────────────────────
  // When the admin clicks "Launch Live Screen" we window.open ?live=1 in a new
  // tab. That tab renders *only* LiveEventDisplay — no auth, no nav, no footer.
  // The coordinator drags this tab to the projector window and presses F11.
  const isLiveMode = new URLSearchParams(window.location.search).get('live') === '1';
  if (isLiveMode) {
    return (
      <>
        <LiveEventDisplay />
        <Analytics />
      </>
    );
  }

  return (
    <ToastProvider>
      <AppContent />
      <Analytics />
    </ToastProvider>
  );
};

export default App;
