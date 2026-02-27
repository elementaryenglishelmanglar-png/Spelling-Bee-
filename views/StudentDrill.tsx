import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WordEntry, GradeLevel, StudentProfile } from '../types';
import { getGradeLabel } from '../lib/gradeLabel';
import { Volume2, CheckCircle, XCircle, ChevronRight, Trophy, Shuffle, Heart, HeartCrack } from 'lucide-react';
import { recordStudentStat, addCoins, checkAndUpdateStreak, fetchStudentWordStats } from '../services/supabaseData';
import confetti from 'canvas-confetti';

type PracticeMode = 'spelling' | 'anagram';

interface StudentDrillProps {
  words: WordEntry[];
  activeStudent: StudentProfile | null;
}

// Función para mezclar letras de una palabra
const shuffleLetters = (word: string): string[] => {
  const letters = word.split('');
  for (let i = letters.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [letters[i], letters[j]] = [letters[j], letters[i]];
  }
  return letters;
};

export const StudentDrill: React.FC<StudentDrillProps> = ({ words, activeStudent }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(activeStudent?.grade || 1);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('spelling');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [userInput, setUserInput] = useState('');
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [score, setScore] = useState(0);
  const [wordHistory, setWordHistory] = useState<any[]>([]);

  // Gamification States
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [mascotMessage, setMascotMessage] = useState<string>("Let's spell!");

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeStudent) { // Added null check for activeStudent
      setSelectedGrade(activeStudent.grade);
      fetchStudentWordStats(activeStudent.id).then(setWordHistory);
    }
  }, [activeStudent]);

  const gradeWords = useMemo(() => words.filter(w => w.grade === selectedGrade), [words, selectedGrade]);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setMascotMessage("Good luck! You can do this!");
    nextWord();
  };

  const nextWord = () => {
    if (gradeWords.length === 0) return;

    // SRS Weighted Selection
    let selectedWord: WordEntry;

    if (wordHistory.length === 0) {
      // Fallback to random if no history
      selectedWord = gradeWords[Math.floor(Math.random() * gradeWords.length)];
    } else {
      // Calculate weights
      const weights = gradeWords.map(word => {
        const stats = wordHistory.filter(h => h.word_id === word.id);
        if (stats.length === 0) return 20; // New word bonus

        const lastAttempt = stats[0]; // Ordered by desc time
        if (!lastAttempt.is_correct) return 50; // High priority for recent errors

        // Check consecutive correct
        let consecutive = 0;
        for (const s of stats) {
          if (s.is_correct) consecutive++;
          else break;
        }
        if (consecutive > 2) return 1; // Mastered

        return 5; // Standard review
      });

      // Weighted Random Selection
      const totalWeight = weights.reduce((a, b) => a + b, 0);
      let random = Math.random() * totalWeight;
      let index = 0;
      for (let i = 0; i < weights.length; i++) {
        random -= weights[i];
        if (random < 0) {
          index = i;
          break;
        }
      }
      selectedWord = gradeWords[index];
    }

    setCurrentWord(selectedWord);
    setUserInput('');
    setSelectedLetters([]);
    setFeedback('none');
    setMascotMessage("Listen carefully...");

    // Si es modo anagrama, mezclar las letras
    if (practiceMode === 'anagram') {
      const shuffled = shuffleLetters(selectedWord.word);
      setShuffledLetters(shuffled);
    }

    // Auto pronounce after a short delay
    setTimeout(() => speak(selectedWord.audioUrl), 500);

    // Focus input si es modo spelling
    if (practiceMode === 'spelling') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const speak = (audioUrl?: string) => {
    if (audioUrl) {
      new Audio(audioUrl).play().catch(e => console.warn("Audio playback failed", e));
    }
  };

  const handleLetterClick = (letter: string, index: number) => {
    if (practiceMode !== 'anagram' || feedback !== 'none') return;

    // Remover la letra de las disponibles y agregarla a las seleccionadas
    const newShuffled = [...shuffledLetters];
    newShuffled.splice(index, 1);
    setShuffledLetters(newShuffled);

    const newSelected = [...selectedLetters, letter];
    setSelectedLetters(newSelected);
    setUserInput(newSelected.join(''));
  };

  const handleRemoveLetter = (index: number) => {
    if (practiceMode !== 'anagram' || feedback !== 'none') return;

    const letter = selectedLetters[index];
    const newSelected = [...selectedLetters];
    newSelected.splice(index, 1);
    setSelectedLetters(newSelected);
    setUserInput(newSelected.join(''));

    // Devolver la letra a las disponibles
    setShuffledLetters([...shuffledLetters, letter]);
  };

  // Función helper para recalcular letras disponibles basándose en la palabra original y el input del usuario
  const recalculateAvailableLetters = (inputText: string): string[] => {
    if (!currentWord) return [];
    const originalWord = currentWord.word;
    const originalLetters = originalWord.split('');
    const inputLetters = inputText.split('');

    // Contar cuántas veces aparece cada letra en el input
    const inputCount: Record<string, number> = {};
    inputLetters.forEach(l => {
      inputCount[l] = (inputCount[l] || 0) + 1;
    });

    // Calcular qué letras quedan disponibles
    const available: string[] = [];
    const originalCount: Record<string, number> = {};
    originalLetters.forEach(l => {
      originalCount[l] = (originalCount[l] || 0) + 1;
    });

    // Para cada letra en la palabra original, agregar las que no se han usado
    Object.keys(originalCount).forEach(letter => {
      const used = inputCount[letter] || 0;
      const total = originalCount[letter];
      const remaining = total - used;
      for (let i = 0; i < remaining; i++) {
        available.push(letter);
      }
    });

    return available;
  };

  const startTime = useRef<number>(0);

  // Reset timer on new word
  useEffect(() => {
    if (currentWord) startTime.current = Date.now();
  }, [currentWord]);

  const checkSpelling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userInput.trim()) return;

    const userAnswer = userInput.trim().toLowerCase();
    const correctAnswer = currentWord.word.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);
    const points = isCorrect ? 15 : 0;

    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + points);
      setMascotMessage("Amazing! You got it right!");
      confetti({
        particleCount: 120,
        spread: 72,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#D97706', '#FFFFFF', '#1C1917'],
      });
      // Add coins logic (e.g. 1 coin per correct answer)
      if (activeStudent) {
        addCoins(activeStudent.id, 1);
        checkAndUpdateStreak(activeStudent.id).then(res => {
          if (res.message && (res.message.includes("Increase") || res.message.includes("Saved"))) {
            setMascotMessage(res.message);
          }
        });
      }
    } else {
      setFeedback('incorrect');
      setMascotMessage(`Oops! The correct spelling is "${currentWord.word}".`);
      const newLives = lives - 1;
      setLives(newLives);
      if (newLives === 0) {
        setGameOver(true);
        setMascotMessage("Don't worry! Practice makes perfect. Try again!");
      }
    }

    if (activeStudent) {
      recordStudentStat({
        studentId: activeStudent.id,
        wordId: currentWord.id,
        isCorrect,
        timeTaken,
        pointsEarned: points
      });
      // Refresh history for next selection
      fetchStudentWordStats(activeStudent.id).then(setWordHistory);
    }
  };

  // Mascot removed — messages handled inline via feedback state

  // Home / Menu Screen
  if (!isPlaying) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-stone-200 shadow-sm text-center animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 to-amber-600" />
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg relative -mt-4">
          <Trophy size={36} />
        </div>
        <h2 className="text-2xl font-black text-stone-900 mb-2">Ready to Practice?</h2>
        <p className="text-stone-500 mb-8">Earn coins, keep your streak, and master your spelling!</p>

        {/* Mode Selector */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Choose Mode</label>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setPracticeMode('spelling')}
              className={`p-5 rounded-2xl border-2 transition-all group ${practiceMode === 'spelling'
                  ? 'bg-amber-50 border-amber-500 shadow-md scale-[1.02]'
                  : 'bg-white text-stone-600 border-stone-100 hover:border-amber-200'
                }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors ${practiceMode === 'spelling' ? 'bg-amber-500 text-white' : 'bg-stone-100 text-stone-400 group-hover:bg-amber-50 group-hover:text-amber-500'
                }`}>
                <Volume2 size={24} />
              </div>
              <div className="font-bold text-stone-800">Spelling Drill</div>
              <div className="text-xs text-stone-400 mt-1">Listen &amp; Type</div>
            </button>
            <button
              onClick={() => setPracticeMode('anagram')}
              className={`p-5 rounded-2xl border-2 transition-all group ${practiceMode === 'anagram'
                  ? 'bg-stone-900 border-stone-900 shadow-md scale-[1.02]'
                  : 'bg-white text-stone-600 border-stone-100 hover:border-stone-300'
                }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors ${practiceMode === 'anagram' ? 'bg-amber-400 text-stone-900' : 'bg-stone-100 text-stone-400 group-hover:bg-stone-800 group-hover:text-white'
                }`}>
                <Shuffle size={24} />
              </div>
              <div className={`font-bold ${practiceMode === 'anagram' ? 'text-white' : 'text-stone-800'}`}>Anagram Game</div>
              <div className={`text-xs mt-1 ${practiceMode === 'anagram' ? 'text-stone-400' : 'text-stone-400'}`}>Unscramble</div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl mb-8 border border-stone-100">
          <div className="text-left">
            <p className="text-xs font-bold text-stone-400 uppercase">Grade Level</p>
            <p className="font-bold text-stone-700">{getGradeLabel(selectedGrade)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-stone-400 uppercase">Words Available</p>
            <p className="font-bold text-stone-700">{gradeWords.length}</p>
          </div>
        </div>

        <button
          onClick={startGame}
          disabled={gradeWords.length === 0}
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-2xl font-bold text-lg shadow-lg shadow-amber-100 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0"
        >
          Start Challenge
        </button>
      </div>
    );
  }

  // Active Game Screen — Zen Layout
  return (
    <div className="max-w-xl mx-auto pb-4">

      {/* ── Zen HUD: single compact row ── */}
      <div className="flex items-center justify-between mb-5 px-1">
        <button
          onClick={() => setIsPlaying(false)}
          className="text-stone-400 hover:text-stone-700 font-semibold text-sm transition-colors py-1.5 px-3 hover:bg-stone-100 rounded-lg"
        >
          ✕ Quit
        </button>

        <div className="flex items-center gap-3">
          {/* Lives */}
          <div className="flex items-center gap-0.5">
            {[1, 2, 3].map(i => (
              <div key={i} className="transition-all duration-300">
                {i <= lives
                  ? <Heart size={18} className="fill-rose-500 text-rose-500" />
                  : <HeartCrack size={18} className="text-stone-200" />}
              </div>
            ))}
          </div>
          {/* Score */}
          <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full text-amber-700 font-bold text-sm border border-amber-200">
            <Trophy size={14} /> {score}
          </div>
        </div>
      </div>

      {/* ── Main card ── */}
      <div className={`bg-white rounded-3xl shadow-lg border transition-all duration-200 relative overflow-hidden
        ${feedback === 'correct'
          ? 'border-emerald-400 ring-2 ring-emerald-400'
          : feedback === 'incorrect'
            ? 'border-rose-400 ring-2 ring-rose-400 animate-shake'
            : 'border-stone-100'
        }`}>

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/96 z-20 flex flex-col items-center justify-center p-8 animate-fade-in">
            <HeartCrack size={56} className="text-stone-300 mb-4" />
            <h2 className="text-3xl font-black text-stone-900 mb-2">Out of Lives!</h2>
            <p className="text-stone-500 mb-8">Great effort. Ready to go again?</p>
            <div className="bg-stone-50 p-4 rounded-2xl w-full mb-6 border border-stone-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-stone-500 font-medium">Final Score</span>
                <span className="text-xl font-bold text-stone-900">{score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">BeeCoins Earned</span>
                <span className="text-xl font-bold text-amber-500">+{Math.floor(score / 15)}</span>
              </div>
            </div>
            <button
              onClick={startGame}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-2xl font-bold shadow-lg transition-all hover:-translate-y-1"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="p-5 sm:p-7">
          {/* ── Audio button (large, centered) ── */}
          <div className="flex flex-col items-center mb-6">
            <button
              onClick={() => currentWord && speak(currentWord.audioUrl)}
              disabled={gameOver}
              className="w-24 h-24 bg-stone-900 hover:bg-stone-800 text-amber-400 rounded-full flex items-center justify-center mx-auto transition-all shadow-lg active:scale-95 border-4 border-white ring-2 ring-stone-800/10"
            >
              <Volume2 size={38} />
            </button>
            <p className="text-stone-400 text-[11px] font-bold uppercase tracking-widest mt-3">Tap to Listen</p>
          </div>

          {feedback === 'none' ? (
            <form onSubmit={checkSpelling}>
              {practiceMode === 'anagram' ? (
                <>
                  {/* Available Scrabble tiles */}
                  <div className="mb-5">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 text-center">Available</p>
                    <div className="flex flex-wrap justify-center gap-2 min-h-[56px] p-3 bg-amber-50/60 rounded-2xl border border-amber-100">
                      {shuffledLetters.length === 0 ? (
                        <div className="h-10 flex items-center">
                          <p className="text-stone-300 text-sm font-medium">—</p>
                        </div>
                      ) : (
                        shuffledLetters.map((letter, index) => (
                          <button
                            key={`${letter}-${index}`}
                            type="button"
                            onClick={() => handleLetterClick(letter, index)}
                            className="w-11 h-11 bg-stone-50 border border-stone-200 border-b-[3px] border-b-stone-300 rounded-lg font-black text-lg text-stone-800 shadow-sm hover:border-b-amber-400 hover:bg-white hover:-translate-y-1 transition-all active:translate-y-0 active:border-b active:shadow-none select-none"
                          >
                            {letter.toUpperCase()}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Selected tiles (student answer) */}
                  <div className="mb-6">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 text-center">Your Answer</p>
                    <div className="flex flex-wrap justify-center gap-2 min-h-[56px] p-3 rounded-2xl border-2 border-dashed border-stone-200">
                      {selectedLetters.map((letter, index) => (
                        <button
                          key={`sel-${index}`}
                          type="button"
                          onClick={() => handleRemoveLetter(index)}
                          className="w-11 h-11 bg-stone-900 text-amber-400 border-b-[3px] border-b-stone-700 rounded-lg font-black text-lg shadow-md hover:bg-stone-800 transition-all active:translate-y-0.5 active:border-b active:shadow-none select-none"
                        >
                          {letter.toUpperCase()}
                        </button>
                      ))}
                      {selectedLetters.length === 0 && (
                        <div className="w-full text-center py-3 text-stone-300 text-sm italic">
                          Tap letters above…
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                /* Spelling input — text-[16px] to prevent iOS auto-zoom */
                <div className={`relative mb-6 transition-all`}>
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    placeholder="Type here…"
                    className={`w-full text-center text-[18px] font-black text-stone-900 placeholder:text-stone-300
                      border-2 rounded-2xl py-4 px-4 focus:outline-none bg-stone-50 tracking-widest
                      transition-all duration-150
                      ${feedback === 'correct'
                        ? 'border-emerald-400 ring-2 ring-emerald-400/30 bg-emerald-50'
                        : feedback === 'incorrect'
                          ? 'border-rose-400 ring-2 ring-rose-400/30 bg-rose-50'
                          : 'border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                      }`}
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    autoCapitalize="none"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={!userInput.trim()}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-stone-900 rounded-2xl font-bold shadow-md shadow-amber-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Check Answer
              </button>
            </form>
          ) : (
            <div className="animate-fade-in">
              {/* Feedback banner */}
              <div className={`flex flex-col items-center mb-5 ${feedback === 'correct' ? 'text-emerald-600' : 'text-rose-600'
                }`}>
                <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 ${feedback === 'correct' ? 'bg-emerald-100' : 'bg-rose-50'
                  }`}>
                  {feedback === 'correct'
                    ? <CheckCircle size={30} />
                    : <XCircle size={30} />}
                </div>
                <h3 className="text-2xl font-black">
                  {feedback === 'correct' ? 'Correct! +15 pts' : 'Incorrect'}
                </h3>
                {feedback === 'incorrect' && (
                  <p className="text-stone-600 text-sm mt-1">
                    Correct: <span className="font-bold text-stone-900 bg-amber-100 px-2 py-0.5 rounded">{currentWord?.word}</span>
                  </p>
                )}
              </div>

              {/* Word info card */}
              <div className="bg-stone-50 p-4 rounded-2xl text-left mb-5 text-sm text-stone-600 border border-stone-100 flex gap-4 items-start">
                {currentWord?.image && (
                  <div className="w-16 h-16 rounded-xl bg-white border border-stone-200 overflow-hidden flex-shrink-0">
                    <img src={currentWord.image} className="w-full h-full object-cover" alt="Word" />
                  </div>
                )}
                <div className="flex-1">
                  <div className="flex gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full uppercase">
                      {currentWord?.partOfSpeech || 'noun'}
                    </span>
                    {currentWord?.theme && (
                      <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-[10px] font-medium rounded-full border border-stone-200">
                        {currentWord.theme}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-700 leading-snug"><span className="font-bold">Definition:</span> {currentWord?.definition}</p>
                </div>
              </div>

              <button
                onClick={nextWord}
                className="w-full py-4 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-amber-400 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                Next Word <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};