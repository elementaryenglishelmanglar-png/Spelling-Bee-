import React, { useState, useMemo, useRef, useEffect } from 'react';
import { WordEntry, GradeLevel, Student, Attempt, Session, Stage, ContestType, StudentProfile } from '../types';
import { Volume2, Eye, EyeOff, Play, CheckCircle, XCircle, Users, Settings, Save, RefreshCw, UserCheck, AlertCircle, Mic, Trash2, RotateCcw, CheckSquare, Square, ChevronLeft, ChevronRight, SkipForward, Plus, Keyboard, Award, Building2, School, FastForward, Flag } from 'lucide-react';

interface PracticeModeProps {
  words: WordEntry[];
  registeredStudents: StudentProfile[];
  onSaveSession: (session: Session) => void;
}

type SessionPhase = 'setup' | 'active' | 'summary';

export const PracticeMode: React.FC<PracticeModeProps> = ({ words, registeredStudents, onSaveSession }) => {
  // Phase State
  const [phase, setPhase] = useState<SessionPhase>('setup');

  // Setup State
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().slice(0, 16));
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(1);
  const [selectedStage, setSelectedStage] = useState<Stage>('Play-offs');
  const [selectedContestType, setSelectedContestType] = useState<ContestType>('Internal');
  const [moderatorName, setModeratorName] = useState('');
  // Word generator configuration
  const [generatorGrade, setGeneratorGrade] = useState<GradeLevel>(1);
  const [wordRangeMin, setWordRangeMin] = useState<number | ''>(''); // índice inicial (1‑based)
  const [wordRangeMax, setWordRangeMax] = useState<number | ''>(''); // índice final (1‑based)
  const [avoidWordRepetition, setAvoidWordRepetition] = useState<boolean>(true);

  // Selection State for Setup
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());

  // Active Session State
  const [students, setStudents] = useState<Student[]>([]);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [minRounds, setMinRounds] = useState(5); // Default to 5 columns

  // Turn State
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [isWordRevealed, setIsWordRevealed] = useState(false);
  const [teacherTypedSpelling, setTeacherTypedSpelling] = useState('');
  const [isExtraWord, setIsExtraWord] = useState(false);

  // Custom Word State
  const [isCustomWordMode, setIsCustomWordMode] = useState(false);
  const [customWordInput, setCustomWordInput] = useState('');

  // Protocol State
  const [protocolOpened, setProtocolOpened] = useState(false);
  const [protocolClosed, setProtocolClosed] = useState(false);

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [startTime, setStartTime] = useState<number>(0);

  // Refs
  const spellingInputRef = useRef<HTMLInputElement>(null);
  const customWordInputRef = useRef<HTMLInputElement>(null);

  // Derived Data
  const gradeWords = useMemo(() => words.filter(w => w.grade === selectedGrade), [words, selectedGrade]);
  const generatorWords = useMemo(
    () => words.filter(w => w.grade === generatorGrade),
    [words, generatorGrade]
  );
  const availableStudents = useMemo(() => registeredStudents.filter(s => s.grade === selectedGrade), [registeredStudents, selectedGrade]);

  const currentStudent = students[currentStudentIndex];

  // Effect: When grade changes in setup, select all students by default
  useEffect(() => {
    if (phase === 'setup') {
      const ids = new Set(registeredStudents.filter(s => s.grade === selectedGrade).map(s => s.id));
      setSelectedStudentIds(ids);
      // Por defecto, el generador usará la lista del mismo grado de la sesión
      setGeneratorGrade(selectedGrade);
    }
  }, [selectedGrade, registeredStudents, phase]);

  // --- Setup Handlers ---

  const toggleStudentSelection = (id: string) => {
    const newSet = new Set(selectedStudentIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedStudentIds(newSet);
  };

  const startSession = () => {
    if (selectedStudentIds.size === 0) {
      alert("Please select at least one student.");
      return;
    }
    if (!moderatorName.trim()) {
      alert("Please enter the Moderator's name.");
      return;
    }

    // Convert Profile to Session Student
    const sessionStudents: Student[] = availableStudents
      .filter(s => selectedStudentIds.has(s.id))
      .map(s => ({
        id: s.id,
        name: `${s.firstName} ${s.lastName}`,
        school: s.school,
        status: 'active',
        photo: s.photo // Pass photo to active session
      }));

    setStudents(sessionStudents);
    setStartTime(Date.now());
    setPhase('active');
    setMinRounds(5); // Reset to default 5

    // No need to find next active, start at 0
    setCurrentStudentIndex(0);
  };

  // --- Active Session Logic ---

  const findNextActiveStudent = (startIndex: number) => {
    let nextIndex = startIndex + 1;
    let loopCount = 0;
    while (loopCount < students.length) {
      if (nextIndex >= students.length) nextIndex = 0;
      if (students[nextIndex].status === 'active') {
        setCurrentStudentIndex(nextIndex);
        resetTurn();
        return;
      }
      nextIndex++;
      loopCount++;
    }
  };

  const handlePrevStudent = () => {
    let prevIndex = currentStudentIndex - 1;
    if (prevIndex < 0) prevIndex = students.length - 1;
    setCurrentStudentIndex(prevIndex);
    resetTurn();
  };

  const handleNextStudent = () => {
    let nextIndex = currentStudentIndex + 1;
    if (nextIndex >= students.length) nextIndex = 0;
    setCurrentStudentIndex(nextIndex);
    resetTurn();
  };

  const resetTurn = () => {
    setCurrentWord(null);
    setIsWordRevealed(false);
    setTeacherTypedSpelling('');
    setProtocolOpened(false);
    setProtocolClosed(false);
    setIsCustomWordMode(false);
    setCustomWordInput('');
    setIsExtraWord(false);
  };

  const generateWord = () => {
    // Base: palabras del grado configurado para el generador (puede ser distinto al grado de la sesión)
    let basePool = generatorWords;

    // Aplicar rango min‑max si se configuró (1‑based, inclusivo)
    const total = basePool.length;
    let startIndex = 0; // 0‑based
    let endIndex = total - 1; // 0‑based

    if (typeof wordRangeMin === 'number' && wordRangeMin > 0) {
      startIndex = Math.min(wordRangeMin - 1, total - 1);
    }
    if (typeof wordRangeMax === 'number' && wordRangeMax > 0) {
      endIndex = Math.min(wordRangeMax - 1, total - 1);
    }
    if (endIndex < startIndex) {
      // Si el usuario pone un max menor que min, intercambiamos para no dejarlo sin rango
      [startIndex, endIndex] = [endIndex, startIndex];
    }

    basePool = basePool.slice(startIndex, endIndex + 1);

    if (basePool.length === 0) {
      alert("No words available for the selected list / range.");
      return;
    }

    // Evitar palabras repetidas durante la sesión si la opción está activa
    let pool = basePool;
    if (avoidWordRepetition) {
      const usedWordIds = new Set(attempts.map(a => a.wordId));
      const filtered = basePool.filter(w => !usedWordIds.has(w.id));
      pool = filtered.length > 0 ? filtered : basePool; // Si se agotan, volvemos a usar toda la base
    }

    if (pool.length === 0) {
      alert("No words available with the current settings.");
      return;
    }

    const random = pool[Math.floor(Math.random() * pool.length)];
    setCurrentWord(random);
    setTeacherTypedSpelling(''); // Reset input for new word
    setIsWordRevealed(false);
    setProtocolOpened(false);
    setProtocolClosed(false);
    setIsExtraWord(false);

    // Auto focus input
    setTimeout(() => {
      if (spellingInputRef.current) spellingInputRef.current.focus();
    }, 100);
  };

  const handleCustomWordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customWordInput.trim()) return;

    const newWord: WordEntry = {
      id: `custom-${Date.now()}`,
      word: customWordInput.trim(),
      definition: 'Custom word added during session.',
      example: 'No example provided.',
      grade: selectedGrade,
      partOfSpeech: 'noun',
      theme: 'Custom'
    };

    setCurrentWord(newWord);
    setIsCustomWordMode(false);
    setCustomWordInput('');
    setTeacherTypedSpelling('');
    setIsWordRevealed(false);
    setProtocolOpened(false);
    setProtocolClosed(false);
    setIsExtraWord(false);

    // Auto focus input
    setTimeout(() => {
      if (spellingInputRef.current) spellingInputRef.current.focus();
    }, 100);
  };

  const speak = (text: string) => {
    // Check if we have a manual recording for this word
    if (currentWord && currentWord.audioUrl) {
      const audio = new Audio(currentWord.audioUrl);
      audio.play().catch(e => {
        console.warn("Manual audio playback failed", e);
      });
      return;
    }
  };

  const submitTurn = () => {
    if (!currentWord || !currentStudent) return;

    const isSpellingCorrect = teacherTypedSpelling.trim().toLowerCase() === currentWord.word.toLowerCase();

    // STRICT RULE: Result is correct ONLY IF spelling is correct AND both protocol checks passed.
    const finalResult = (isSpellingCorrect && protocolOpened && protocolClosed) ? 'correct' : 'incorrect';

    // Calculate which "Word Number" this is for the current student
    const studentAttempts = attempts.filter(a => a.studentId === currentStudent.id);
    const thisAttemptNumber = studentAttempts.length + 1;

    const newAttempt: Attempt = {
      timestamp: Date.now(),
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      wordId: currentWord.id,
      wordText: currentWord.word,
      typedSpelling: teacherTypedSpelling,
      protocolOpened: protocolOpened,
      protocolClosed: protocolClosed,
      wordNumber: thisAttemptNumber,
      result: finalResult,
      round: thisAttemptNumber, // Using attempt count as "round" for display purposes
      isExtra: isExtraWord
    };

    setAttempts([...attempts, newAttempt]);

    // Clear word to indicate turn is over, but STAY on current student (Manual Navigation)
    resetTurn();
  };

  const skipTurn = () => {
    if (!currentStudent) return;
    if (!confirm(`Skip turn for ${currentStudent.name}? This will record a 'Skipped' attempt to align the rounds.`)) return;

    const studentAttempts = attempts.filter(a => a.studentId === currentStudent.id);
    const thisAttemptNumber = studentAttempts.length + 1;

    const newAttempt: Attempt = {
      timestamp: Date.now(),
      studentId: currentStudent.id,
      studentName: currentStudent.name,
      wordId: 'skipped',
      wordText: 'SKIPPED',
      typedSpelling: '-',
      protocolOpened: false,
      protocolClosed: false,
      wordNumber: thisAttemptNumber,
      result: 'skipped',
      round: thisAttemptNumber,
      isExtra: false
    };

    setAttempts([...attempts, newAttempt]);
    resetTurn();
  };

  const toggleStudentStatus = (studentId: string) => {
    setStudents(students.map(s =>
      s.id === studentId
        ? { ...s, status: s.status === 'active' ? 'eliminated' : 'active' }
        : s
    ));
  };

  const finishSession = () => {
    const session: Session = {
      id: crypto.randomUUID(),
      date: sessionDate,
      grade: selectedGrade,
      moderator: moderatorName,
      stage: selectedStage,
      contestType: selectedContestType,
      attempts: attempts,
      durationSeconds: Math.floor((Date.now() - startTime) / 1000)
    };
    onSaveSession(session);
    setPhase('summary');
  };

  // Helper to check if spelling matches current word (for UI feedback)
  const isMatch = currentWord && teacherTypedSpelling.trim().toLowerCase() === currentWord.word.toLowerCase();

  // Scoreboard Column Calculation
  const maxAttempts = useMemo(() => {
    const counts = students.map(s => attempts.filter(a => a.studentId === s.id).length);
    const maxData = Math.max(0, ...counts);
    // Ensure we show at least minRounds (default 5), or expand if data exceeds it
    return Math.max(minRounds, maxData);
  }, [attempts, students, minRounds]);

  const addRound = () => {
    setMinRounds(prev => prev + 1);
  };

  // --- RENDER ---

  if (phase === 'setup') {
    return (
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-stone-200 animate-fade-in">
        <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
          <Settings className="text-stone-600" /> Contest Setup
        </h2>

        <div className="space-y-6">
          {/* Top Row: Date, Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-600 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-600 mb-1">Grade Level</label>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(Number(e.target.value) as GradeLevel)}
                className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none"
              >
                {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                  <option key={g} value={g}>{g === 12 ? 'Group 3' : `Grade ${g}`} ({words.filter(w => w.grade === g).length} words)</option>
                ))}
              </select>
            </div>
          </div>


          {/* New Row: Stage & Contest Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <div>
              <label className="block text-sm font-bold text-stone-600 mb-1 flex items-center gap-2"><Award size={14} /> Contest Stage</label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value as Stage)}
                className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none"
              >
                <option value="Play-offs">Play-offs</option>
                <option value="Final">Final</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-600 mb-1 flex items-center gap-2"><Building2 size={14} /> Contest Type</label>
              <select
                value={selectedContestType}
                onChange={(e) => setSelectedContestType(e.target.value as ContestType)}
                className="w-full p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none"
              >
                <option value="Internal">Internal</option>
                <option value="Interschool">Interschool</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-600 mb-1">Moderator Name (Teacher)</label>
            <div className="relative">
              <UserCheck className="absolute left-3 top-3.5 text-stone-400" size={18} />
              <input
                type="text"
                value={moderatorName}
                onChange={(e) => setModeratorName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full pl-10 p-3 border border-stone-300 rounded-xl focus:ring-2 focus:ring-yellow-200 outline-none font-medium"
              />
            </div>
          </div>

          {/* Student Selection (Previously Registration) */}
          <div>
            <label className="block text-sm font-bold text-stone-600 mb-2">Participating Students (Grade {selectedGrade})</label>
            <div className="bg-stone-50 border border-stone-200 rounded-xl p-4 max-h-60 overflow-y-auto">
              {availableStudents.length === 0 ? (
                <div className="text-center text-stone-400 py-4 italic">
                  No students registered for Grade {selectedGrade}. <br />Go to the "Students" tab to add them.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableStudents.map(student => (
                    <div
                      key={student.id}
                      onClick={() => toggleStudentSelection(student.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${selectedStudentIds.has(student.id)
                        ? 'bg-white border-green-500 shadow-sm'
                        : 'bg-stone-100 border-transparent opacity-60 hover:opacity-100'
                        }`}
                    >
                      <div className={`w-10 h-10 rounded-full border shrink-0 overflow-hidden flex items-center justify-center ${selectedStudentIds.has(student.id) ? 'border-green-500' : 'border-stone-300 bg-white'}`}>
                        {student.photo ? (
                          <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-xs font-bold text-stone-400">{student.firstName[0]}{student.lastName[0]}</span>
                        )}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-stone-800">{student.firstName} {student.lastName}</div>
                        <div className="text-xs text-stone-500">{student.school}</div>
                      </div>
                      {selectedStudentIds.has(student.id) && <CheckSquare size={16} className="ml-auto text-green-500" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className="text-right text-xs text-stone-400 mt-2">
              {selectedStudentIds.size} of {availableStudents.length} selected
            </p>
          </div>

          <button
            onClick={startSession}
            disabled={selectedStudentIds.size === 0}
            className="w-full py-4 bg-yellow-400 text-stone-900 font-bold rounded-xl shadow-lg hover:bg-yellow-300 hover:shadow-xl transition-all hover:scale-[1.01] mt-4 flex items-center justify-center gap-2 border border-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={20} /> Start Contest
          </button>
        </div>
      </div>
    );
  }

  if (phase === 'active') {
    return (
      <div className="max-w-7xl mx-auto flex flex-col gap-6 animate-fade-in pb-24">

        {/* TOP: ACTIVE CONSOLE */}
        <div className="bg-white rounded-2xl border-2 border-stone-800 shadow-xl overflow-hidden">
          {/* Header / Info Bar */}
          <div className="bg-stone-800 text-white p-4 flex flex-wrap justify-between items-center gap-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                {/* Editable Stage Dropdown in Header */}
                <select
                  value={selectedStage}
                  onChange={(e) => setSelectedStage(e.target.value as Stage)}
                  className="bg-yellow-400 text-stone-900 rounded font-bold text-sm uppercase px-3 py-1 outline-none cursor-pointer hover:bg-yellow-300 border border-transparent focus:border-white"
                >
                  <option value="Play-offs">Play-offs</option>
                  <option value="Final">Final</option>
                </select>
                <span className="text-stone-400 text-sm">|</span>
                <span className="text-stone-300 text-xs font-bold uppercase tracking-wider">{selectedContestType}</span>
              </div>
              <div className="flex items-center gap-2">
                <UserCheck size={16} className="text-stone-400" />
                <span className="text-stone-300 text-sm">Moderator: <span className="text-white font-semibold">{moderatorName}</span></span>
              </div>
            </div>
            <button onClick={finishSession} className="text-xs bg-red-600 hover:bg-red-500 px-3 py-1 rounded transition-colors font-bold">
              End Contest
            </button>
          </div>

          <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* LEFT: Student Control & Word */}
            <div className="space-y-6">
              {/* Student Navigator */}
              <div className="flex items-center justify-between bg-stone-50 p-4 rounded-xl border border-stone-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-stone-200">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${((currentStudentIndex + 1) / students.length) * 100}%` }}
                  ></div>
                </div>

                <button onClick={handlePrevStudent} className="p-2 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors z-10" title="Previous Student">
                  <ChevronLeft size={24} />
                </button>

                <div className="text-center z-10 flex flex-col items-center">
                  <p className="text-stone-400 text-[10px] font-bold uppercase tracking-widest mb-2">Current Student</p>

                  {/* Student Avatar */}
                  {currentStudent && (
                    <div className="w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden mb-2 bg-stone-200">
                      {currentStudent.photo ? (
                        <img src={currentStudent.photo} alt={currentStudent.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-stone-400 font-bold bg-white">
                          {currentStudent.name.charAt(0)}
                        </div>
                      )}
                    </div>
                  )}

                  <h2 className="text-2xl font-black text-stone-800 leading-tight">{currentStudent?.name || "None"}</h2>
                  {currentStudent && (
                    <>
                      <div className="flex items-center gap-1 text-xs text-stone-500 mb-1">
                        <School size={12} /> {currentStudent.school}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${currentStudent.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {currentStudent.status}
                      </span>
                    </>
                  )}
                </div>

                <button onClick={handleNextStudent} className="p-2 hover:bg-stone-200 rounded-lg text-stone-600 transition-colors z-10" title="Next Student">
                  <ChevronRight size={24} />
                </button>
              </div>

              {!currentWord ? (
                <div className="h-64 border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-stretch justify-center bg-stone-50 p-4 gap-4">
                  <div className="w-full flex flex-col items-center">
                    <p className="text-[10px] font-bold text-stone-400 uppercase mb-1">Word Generator</p>
                  </div>
                  {/* Controles de lista y rango, ahora editables durante la ronda */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1 flex items-center gap-1">
                        <Flag size={12} /> Word List
                      </label>
                      <select
                        value={generatorGrade}
                        onChange={(e) => setGeneratorGrade(Number(e.target.value) as GradeLevel)}
                        className="w-full p-2 border border-stone-300 rounded-lg text-xs focus:ring-2 focus:ring-yellow-200 outline-none"
                      >
                        {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                          <option key={g} value={g}>
                            {g === 12 ? 'Group 3' : `Grade ${g}`} ({words.filter(w => w.grade === g).length} words)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-stone-600 mb-1">Word Range</label>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-stone-500">From</span>
                        <input
                          type="number"
                          min={1}
                          max={words.filter(w => w.grade === generatorGrade).length || 1}
                          value={wordRangeMin === '' ? '' : wordRangeMin}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setWordRangeMin('');
                              return;
                            }
                            const parsed = Number(raw);
                            if (!Number.isNaN(parsed) && parsed > 0) {
                              setWordRangeMin(parsed);
                            }
                          }}
                          className="w-14 p-1 border border-stone-300 rounded text-[11px]"
                        />
                        <span className="text-[10px] text-stone-400">to</span>
                        <input
                          type="number"
                          min={1}
                          max={words.filter(w => w.grade === generatorGrade).length || 1}
                          value={wordRangeMax === '' ? '' : wordRangeMax}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (raw === '') {
                              setWordRangeMax('');
                              return;
                            }
                            const parsed = Number(raw);
                            if (!Number.isNaN(parsed) && parsed > 0) {
                              setWordRangeMax(parsed);
                            }
                          }}
                          className="w-14 p-1 border border-stone-300 rounded text-[11px]"
                        />
                        <span className="text-[10px] text-stone-400">
                          (1–{words.filter(w => w.grade === generatorGrade).length || 0})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAvoidWordRepetition(!avoidWordRepetition)}
                      className={`w-4 h-4 rounded border flex items-center justify-center ${avoidWordRepetition ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-stone-300'
                        }`}
                    >
                      {avoidWordRepetition && <CheckSquare size={10} />}
                    </button>
                    <span className="text-[10px] text-stone-600 font-medium">
                      Avoid repeating words this contest
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400">
                    Adjust list or range at any time. Changes affect the next generated word.
                  </p>
                  <div className="flex flex-col w-full gap-3 pt-1">
                    <button
                      onClick={generateWord}
                      className="w-full py-3 bg-stone-800 text-yellow-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform shadow-lg"
                    >
                      <RefreshCw size={18} /> Random from List
                    </button>
                    <div className="flex gap-2 w-full">
                      <button
                        onClick={skipTurn}
                        title="Records a SKIPPED turn for this student to align rounds"
                        className="flex-1 px-4 py-3 bg-stone-100 text-stone-500 border border-stone-200 rounded-xl font-bold hover:bg-stone-200 hover:text-stone-700 transition-colors"
                      >
                        <FastForward size={18} />
                      </button>
                    </div>
                    <p className="text-[10px] text-stone-400 text-center mt-1">Use Skip to insert a placeholder for missing students.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-orange-50 rounded-xl p-6 border border-orange-100 relative">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold text-stone-400 uppercase">Target Word</span>
                    <div className="flex gap-2">
                      <button onClick={() => speak(currentWord.word)} className="p-2 bg-white rounded-lg shadow-sm hover:bg-stone-100 text-stone-700"><Volume2 size={18} /></button>
                      <button onClick={() => setIsWordRevealed(!isWordRevealed)} className="p-2 bg-white rounded-lg shadow-sm hover:bg-stone-100 text-stone-700">
                        {isWordRevealed ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="mb-6 text-center">
                    <h3 className={`text-4xl font-black transition-all ${isWordRevealed ? 'text-stone-900' : 'text-stone-800 blur-md select-none'}`}>
                      {currentWord.word}
                    </h3>
                  </div>

                  <button
                    onClick={() => { resetTurn(); }}
                    className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-xs font-bold text-stone-500 hover:text-stone-800 flex items-center gap-1 bg-white px-3 py-1 rounded-full shadow-sm border border-stone-200"
                  >
                    <SkipForward size={12} /> Skip / New Word
                  </button>

                  {isWordRevealed && (
                    <div className="text-sm text-stone-600 bg-white/50 p-3 rounded-lg">
                      <p className="mb-1"><span className="font-bold">Def:</span> {currentWord.definition}</p>
                      <p className="italic">"{currentWord.example}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Teacher Input & Validation */}
            <div className={`flex flex-col h-full ${!currentWord ? 'opacity-50 pointer-events-none' : ''}`}>
              <label className="block text-sm font-bold text-stone-500 uppercase mb-2">Teacher: Type what you hear</label>

              <div className="relative mb-4">
                <input
                  ref={spellingInputRef}
                  type="text"
                  value={teacherTypedSpelling}
                  onChange={(e) => setTeacherTypedSpelling(e.target.value)}
                  placeholder="Type letters..."
                  className={`w-full text-3xl font-mono font-bold p-4 rounded-xl border-4 outline-none transition-colors ${teacherTypedSpelling.length === 0 ? 'border-stone-200' :
                    isMatch ? 'border-green-500 bg-green-50 text-green-900' : 'border-red-400 bg-red-50 text-red-900'
                    }`}
                  autoComplete="off"
                  spellCheck="false"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {teacherTypedSpelling.length > 0 && (
                    isMatch ? <CheckCircle size={32} className="text-green-500" /> : <XCircle size={32} className="text-red-400" />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Protocol Check: OPENED */}
                <div
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${protocolOpened ? 'bg-stone-800 border-stone-800 text-white' : 'bg-white border-stone-200 hover:bg-stone-50'}`}
                  onClick={() => setProtocolOpened(!protocolOpened)}
                >
                  <div className="flex items-center gap-3">
                    {protocolOpened ? <CheckSquare size={24} /> : <Square size={24} className="text-stone-300" />}
                    <div>
                      <span className="font-bold block">Opened Word</span>
                      <span className="text-xs opacity-70">"Say word first"</span>
                    </div>
                  </div>
                </div>

                {/* Protocol Check: CLOSED */}
                <div
                  className={`border rounded-xl p-4 cursor-pointer transition-all ${protocolClosed ? 'bg-stone-800 border-stone-800 text-white' : 'bg-white border-stone-200 hover:bg-stone-50'}`}
                  onClick={() => setProtocolClosed(!protocolClosed)}
                >
                  <div className="flex items-center gap-3">
                    {protocolClosed ? <CheckSquare size={24} /> : <Square size={24} className="text-stone-300" />}
                    <div>
                      <span className="font-bold block">Closed Word</span>
                      <span className="text-xs opacity-70">"Say word last"</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Extra Word Toggle */}
              <div
                className={`border rounded-xl p-3 cursor-pointer transition-all mb-4 flex items-center gap-3 ${isExtraWord ? 'bg-purple-100 border-purple-300 text-purple-900' : 'bg-white border-stone-200 text-stone-500 hover:bg-stone-50'}`}
                onClick={() => setIsExtraWord(!isExtraWord)}
              >
                {isExtraWord ? <CheckSquare size={20} className="text-purple-600" /> : <Square size={20} />}
                <div className="flex-1">
                  <span className="font-bold text-sm block flex items-center gap-2"><Flag size={14} /> Extra Word / Tie-Breaker</span>
                  <span className="text-[10px] opacity-70 block">Mark this attempt as an extra round (e.g. for tie-breakers)</span>
                </div>
              </div>

              <div className="mt-auto">
                <button
                  onClick={submitTurn}
                  disabled={!currentWord}
                  className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${isMatch && protocolOpened && protocolClosed
                    ? 'bg-green-600 text-white hover:bg-green-500'
                    : 'bg-stone-800 text-white hover:bg-stone-700'
                    }`}
                >
                  Confirm & Record Turn
                </button>
                <p className="text-center text-xs text-stone-400 mt-2">
                  This will save the result but <span className="font-bold text-stone-800">stay on the current student</span>.
                  <br />Use navigation buttons to change student.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM: THE SCOREBOARD CHART */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-stone-200 bg-stone-50 flex justify-between items-center">
            <h3 className="font-bold text-stone-800 flex items-center gap-2">
              <Mic size={18} /> Live Scoreboard
            </h3>
            <div className="flex items-center gap-4">
              <div className="flex gap-2 text-xs font-bold text-stone-500 mr-4">
                <div className="flex items-center gap-1"><span className="text-green-600 font-bold">O</span> Opened</div>
                <div className="flex items-center gap-1"><span className="text-green-600 font-bold">C</span> Closed</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Correct</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500"></div> Extra/Tie</div>
              </div>
              <button
                onClick={addRound}
                className="flex items-center gap-1 text-xs font-bold bg-white border border-stone-300 px-3 py-1 rounded hover:bg-stone-100 text-stone-700 shadow-sm transition-colors"
                title="Add a new column for next word/round"
              >
                <Plus size={14} /> Add Word Column
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-100 text-stone-600 border-b border-stone-200">
                  <th className="p-4 text-left font-bold sticky left-0 bg-stone-100 z-10 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Student</th>
                  <th className="p-4 text-center font-bold w-24">Status</th>
                  {/* Dynamic Columns based on Max Attempts */}
                  {Array.from({ length: maxAttempts }).map((_, i) => (
                    <th key={i} className={`p-4 text-center font-bold min-w-[140px] whitespace-nowrap ${i >= 5 ? 'text-purple-800 bg-purple-50' : ''}`}>
                      Word {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {students.map((student) => {
                  // Filter attempts for this student, sorted by time/sequence
                  const studentAttempts = attempts.filter(a => a.studentId === student.id);

                  return (
                    <tr key={student.id} className={`group hover:bg-stone-50 transition-colors ${student.status === 'eliminated' ? 'bg-stone-50 opacity-60' : ''}`}>
                      <td className="p-4 font-bold text-stone-800 sticky left-0 bg-white group-hover:bg-stone-50 transition-colors z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full border border-stone-200 overflow-hidden shrink-0 bg-stone-100">
                            {student.photo ? (
                              <img src={student.photo} alt={student.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-stone-400 font-bold">
                                {student.name.split(' ').map(n => n[0]).join('')}
                              </div>
                            )}
                          </div>
                          <div>
                            <div>{student.name}</div>
                            <div className="text-[10px] text-stone-400 font-normal">{student.school}</div>
                          </div>
                        </div>
                        {currentStudent?.id === student.id && <span className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 animate-pulse"></span>}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => toggleStudentStatus(student.id)}
                          className={`px-2 py-1 rounded text-xs font-bold border transition-all ${student.status === 'active'
                            ? 'bg-green-100 text-green-700 border-green-200 hover:bg-red-100 hover:text-red-700 hover:border-red-200 hover:content-["Eliminate"]'
                            : 'bg-stone-200 text-stone-500 border-stone-300 hover:bg-green-100 hover:text-green-700'
                            }`}
                        >
                          {student.status === 'active' ? 'Active' : 'Out'}
                        </button>
                      </td>

                      {/* Render cells for each attempt index */}
                      {Array.from({ length: maxAttempts }).map((_, colIndex) => {
                        const attempt = studentAttempts[colIndex];

                        return (
                          <td key={colIndex} className={`p-2 text-center border-l border-stone-100 align-top ${colIndex >= 5 ? 'bg-purple-50/30' : ''}`}>
                            {attempt ? (
                              <div className={`flex flex-col items-center rounded-lg p-2 ${attempt.result === 'skipped' ? 'bg-stone-100 border-stone-200 opacity-50' :
                                attempt.isExtra ? 'bg-purple-50 border border-purple-200' :
                                  attempt.result === 'correct' ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
                                }`}>
                                {attempt.result !== 'skipped' && (
                                  <>
                                    {/* Protocol Indicators */}
                                    <div className="flex gap-2 mb-1 text-[10px] font-bold">
                                      <span className={attempt.protocolOpened ? 'text-green-600' : 'text-red-400'}>O</span>
                                      <span className={attempt.protocolClosed ? 'text-green-600' : 'text-red-400'}>C</span>
                                    </div>
                                    {/* Words */}
                                    <div className="flex flex-col gap-0.5">
                                      <span className="text-xs font-bold text-stone-800">{attempt.wordText}</span>
                                      <span className={`text-[10px] font-mono ${attempt.wordText.toLowerCase() === attempt.typedSpelling.toLowerCase() ? 'text-green-600' : 'text-red-600 line-through'}`}>
                                        {attempt.typedSpelling}
                                      </span>
                                    </div>
                                  </>
                                )}
                                {attempt.result === 'skipped' && (
                                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider py-2">
                                    Skipped
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-stone-100 mx-auto mt-2 border border-stone-200"></div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // Phase: Summary
  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-stone-200 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4 border border-green-200">
          <Save size={32} />
        </div>
        <h2 className="text-3xl font-bold text-stone-800">Contest Recorded!</h2>
        <div className="flex justify-center gap-2 mt-2">
          <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-xs font-bold uppercase border border-stone-200">{selectedContestType}</span>
          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-bold uppercase border border-yellow-200">{selectedStage}</span>
        </div>
        <p className="text-stone-500 mt-4">The results have been saved to the history.</p>
        <p className="text-stone-400 text-sm mt-1">Moderator: {moderatorName}</p>
      </div>

      <div className="bg-stone-50 rounded-xl border border-stone-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-stone-100 text-stone-500">
            <tr>
              <th className="p-4 font-bold">Round</th>
              <th className="p-4 font-bold">Student</th>
              <th className="p-4 font-bold">Word / Typed</th>
              <th className="p-4 font-bold">Protocol</th>
              <th className="p-4 font-bold">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {attempts.map((attempt, i) => (
              <tr key={i} className="bg-white">
                <td className="p-4 text-stone-500">{attempt.wordNumber}</td>
                <td className="p-4 font-medium text-stone-800">{attempt.studentName}</td>
                <td className="p-4">
                  <div className="text-stone-800 font-bold">{attempt.wordText}</div>
                  <div className={`text-xs font-mono ${attempt.wordText.toLowerCase() === attempt.typedSpelling.toLowerCase() ? 'text-green-600' : 'text-red-600'}`}>
                    {attempt.typedSpelling}
                  </div>
                </td>
                <td className="p-4">
                  {attempt.result !== 'skipped' && (
                    <div className="flex gap-2 text-xs font-bold">
                      <span className={`px-2 py-0.5 rounded border ${attempt.protocolOpened ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                        OPEN
                      </span>
                      <span className={`px-2 py-0.5 rounded border ${attempt.protocolClosed ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                        CLOSE
                      </span>
                    </div>
                  )}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${attempt.result === 'correct' ? 'bg-green-100 text-green-700' :
                    attempt.result === 'skipped' ? 'bg-stone-200 text-stone-500' :
                      'bg-red-100 text-red-700'
                    }`}>
                    {attempt.result.toUpperCase()}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-center">
        <button
          onClick={() => setPhase('setup')}
          className="px-6 py-3 bg-stone-800 text-yellow-400 rounded-xl font-bold hover:bg-stone-900 transition-colors flex items-center gap-2"
        >
          <RotateCcw size={18} /> Start New Contest
        </button>
      </div>
    </div>
  );
};