import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { WordEntry, GradeLevel, StudentProfile } from '../types';
import { getGradeLabel } from '../lib/gradeLabel';
import { Volume2, CheckCircle, XCircle, ChevronRight, Trophy, Shuffle, Heart, HeartCrack, Search, BookOpen, Zap, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { recordStudentStat, addCoins, checkAndUpdateStreak, fetchStudentWordStats, checkAndUnlockAchievements, fetchStudentInventory, consumeInventoryItem } from '../services/supabaseData';
import confetti from 'canvas-confetti';

type PracticeMode = 'spelling' | 'anagram' | 'proofreader' | 'scholar';

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

// Función para generar un error ortográfico sutil
const generateTypo = (word: string): string => {
  if (!word || word.length < 3) return word;
  let result = word;
  let attempts = 0;

  while (result.toLowerCase() === word.toLowerCase() && attempts < 10) {
    attempts++;
    const letters = word.split('');
    const typoType = Math.floor(Math.random() * 3);

    if (typoType === 0) {
      const idx = Math.floor(Math.random() * (letters.length - 1));
      if (letters[idx].toLowerCase() !== letters[idx + 1].toLowerCase()) {
        [letters[idx], letters[idx + 1]] = [letters[idx + 1], letters[idx]];
      } else {
        letters.splice(idx, 1);
      }
    } else if (typoType === 1) {
      const idx = Math.floor(Math.random() * letters.length);
      letters.splice(idx, 0, letters[idx]);
    } else {
      const map: Record<string, string[]> = {
        'a': ['e', 'o'], 'e': ['a', 'i'], 'i': ['e', 'y'], 'o': ['u', 'a'], 'u': ['o'],
        'c': ['s', 'z'], 's': ['c', 'z'], 'z': ['s', 'c'], 'b': ['v'], 'v': ['b'],
        'm': ['n'], 'n': ['m'], 'g': ['j'], 'j': ['g']
      };
      const changeableIndices = letters.map((l, i) => map[l.toLowerCase()] ? i : -1).filter(i => i !== -1);
      if (changeableIndices.length > 0) {
        const idx = changeableIndices[Math.floor(Math.random() * changeableIndices.length)];
        const char = letters[idx].toLowerCase();
        const options = map[char];
        const newChar = options[Math.floor(Math.random() * options.length)];
        letters[idx] = letters[idx] === letters[idx].toUpperCase() ? newChar.toUpperCase() : newChar;
      } else {
        const idx = Math.floor(Math.random() * letters.length);
        letters.splice(idx, 1);
      }
    }
    result = letters.join('');
  }

  if (result.toLowerCase() === word.toLowerCase()) {
    const idx = Math.floor(word.length / 2);
    result = word.slice(0, idx) + word.slice(idx + 1);
  }
  return result;
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
  const [typoWord, setTypoWord] = useState('');
  const [selectedTypoIndex, setSelectedTypoIndex] = useState<number | null>(null);
  const [usedAudioHint, setUsedAudioHint] = useState(false);

  // Gamification States
  const [lives, setLives] = useState(3);
  const [gameOver, setGameOver] = useState(false);
  const [mascotMessage, setMascotMessage] = useState<string>("Let's spell!");
  const [sessionCorrectStreak, setSessionCorrectStreak] = useState(0);
  const [sessionTotalXp, setSessionTotalXp] = useState(0);
  const [sessionTotalCorrect, setSessionTotalCorrect] = useState(0);
  const [achievementToast, setAchievementToast] = useState<string | null>(null);
  const [inventory, setInventory] = useState<any[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeStudent) {
      setSelectedGrade(activeStudent.grade);
      fetchStudentWordStats(activeStudent.id).then(setWordHistory);
      fetchStudentInventory(activeStudent.id).then(setInventory);
    }
  }, [activeStudent]);

  // Show achievement toast for 3s then hide
  const showAchievementToast = useCallback((keys: string[]) => {
    if (keys.length === 0) return;
    const BADGE_NAMES: Record<string, string> = {
      first_win: '🌟 First Victory!',
      streak_3: '🔥 3-Day Streak!',
      streak_7: '🔥 7-Day Streak!',
      streak_14: '🔥 14-Day Streak!',
      xp_1000: '⚡ 1,000 XP!',
      xp_5000: '⚡ 5,000 XP!',
      perfect_round: '🎯 5 in a Row!',
      champion: '👑 #1 Champion!',
      master: '💎 Master of Letters!',
    };
    const label = BADGE_NAMES[keys[0]] ?? `Achievement: ${keys[0]}`;
    setAchievementToast(label);
    setTimeout(() => setAchievementToast(null), 3500);
  }, []);

  const gradeWords = useMemo(() => words.filter(w => w.grade === selectedGrade), [words, selectedGrade]);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setLives(3);
    setGameOver(false);
    setSessionCorrectStreak(0);
    setSessionTotalXp(0);
    setSessionTotalCorrect(0);
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
        // Prevent immediate repetition if possible
        if (currentWord && word.id === currentWord.id && gradeWords.length > 1) {
          return 0; // Don't repeat immediately if there are other words
        }

        const stats = wordHistory.filter(h => h.word_id === word.id);
        if (stats.length === 0) return 30; // New word bonus (increased for variety)

        const lastAttempt = stats[0]; // Ordered by desc time

        let errorCount = 0;
        for (const s of stats) {
          if (!s.is_correct) errorCount++;
        }

        if (!lastAttempt.is_correct) {
          // Retry more specifically proportional to error counts, but ensure variety
          return 40 + (errorCount * 10);
        }

        // Check consecutive correct
        let consecutive = 0;
        for (const s of stats) {
          if (s.is_correct) consecutive++;
          else break;
        }
        if (consecutive > 2) return 1; // Mastered

        return 10; // Standard review
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
    setSelectedTypoIndex(null);
    setUsedAudioHint(false);
    setMascotMessage("Listen carefully...");

    // Si es modo anagrama, mezclar las letras
    if (practiceMode === 'anagram') {
      const shuffled = shuffleLetters(selectedWord.word);
      setShuffledLetters(shuffled);
    } else if (practiceMode === 'proofreader') {
      const typo = generateTypo(selectedWord.word);
      setTypoWord(typo);
    }

    // Auto pronounce after a short delay unless it's scholar mode
    if (practiceMode !== 'scholar') {
      setTimeout(() => speak(selectedWord.audioUrl), 500);
    }

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

  const handleTypoLetterClick = (index: number) => {
    if (feedback !== 'none') return;
    setSelectedTypoIndex(index === selectedTypoIndex ? null : index);
  };

  const submitProofreaderAnswer = (correctedWord: string) => {
    if (!currentWord) return;

    const userAnswer = correctedWord.toLowerCase();
    const correctAnswer = currentWord.word.toLowerCase();
    const isCorrect = userAnswer === correctAnswer;
    const timeTaken = Math.round((Date.now() - startTime.current) / 1000);

    // Calcular puntos basados en el modo
    let basePoints = 25; // Proofreader base points
    let points = isCorrect ? basePoints : 0;

    // Penalización por usar pista de audio en modo scholar (o si se adaptó para proofreader)
    if (isCorrect && usedAudioHint) {
      points = Math.floor(points / 2);
    }

    if (isCorrect) {
      setFeedback('correct');
      setScore(s => s + points);
      setMascotMessage("Amazing! You found the typo!");
      confetti({
        particleCount: 120,
        spread: 72,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#D97706', '#1C1917'], // Gold/Onyx for premium feel
      });
      // Add coins and check streak + achievements
      if (activeStudent) {
        const newSessionStreak = sessionCorrectStreak + 1;
        const newSessionXp = sessionTotalXp + points;
        const newSessionTotalCorrect = sessionTotalCorrect + 1;
        setSessionCorrectStreak(newSessionStreak);
        setSessionTotalXp(newSessionXp);
        setSessionTotalCorrect(newSessionTotalCorrect);
        addCoins(activeStudent.id, 1);
        checkAndUpdateStreak(activeStudent.id).then(streakRes => {
          if (streakRes.message && (streakRes.message.includes('Increase') || streakRes.message.includes('Saved'))) {
            setMascotMessage(streakRes.message);
          }
          checkAndUnlockAchievements(activeStudent.id, {
            totalXp: (activeStudent.total_xp ?? 0) + newSessionXp,
            currentStreak: streakRes.streak,
            sessionCorrectStreak: newSessionStreak,
            timeTakenSeconds: timeTaken,
            totalCorrectAnswers: wordHistory.filter(w => w.is_correct).length + newSessionTotalCorrect,
            coinsBalance: (activeStudent.coins ?? 0) + newSessionTotalCorrect,
            inventoryItemCount: inventory.length,
          }).then(newBadges => showAchievementToast(newBadges));
        });
      }
    } else {
      setFeedback('incorrect');
      // Set to the 'wrong' guessed word briefly so user sees what they entered
      setTypoWord(correctedWord);
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
      fetchStudentWordStats(activeStudent.id).then(setWordHistory);
    }
  };

  const handleVirtualKeyPress = (key: string) => {
    if (practiceMode !== 'proofreader' || feedback !== 'none' || selectedTypoIndex === null) return;

    // Reconstruct the word with the new letter
    const letters = typoWord.split('');
    letters[selectedTypoIndex] = key;
    const correctedWord = letters.join('');

    // Visually update the typo word temporarily, then submit for checking
    setTypoWord(correctedWord);
    setSelectedTypoIndex(null);

    // Small delay to allow react state to visually update before checking
    setTimeout(() => {
      submitProofreaderAnswer(correctedWord);
    }, 50);
  };

  // Listen for physical keyboard presses when a typo letter is selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if not in proofreader mode, game is over, feedback is showing, or nothing is selected
      if (practiceMode !== 'proofreader' || gameOver || feedback !== 'none' || selectedTypoIndex === null) return;

      // Allow backspace/delete to "clear" a tile or modify it if requested later, 
      // but for now, we just want A-Z
      if (/^[a-zA-Z]$/.test(e.key)) {
        handleVirtualKeyPress(e.key);
      } else if (e.key === 'Escape') {
        setSelectedTypoIndex(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [practiceMode, gameOver, feedback, selectedTypoIndex, typoWord]);

  // Keyboard layout for virtual keyboard
  const keyboardRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

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

    // Calcular puntos basados en el modo
    let basePoints = 15;
    if (practiceMode === 'anagram') basePoints = 20;
    if (practiceMode === 'proofreader') basePoints = 25;
    if (practiceMode === 'scholar') basePoints = 30; // Scholar base points

    let points = isCorrect ? basePoints : 0;

    // Penalización por usar pista de audio en modo scholar
    if (isCorrect && usedAudioHint && practiceMode === 'scholar') {
      points = Math.floor(points / 2);
    }



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
      // Add coins and check streak + achievements
      if (activeStudent) {
        const newSessionStreak = sessionCorrectStreak + 1;
        const newSessionXp = sessionTotalXp + points;
        const newSessionTotalCorrect = sessionTotalCorrect + 1;
        setSessionCorrectStreak(newSessionStreak);
        setSessionTotalXp(newSessionXp);
        setSessionTotalCorrect(newSessionTotalCorrect);
        addCoins(activeStudent.id, 1);
        checkAndUpdateStreak(activeStudent.id).then(streakRes => {
          if (streakRes.message && (streakRes.message.includes('Increase') || streakRes.message.includes('Saved'))) {
            setMascotMessage(streakRes.message);
          }
          checkAndUnlockAchievements(activeStudent.id, {
            totalXp: (activeStudent.total_xp ?? 0) + newSessionXp,
            currentStreak: streakRes.streak,
            sessionCorrectStreak: newSessionStreak,
            timeTakenSeconds: timeTaken,
            totalCorrectAnswers: wordHistory.filter(w => w.is_correct).length + newSessionTotalCorrect,
            coinsBalance: (activeStudent.coins ?? 0) + newSessionTotalCorrect,
            inventoryItemCount: inventory.length,
          }).then(newBadges => showAchievementToast(newBadges));
        });
      }
    } else {
      setFeedback('incorrect');
      setSessionCorrectStreak(0); // reset on wrong answer
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
            <button
              onClick={() => setPracticeMode('proofreader')}
              className={`p-5 rounded-2xl border-2 transition-all group ${practiceMode === 'proofreader'
                ? 'bg-indigo-50 border-indigo-500 shadow-md scale-[1.02]'
                : 'bg-white text-stone-600 border-stone-100 hover:border-indigo-200'
                }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors ${practiceMode === 'proofreader' ? 'bg-indigo-500 text-white' : 'bg-stone-100 text-stone-400 group-hover:bg-indigo-50 group-hover:text-indigo-500'
                }`}>
                <Search size={24} />
              </div>
              <div className={`font-bold ${practiceMode === 'proofreader' ? 'text-indigo-900' : 'text-stone-800'}`}>Proofreader Challenge</div>
              <div className={`text-xs mt-1 ${practiceMode === 'proofreader' ? 'text-indigo-600' : 'text-stone-400'}`}>Fix the Typo</div>
            </button>
            <button
              onClick={() => setPracticeMode('scholar')}
              className={`p-5 rounded-2xl border-2 transition-all group ${practiceMode === 'scholar'
                ? 'bg-emerald-50 border-emerald-500 shadow-md scale-[1.02]'
                : 'bg-white text-stone-600 border-stone-100 hover:border-emerald-200'
                }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors ${practiceMode === 'scholar' ? 'bg-emerald-500 text-white' : 'bg-stone-100 text-stone-400 group-hover:bg-emerald-50 group-hover:text-emerald-500'
                }`}>
                <BookOpen size={24} />
              </div>
              <div className={`font-bold ${practiceMode === 'scholar' ? 'text-emerald-900' : 'text-stone-800'}`}>Scholar Mode</div>
              <div className={`text-xs mt-1 ${practiceMode === 'scholar' ? 'text-emerald-600' : 'text-stone-400'}`}>Read &amp; Spell</div>
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

      {/* ── Achievement Toast ── */}
      <AnimatePresence>
        {achievementToast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-amber-500 text-stone-900 px-6 py-3 rounded-2xl shadow-2xl font-black text-lg flex items-center gap-3 border-2 border-amber-300"
          >
            <Zap size={22} className="text-stone-900" />
            Achievement Unlocked: {achievementToast}
          </motion.div>
        )}
      </AnimatePresence>

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
                <span className="text-xl font-bold text-amber-500">+{Math.floor(score / (practiceMode === 'scholar' ? 30 : practiceMode === 'proofreader' ? 25 : practiceMode === 'anagram' ? 20 : 15))}</span>
              </div>
            </div>
            {/* Extra Life item — use if available */}
            {(() => {
              const extraLife = inventory.find(i => i.itemId === 'extra_life' && i.quantity > 0);
              if (!extraLife || !activeStudent) return null;
              return (
                <button
                  onClick={async () => {
                    await consumeInventoryItem(extraLife.id, extraLife.quantity);
                    setInventory(inv => inv.map(i => i.id === extraLife.id ? { ...i, quantity: i.quantity - 1 } : i));
                    setLives(3);
                    setGameOver(false);
                    nextWord();
                  }}
                  className="w-full py-3 mb-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  <Shield size={18} /> Use Extra Life ({extraLife.quantity} left)
                </button>
              );
            })()}
            <button
              onClick={startGame}
              className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-2xl font-bold shadow-lg transition-all hover:-translate-y-1"
            >
              Try Again
            </button>
          </div>
        )}

        <div className="p-5 sm:p-7">
          {/* ── Audio button (large, centered) — Hidden in Scholar mode initially ── */}
          {practiceMode !== 'scholar' && (
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
          )}

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
                          <motion.button
                            key={`${letter}-${index}`}
                            type="button"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleLetterClick(letter, index)}
                            className="w-11 h-11 bg-stone-50 border border-stone-200 border-b-[3px] border-b-stone-300 rounded-lg font-black text-lg text-stone-800 shadow-sm hover:border-b-amber-400 hover:bg-white transition-all select-none"
                          >
                            {letter}
                          </motion.button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Selected tiles (student answer) */}
                  <div className="mb-6">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2 text-center">Your Answer</p>
                    <div className="flex flex-wrap justify-center gap-2 min-h-[56px] p-3 rounded-2xl border-2 border-dashed border-stone-200">
                      {selectedLetters.map((letter, index) => (
                        <motion.button
                          key={`sel-${index}`}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRemoveLetter(index)}
                          className="w-11 h-11 bg-stone-900 text-amber-400 border-b-[3px] border-b-stone-700 rounded-lg font-black text-lg shadow-md hover:bg-stone-800 transition-all select-none"
                        >
                          {letter}
                        </motion.button>
                      ))}
                      {selectedLetters.length === 0 && (
                        <div className="w-full text-center py-3 text-stone-300 text-sm italic">
                          Tap letters above…
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : practiceMode === 'proofreader' ? (
                <>
                  {/* Proofreader mode visual typo display */}
                  <div className="mb-6 text-center animate-fade-in relative">
                    <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-4">Tap the incorrect letter</p>

                    <div className="flex flex-wrap justify-center gap-2 min-h-[72px] mb-8">
                      {typoWord.split('').map((letter, index) => (
                        <motion.button
                          key={`typo-${index}-${letter}`}
                          type="button"
                          whileHover={{ scale: feedback === 'none' ? 1.05 : 1 }}
                          whileTap={{ scale: feedback === 'none' ? 0.95 : 1 }}
                          onClick={() => handleTypoLetterClick(index)}
                          disabled={feedback !== 'none'}
                          className={`w-12 h-14 sm:w-14 sm:h-16 flex items-center justify-center rounded-xl shadow-sm transition-all duration-200 select-none
                             ${feedback === 'correct'
                              ? 'bg-emerald-50 border-2 border-emerald-400 text-emerald-700 shadow-[0_0_15px_rgba(52,211,153,0.4)]'
                              : feedback === 'incorrect'
                                ? 'bg-rose-50 border-2 border-rose-400 text-rose-700 shadow-[0_0_15px_rgba(251,113,133,0.4)] animate-shake'
                                : selectedTypoIndex === index
                                  ? 'bg-amber-50 border-2 border-amber-500 text-amber-900 ring-4 ring-amber-500/20 translate-y-[-4px]'
                                  : 'bg-stone-50 border border-stone-200 border-b-[4px] border-b-stone-300 text-stone-900 hover:border-b-stone-400 hover:bg-white'
                            }
                           `}
                        >
                          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
                            {letter}
                          </span>
                        </motion.button>
                      ))}
                    </div>

                    {/* Virtual Keyboard (Only shows when a letter is selected) */}
                    {selectedTypoIndex !== null && feedback === 'none' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-stone-100 p-3 sm:p-4 rounded-2xl border border-stone-200 mt-4 mx-auto max-w-sm shadow-inner"
                      >
                        <p className="text-xs font-bold text-stone-500 mb-3">Select replacement letter</p>
                        <div className="flex flex-col gap-2">
                          {keyboardRows.map((row, rowIndex) => (
                            <div key={`row-${rowIndex}`} className="flex justify-center gap-1.5 sm:gap-2">
                              {row.map(key => (
                                <button
                                  key={`key-${key}`}
                                  type="button"
                                  onClick={() => handleVirtualKeyPress(key)}
                                  className="w-8 h-10 sm:w-9 sm:h-11 bg-white border border-stone-300 border-b-[3px] rounded-lg font-bold text-stone-700 uppercase hover:bg-stone-50 hover:border-b-stone-400 hover:text-stone-900 active:translate-y-[2px] active:border-b-[1px] transition-all"
                                >
                                  {key}
                                </button>
                              ))}
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                </>
              ) : practiceMode === 'scholar' ? (
                <>
                  {/* Scholar mode Dictionary Card */}
                  <div className="mb-6 animate-fade-in">
                    <div className="bg-stone-50 border-double border-4 border-stone-300 rounded-xl p-6 sm:p-8 shadow-sm relative text-center min-h-[160px] flex flex-col justify-center items-center">
                      <p className="text-amber-600 font-serif italic mb-3 text-lg">
                        {currentWord?.partOfSpeech || 'noun'}
                      </p>

                      {currentWord?.definition ? (
                        <p className="text-stone-900 font-medium text-xl sm:text-2xl leading-snug">
                          {currentWord.definition}
                        </p>
                      ) : (
                        <p className="text-stone-400 italic text-lg opacity-80">
                          Definition redacted for competition.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Elegant input for scholar mode */}
                  <div className={`relative mb-6 transition-all`}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      placeholder="Spell the word..."
                      className={`w-full text-center text-[20px] font-serif text-stone-900 placeholder:text-stone-300 placeholder:font-sans
                        border-b-[3px] py-3 px-4 focus:outline-none bg-transparent
                        transition-all duration-300
                        ${feedback === 'correct'
                          ? 'border-emerald-400 text-emerald-700'
                          : feedback === 'incorrect'
                            ? 'border-rose-400 text-rose-700'
                            : 'border-stone-400 focus:border-amber-500 focus:shadow-[0_4px_12px_-6px_rgba(245,158,11,0.5)]'
                        }`}
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      autoCapitalize="none"
                    />
                  </div>

                  {/* Reveal Audio Hint button */}
                  <div className="flex justify-center mb-6">
                    <button
                      type="button"
                      onClick={() => {
                        setUsedAudioHint(true);
                        speak(currentWord?.audioUrl);
                      }}
                      disabled={feedback !== 'none'}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all
                        ${usedAudioHint
                          ? 'bg-rose-50 border-rose-200 text-rose-600'
                          : 'bg-white border-stone-200 text-stone-500 hover:text-amber-600 hover:border-amber-300 hover:bg-amber-50 shadow-sm'
                        }`}
                    >
                      <Volume2 size={16} />
                      {usedAudioHint ? (
                        <span className="flex items-center gap-1">
                          Audio revealed <span className="bg-rose-100 px-1.5 py-0.5 rounded text-[10px] uppercase ml-1">-50% XP</span>
                        </span>
                      ) : (
                        "Reveal Audio Hint"
                      )}
                    </button>
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

              {practiceMode !== 'proofreader' && (
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!userInput.trim()}
                  className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-stone-900 rounded-2xl font-bold shadow-md shadow-amber-100 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Check Answer
                </motion.button>
              )}
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
                  {feedback === 'correct' ? `Correct! +${usedAudioHint ? Math.floor((practiceMode === 'scholar' ? 30 : practiceMode === 'proofreader' ? 25 : practiceMode === 'anagram' ? 20 : 15) / 2) : (practiceMode === 'scholar' ? 30 : practiceMode === 'proofreader' ? 25 : practiceMode === 'anagram' ? 20 : 15)} pts` : 'Incorrect'}
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