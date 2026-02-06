import React, { useState, useMemo, useEffect, useRef } from 'react';
import { WordEntry, GradeLevel } from '../types';
import { Volume2, CheckCircle, XCircle, ChevronRight, Trophy } from 'lucide-react';

interface StudentDrillProps {
  words: WordEntry[];
}

export const StudentDrill: React.FC<StudentDrillProps> = ({ words }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [userInput, setUserInput] = useState('');
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
    setFeedback('none');
    
    // Auto pronounce after a short delay
    setTimeout(() => speak(random.word), 500);
    
    // Focus input
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  const checkSpelling = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWord || !userInput.trim()) return;

    if (userInput.trim().toLowerCase() === currentWord.word.toLowerCase()) {
      setFeedback('correct');
      setScore(s => s + 10);
      const utterance = new SpeechSynthesisUtterance("Correct!");
      window.speechSynthesis.speak(utterance);
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
        <h2 className="text-2xl font-bold text-stone-800 mb-2">Spelling Drill Exercise</h2>
        <p className="text-stone-500 mb-8">Listen to the word and type it correctly. Test your skills!</p>
        
        <div className="mb-8">
          <label className="block text-sm font-bold text-stone-400 uppercase mb-2">Select Grade Level</label>
          <div className="flex justify-center flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
              <button
                key={g}
                onClick={() => setSelectedGrade(g as GradeLevel)}
                className={`w-10 h-10 rounded-lg font-bold transition-all ${
                  selectedGrade === g 
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
          className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all hover:-translate-y-1 disabled:opacity-50 disabled:translate-y-0"
        >
          Start Drill
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
          ← Quit Drill
        </button>
        <div className="px-4 py-1 bg-green-100 text-green-700 rounded-full font-bold text-sm border border-green-200">
          Score: {score}
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-xl border border-stone-100 text-center relative overflow-hidden">
        {feedback === 'correct' && (
          <div className="absolute inset-0 bg-green-500/10 flex items-center justify-center z-0 animate-pulse"></div>
        )}
        
        <div className="relative z-10">
          <button 
            onClick={() => currentWord && speak(currentWord.word)}
            className="w-24 h-24 bg-yellow-50 hover:bg-yellow-100 text-stone-800 rounded-full flex items-center justify-center mx-auto mb-6 transition-colors shadow-sm border border-yellow-200"
          >
            <Volume2 size={40} />
          </button>
          
          <p className="text-stone-500 text-sm mb-6">Click icon to hear the word again</p>

          {feedback === 'none' ? (
            <form onSubmit={checkSpelling}>
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
              <button 
                type="submit"
                className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-yellow-400 rounded-xl font-bold shadow-md transition-all"
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