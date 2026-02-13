import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WordEntry, GradeLevel, StudentProfile } from '../types';
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
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
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

  // --- Render Functions ---

  // Mascot Component
  const Mascot = ({ message, state }: { message: string, state: 'neutral' | 'happy' | 'sad' }) => (
    <div className="flex items-end gap-3 mb-6 animate-fade-in">
      <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 relative">
        {/* Replace with actual Bee Image */}
        <img src="/bee.png" alt="Mascot" className={`w-full h-full object-contain drop-shadow-md ${state === 'happy' ? 'animate-bounce' : state === 'sad' ? 'grayscale opacity-80' : ''}`} />
      </div>
      <div className="bg-white border-2 border-stone-200 rounded-2xl rounded-bl-none p-3 shadow-sm relative -top-4 max-w-[200px]">
        <p className="text-sm font-bold text-stone-700 leading-tight">{message}</p>
      </div>
    </div>
  );

  // Home / Menu Screen
  if (!isPlaying) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-stone-200 shadow-sm text-center animate-fade-in relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-yellow-300 via-yellow-400 to-yellow-500"></div>
        <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-white shadow-lg relative -mt-4">
          <Trophy size={36} />
        </div>
        <h2 className="text-2xl font-black text-stone-800 mb-2">Ready to Practice?</h2>
        <p className="text-stone-500 mb-8">Earn coins, keep your streak, and master your spelling!</p>

        {/* Mode Selector */}
        <div className="mb-8">
          <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-4">Choose Mode</label>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setPracticeMode('spelling')}
              className={`p-5 rounded-2xl border-2 transition-all group ${practiceMode === 'spelling'
                ? 'bg-green-50 border-green-500 shadow-md transform scale-[1.02]'
                : 'bg-white text-stone-600 border-stone-100 hover:border-green-200 hover:bg-green-50/50'
                }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors ${practiceMode === 'spelling' ? 'bg-green-500 text-white' : 'bg-stone-100 text-stone-400 group-hover:bg-green-100 group-hover:text-green-500'
                }`}>
                <Volume2 size={24} />
              </div>
              <div className="font-bold text-stone-800">Spelling Drill</div>
              <div className="text-xs text-stone-400 mt-1">Listen & Type</div>
            </button>
            <button
              onClick={() => setPracticeMode('anagram')}
              className={`p-5 rounded-2xl border-2 transition-all group ${practiceMode === 'anagram'
                ? 'bg-purple-50 border-purple-500 shadow-md transform scale-[1.02]'
                : 'bg-white text-stone-600 border-stone-100 hover:border-purple-200 hover:bg-purple-50/50'
                }`}
            >
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 transition-colors ${practiceMode === 'anagram' ? 'bg-purple-500 text-white' : 'bg-stone-100 text-stone-400 group-hover:bg-purple-100 group-hover:text-purple-500'
                }`}>
                <Shuffle size={24} />
              </div>
              <div className="font-bold text-stone-800">Anagram Game</div>
              <div className="text-xs text-stone-400 mt-1">Unscramble</div>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-stone-50 rounded-xl mb-8 border border-stone-100">
          <div className="text-left">
            <p className="text-xs font-bold text-stone-400 uppercase">Grade Level</p>
            <p className="font-bold text-stone-700">Grade {selectedGrade}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-stone-400 uppercase">Words Available</p>
            <p className="font-bold text-stone-700">{gradeWords.length}</p>
          </div>
        </div>

        <button
          onClick={startGame}
          disabled={gradeWords.length === 0}
          className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-xl shadow-green-200 transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50 disabled:translate-y-0 ${practiceMode === 'anagram'
            ? 'bg-purple-600 hover:bg-purple-700'
            : 'bg-green-600 hover:bg-green-700'
            }`}
        >
          Start Challenge
        </button>
      </div>
    );
  }

  // Active Game Screen
  return (
    <div className="max-w-xl mx-auto">
      {/* Header Bar */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setIsPlaying(false)}
          className="text-stone-400 hover:text-stone-600 font-bold text-sm transition-colors py-2 px-3 hover:bg-stone-100 rounded-lg"
        >
          ✕ Quit
        </button>

        {/* Lives & Score */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1 bg-white px-3 py-1.5 rounded-full shadow-sm border border-stone-100">
            {[1, 2, 3].map(i => (
              <div key={i} className="transition-all duration-300">
                {i <= lives ? (
                  <Heart size={20} className="fill-red-500 text-red-500" />
                ) : (
                  <HeartCrack size={20} className="text-stone-300" />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 bg-yellow-100 px-3 py-1.5 rounded-full text-yellow-700 font-bold text-sm border border-yellow-200">
            <Trophy size={16} /> {score}
          </div>
        </div>
      </div>

      <Mascot
        message={mascotMessage}
        state={gameOver ? 'sad' : feedback === 'correct' ? 'happy' : feedback === 'incorrect' ? 'sad' : 'neutral'}
      />

      <div className={`bg-white p-8 rounded-3xl shadow-xl border border-stone-100 text-center relative overflow-hidden transition-all duration-300 ${feedback === 'incorrect' ? 'animate-shake border-red-200' : ''}`}>

        {/* Game Over Overlay */}
        {gameOver && (
          <div className="absolute inset-0 bg-white/95 z-20 flex flex-col items-center justify-center p-8 animate-fade-in">
            <HeartCrack size={64} className="text-stone-300 mb-4" />
            <h2 className="text-3xl font-black text-stone-800 mb-2">Out of Lives!</h2>
            <p className="text-stone-500 mb-8">You showed great effort. Ready to try again?</p>
            <div className="bg-stone-50 p-4 rounded-xl w-full mb-8 border border-stone-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-stone-500 font-medium">Final Score</span>
                <span className="text-xl font-bold text-stone-800">{score}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500 font-medium">BeeCoins Earned</span>
                <span className="text-xl font-bold text-yellow-500">+{Math.floor(score / 15)}</span>
              </div>
            </div>
            <button onClick={startGame} className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 transition-all hover:-translate-y-1">
              Try Again
            </button>
          </div>
        )}

        {/* Correct Answer Overlay */}
        {feedback === 'correct' && (
          <div className="absolute inset-0 bg-green-500/5 flex items-center justify-center z-0 pointer-events-none"></div>
        )}

        <div className="relative z-10">
          <button
            onClick={() => currentWord && speak(currentWord.audioUrl)}
            disabled={gameOver}
            className="w-24 h-24 bg-gradient-to-br from-yellow-50 to-yellow-100 hover:from-yellow-100 hover:to-yellow-200 text-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 transition-all shadow-sm border-4 border-white active:scale-95"
          >
            <Volume2 size={40} className="text-yellow-600" />
          </button>

          <p className="text-stone-400 text-xs font-bold uppercase tracking-wider mb-6">Tap to Listen</p>

          {feedback === 'none' ? (
            <form onSubmit={checkSpelling}>
              {practiceMode === 'anagram' ? (
                <>
                  {/* Letras disponibles (mezcladas) */}
                  <div className="mb-6">
                    <div className="flex flex-wrap justify-center gap-2 min-h-[60px] p-4 bg-stone-50 rounded-xl border border-stone-200 border-dashed">
                      {shuffledLetters.length === 0 ? (
                        <div className="h-10 flex items-center"><p className="text-stone-300 text-sm font-medium">Empty</p></div>
                      ) : (
                        shuffledLetters.map((letter, index) => (
                          <button
                            key={`${letter}-${index}`}
                            type="button"
                            onClick={() => handleLetterClick(letter, index)}
                            className="w-12 h-12 bg-white border-b-4 border-stone-200 rounded-lg font-bold text-xl text-stone-700 hover:border-purple-400 hover:text-purple-600 hover:-translate-y-1 transition-all active:translate-y-0 active:border-b-0"
                          >
                            {letter}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Letras seleccionadas (respuesta del estudiante) */}
                  <div className="mb-8">
                    <p className="text-xs font-bold text-stone-400 uppercase mb-3">Your Answer</p>
                    <div className="flex flex-wrap justify-center gap-2 min-h-[60px] p-2">
                      {selectedLetters.map((letter, index) => (
                        <button
                          key={`selected-${index}`}
                          type="button"
                          onClick={() => handleRemoveLetter(index)}
                          className="w-12 h-12 bg-purple-500 text-white border-b-4 border-purple-700 rounded-lg font-bold text-xl hover:bg-purple-600 transition-all active:translate-y-1 active:border-b-0"
                        >
                          {letter}
                        </button>
                      ))}
                      {selectedLetters.length === 0 && (
                        <div className="w-full text-center py-4 border-b-2 border-stone-100 text-stone-300 italic">
                          Select letters...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Hidden input for typing fallback support in anagram if desired, OR just reliance on buttons. 
                      Keeping simple for now: Anagram is click-only to prevent confusion, 
                      or we can keep the helper input but hide it better. 
                      Let's stick to the button-only interface for anagram as it is clearer.
                  */}
                </>
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type here..."
                  className="w-full text-center text-4xl font-black text-stone-800 placeholder:text-stone-300 border-none focus:outline-none mb-8 bg-transparent tracking-widest"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              )}

              <button
                type="submit"
                disabled={!userInput.trim()}
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-1 active:translate-y-0 active:shadow-none ${practiceMode === 'anagram'
                  ? 'bg-purple-500 hover:bg-purple-600 text-white shadow-purple-200'
                  : 'bg-green-500 hover:bg-green-600 text-white shadow-green-200'
                  }`}
              >
                Check Answer
              </button>
            </form>
          ) : (
            <div className="animate-slide-up">
              <div className="mb-6">
                {feedback === 'correct' ? (
                  <div className="flex flex-col items-center text-green-500">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                      <CheckCircle size={32} />
                    </div>
                    <h3 className="text-2xl font-black">Correct!</h3>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-red-500">
                    <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-2">
                      <XCircle size={32} />
                    </div>
                    <h3 className="text-2xl font-black">Incorrect</h3>
                    <p className="text-stone-600 mt-2">
                      Correct: <span className="font-bold text-stone-900 bg-yellow-100 px-2 py-0.5 rounded">{currentWord?.word}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-stone-50 p-4 rounded-xl text-left mb-6 text-sm text-stone-600 border border-stone-100 flex gap-4 items-start">
                {currentWord?.image && (
                  <div className="w-20 h-20 rounded-lg bg-white border border-stone-200 overflow-hidden flex-shrink-0">
                    <img src={currentWord.image} className="w-full h-full object-cover" alt="Word" />
                  </div>
                )}
                <div>
                  <p className="italic text-stone-500 mb-1">{currentWord?.difficulty}</p>
                  <p><span className="font-bold text-stone-700">Definition:</span> {currentWord?.definition}</p>
                </div>
              </div>

              <button
                onClick={nextWord}
                className="w-full py-4 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg hover:-translate-y-1"
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