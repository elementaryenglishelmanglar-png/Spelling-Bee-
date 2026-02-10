import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WordEntry, GradeLevel } from '../types';
import { Volume2, CheckCircle, XCircle, ChevronRight, Trophy, Shuffle } from 'lucide-react';

type PracticeMode = 'spelling' | 'anagram';

interface StudentDrillProps {
  words: WordEntry[];
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

export const StudentDrill: React.FC<StudentDrillProps> = ({ words }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(1);
  const [practiceMode, setPracticeMode] = useState<PracticeMode>('spelling');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [userInput, setUserInput] = useState('');
  const [shuffledLetters, setShuffledLetters] = useState<string[]>([]);
  const [selectedLetters, setSelectedLetters] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'none' | 'correct' | 'incorrect'>('none');
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const gradeWords = useMemo(() => words.filter(w => w.grade === selectedGrade), [words, selectedGrade]);

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    nextWord();
  };

  const nextWord = () => {
    if (gradeWords.length === 0) return;
    const random = gradeWords[Math.floor(Math.random() * gradeWords.length)];
    setCurrentWord(random);
    setUserInput('');
    setSelectedLetters([]);
    setFeedback('none');

    // Si es modo anagrama, mezclar las letras
    if (practiceMode === 'anagram') {
      const shuffled = shuffleLetters(random.word.toLowerCase());
      setShuffledLetters(shuffled);
    }

    // Auto pronounce after a short delay
    setTimeout(() => speak(random.audioUrl), 500);

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
    const originalWord = currentWord.word.toLowerCase();
    const originalLetters = originalWord.split('');
    const inputLetters = inputText.toLowerCase().split('');

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

  const checkSpelling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userInput.trim()) return;

    const userAnswer = userInput.trim().toLowerCase();
    const correctAnswer = currentWord.word.toLowerCase();

    if (userAnswer === correctAnswer) {
      setFeedback('correct');
      setScore(s => s + 10);
    } else {
      setFeedback('incorrect');
    }
  };

  if (!isPlaying) {
    return (
      <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl border border-stone-200 shadow-sm text-center animate-fade-in">
        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-200">
          <Trophy size={32} />
        </div>
        <h2 className="text-2xl font-bold text-stone-800 mb-2">Practice Exercises</h2>
        <p className="text-stone-500 mb-8">Choose your practice mode and test your skills!</p>

        {/* Selector de modo de práctica */}
        <div className="mb-8">
          <label className="block text-sm font-bold text-stone-400 uppercase mb-3">Practice Mode</label>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              onClick={() => setPracticeMode('spelling')}
              className={`p-4 rounded-xl border-2 transition-all ${practiceMode === 'spelling'
                ? 'bg-green-600 text-white border-green-600 shadow-lg'
                : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-300'
                }`}
            >
              <Volume2 size={24} className="mx-auto mb-2" />
              <div className="font-bold text-sm">Spelling Drill</div>
              <div className="text-xs mt-1 opacity-80">Listen & Type</div>
            </button>
            <button
              onClick={() => setPracticeMode('anagram')}
              className={`p-4 rounded-xl border-2 transition-all ${practiceMode === 'anagram'
                ? 'bg-purple-600 text-white border-purple-600 shadow-lg'
                : 'bg-stone-50 text-stone-600 border-stone-200 hover:border-stone-300'
                }`}
            >
              <Shuffle size={24} className="mx-auto mb-2" />
              <div className="font-bold text-sm">Scrambled Letters</div>
              <div className="text-xs mt-1 opacity-80">Rearrange Letters</div>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Select Grade Level</label>
          <div className="flex justify-center flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g as GradeLevel)}
                className={`w-10 h-10 rounded-lg font-bold transition-all ${selectedGrade === g
                  ? 'bg-green-600 text-white shadow-lg scale-110'
                  : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                  }`}
              >
                {g}
              </button>
            ))}
          </div>
          <p className="text-xs text-stone-400 mt-2">{gradeWords.length} words available</p>
        </div>

        <button
          onClick={startGame}
          disabled={gradeWords.length === 0}
          className={`w-full py-4 text-white rounded-xl font-bold text-lg shadow-lg transition-all hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0 ${practiceMode === 'anagram'
            ? 'bg-purple-600 hover:bg-purple-700'
            : 'bg-green-600 hover:bg-green-700'
            }`}
        >
          Start {practiceMode === 'anagram' ? 'Anagram Game' : 'Spelling Drill'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => setIsPlaying(false)}
          className="text-sm font-medium text-stone-500 hover:text-stone-800"
        >
          ← Quit {practiceMode === 'anagram' ? 'Game' : 'Drill'}
        </button>
        <div className={`px-4 py-1 rounded-full font-bold text-sm border ${practiceMode === 'anagram'
          ? 'bg-purple-100 text-purple-700 border-purple-200'
          : 'bg-green-100 text-green-700 border-green-200'
          }`}>
          Score: {score}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100 text-center relative overflow-hidden">
        {feedback === 'correct' && (
          <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center z-0 animate-pulse"></div>
        )}

        <div className="relative z-10">
          <button
            onClick={() => currentWord && speak(currentWord.audioUrl)}
            className="w-24 h-24 bg-yellow-50 hover:bg-yellow-100 text-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors shadow-sm border border-yellow-200"
          >
            <Volume2 size={40} />
          </button>

          <p className="text-stone-500 text-sm mb-6">Click icon to hear the word again</p>

          {feedback === 'none' ? (
            <form onSubmit={checkSpelling}>
              {practiceMode === 'anagram' ? (
                <>
                  {/* Letras disponibles (mezcladas) */}
                  <div className="mb-6">
                    <p className="text-xs font-bold text-stone-400 uppercase mb-3">Available Letters</p>
                    <div className="flex flex-wrap justify-center gap-2 min-h-[60px] p-4 bg-stone-50 rounded-xl border border-stone-200">
                      {shuffledLetters.length === 0 ? (
                        <p className="text-stone-400 text-sm italic">All letters used</p>
                      ) : (
                        shuffledLetters.map((letter, index) => (
                          <button
                            key={`${letter}-${index}`}
                            type="button"
                            onClick={() => handleLetterClick(letter, index)}
                            className="w-12 h-12 bg-white border-2 border-stone-300 rounded-lg font-bold text-xl text-stone-800 hover:bg-purple-50 hover:border-purple-400 hover:scale-110 transition-all shadow-sm"
                          >
                            {letter.toUpperCase()}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Letras seleccionadas (respuesta del estudiante) */}
                  <div className="mb-6">
                    <p className="text-xs font-bold text-stone-400 uppercase mb-3">Your Answer</p>
                    <div className="flex flex-wrap justify-center gap-2 min-h-[60px] p-4 bg-purple-50 rounded-xl border-2 border-purple-200">
                      {selectedLetters.length === 0 ? (
                        <p className="text-stone-400 text-sm italic">Click letters above to build the word</p>
                      ) : (
                        selectedLetters.map((letter, index) => (
                          <button
                            key={`selected-${index}`}
                            type="button"
                            onClick={() => handleRemoveLetter(index)}
                            className="w-12 h-12 bg-purple-600 text-white border-2 border-purple-700 rounded-lg font-bold text-xl hover:bg-purple-700 hover:scale-110 transition-all shadow-md"
                          >
                            {letter.toUpperCase()}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Input de texto alternativo */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={userInput}
                    onChange={(e) => {
                      const newInput = e.target.value.toLowerCase();
                      setUserInput(newInput);

                      // Actualizar letras seleccionadas
                      setSelectedLetters(newInput.split(''));

                      // Recalcular letras disponibles basándose en la palabra original
                      const available = recalculateAvailableLetters(newInput);
                      setShuffledLetters(available);
                    }}
                    placeholder="Or type directly..."
                    className="w-full text-center text-2xl font-bold text-stone-800 border-b-2 border-stone-200 focus:border-purple-500 outline-none pb-2 mb-4 bg-transparent"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </>
              ) : (
                <input
                  ref={inputRef}
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Type spelling here..."
                  className="w-full text-center text-3xl font-bold text-stone-800 border-b-2 border-stone-200 focus:border-yellow-500 outline-none pb-2 mb-8 bg-transparent"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                />
              )}
              <button
                type="submit"
                disabled={!userInput.trim()}
                className={`w-full py-3 rounded-xl font-bold shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed ${practiceMode === 'anagram'
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-stone-800 hover:bg-stone-900 text-yellow-400'
                  }`}
              >
                Check Answer
              </button>
            </form>
          ) : (
            <div className="animate-slide-up">
              <div className="mb-6">
                {feedback === 'correct' ? (
                  <div className="flex flex-col items-center text-green-600">
                    <CheckCircle size={48} className="mb-2" />
                    <h3 className="text-2xl font-bold">Correct!</h3>
                  </div>
                ) : (
                  <div className="flex flex-col items-center text-red-600">
                    <XCircle size={48} className="mb-2" />
                    <h3 className="text-2xl font-bold">Incorrect</h3>
                    <p className="text-stone-600 mt-2">
                      Correct spelling: <span className="font-bold text-stone-900">{currentWord?.word}</span>
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-stone-50 p-4 rounded-xl text-left mb-6 text-sm text-stone-600 border border-stone-100 flex gap-4">
                {currentWord?.image && (
                  <div className="w-20 h-20 rounded-lg bg-white border border-stone-200 overflow-hidden flex-shrink-0">
                    <img src={currentWord.image} className="w-full h-full object-cover" alt="Word" />
                  </div>
                )}
                <div>
                  <p><span className="font-bold">Definition:</span> {currentWord?.definition}</p>
                </div>
              </div>

              <button
                onClick={nextWord}
                className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
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