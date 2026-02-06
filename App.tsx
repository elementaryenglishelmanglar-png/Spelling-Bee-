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

const WORDS_STORAGE_KEY = 'spellbound_words_v1';
const SESSIONS_STORAGE_KEY = 'spellbound_sessions_v1';
const STUDENTS_STORAGE_KEY = 'spellbound_students_v1';

// Replace this with your specific bee image URL
const BEE_IMAGE_URL = "https://cdn3d.iconscout.com/3d/premium/thumb/bee-5466547-4561081.png";

const App: React.FC = () => {
  const [role, setRole] = useState<Role>(null);
  const [view, setView] = useState<ViewState>('dashboard');
  
  // Data State
  const [words, setWords] = useState<WordEntry[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [students, setStudents] = useState<StudentProfile[]>([]); // Registered Students
  const [manageGrade, setManageGrade] = useState<GradeLevel>(1);

  // Load Data on mount
  useEffect(() => {
    // Load Words
    const savedWords = localStorage.getItem(WORDS_STORAGE_KEY);
    if (savedWords) {
      try {
        setWords(JSON.parse(savedWords));
      } catch (e) {
        console.error("Failed to parse words", e);
      }
    } else {
        // Seed words if empty
        const seedData: WordEntry[] = [
            { id: '1', word: 'Puppy', definition: 'A young dog.', example: 'The puppy played in the grass.', grade: 1, difficulty: 'Easy' },
            { id: '2', word: 'Kitten', definition: 'A young cat.', example: 'The kitten is sleeping.', grade: 1, difficulty: 'Easy' },
            { id: '3', word: 'Galaxy', definition: 'A system of millions or billions of stars.', example: 'The Milky Way is our galaxy.', grade: 4, difficulty: 'Medium' },
            { id: '4', word: 'Photosynthesis', definition: 'The process by which plants use sunlight to synthesize foods.', example: 'Photosynthesis requires chlorophyll.', grade: 6, difficulty: 'Hard' },
            { id: '5', word: 'Ephemeral', definition: 'Lasting for a very short time.', example: 'Fashions are ephemeral, changing with every season.', grade: 9, difficulty: 'Medium' },
            { id: '6', word: 'Vicissitude', definition: 'A change of circumstances or fortune, typically one that is unwelcome or unpleasant.', example: 'He was prepared for the vicissitudes of life.', grade: 11, difficulty: 'Hard' }
        ];
        setWords(seedData);
        localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(seedData));
    }

    // Load Sessions
    const savedSessions = localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (savedSessions) {
      try {
        setSessions(JSON.parse(savedSessions));
      } catch (e) {
        console.error("Failed to parse sessions", e);
      }
    }

    // Load Students
    const savedStudents = localStorage.getItem(STUDENTS_STORAGE_KEY);
    if (savedStudents) {
      try {
        setStudents(JSON.parse(savedStudents));
      } catch (e) {
        console.error("Failed to parse students", e);
      }
    }
  }, []);

  // Save on change
  useEffect(() => {
    if (words.length > 0) {
      localStorage.setItem(WORDS_STORAGE_KEY, JSON.stringify(words));
    }
  }, [words]);

  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
    }
  }, [sessions]);

  useEffect(() => {
    // Save even if empty array (to clear deleted students)
    localStorage.setItem(STUDENTS_STORAGE_KEY, JSON.stringify(students));
  }, [students]);

  const handleRoleSelect = (newRole: Role) => {
    setRole(newRole);
    // Set default view based on role
    if (newRole === 'teacher') setView('dashboard');
    if (newRole === 'student') setView('student-generator');
  };

  const handleLogout = () => {
    setRole(null);
  };

  const addWord = (newWord: WordEntry) => {
    setWords(prev => [...prev, newWord]);
  };

  const updateWord = (updatedWord: WordEntry) => {
    setWords(prev => prev.map(w => w.id === updatedWord.id ? updatedWord : w));
  };

  const deleteWord = (id: string) => {
    setWords(prev => prev.filter(w => w.id !== id));
  };

  const saveSession = (newSession: Session) => {
    setSessions(prev => [newSession, ...prev]);
  };

  // Student CRUD
  const addStudent = (newStudent: StudentProfile) => {
    setStudents(prev => [...prev, newStudent]);
  };

  const deleteStudent = (id: string) => {
    setStudents(prev => prev.filter(s => s.id !== id));
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

  // 2. Main App Layout
  return (
    <div className="min-h-screen bg-orange-50/30 flex flex-col font-sans">
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
            {view === 'dashboard' && <Dashboard words={words} onChangeView={setView} beeImageUrl={BEE_IMAGE_URL} />}
            
            {view === 'students' && (
                <StudentsManager 
                    students={students} 
                    onAddStudent={addStudent} 
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
    </div>
  );
};

export default App;