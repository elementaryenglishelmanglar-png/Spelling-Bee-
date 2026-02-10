import React, { useState, useMemo } from 'react';
import { WordEntry, GradeLevel } from '../types';
import { Volume2, Eye, EyeOff, RefreshCw, ArrowRight } from 'lucide-react';

interface StudentGeneratorProps {
  words: WordEntry[];
  beeImageUrl?: string;
}

export const StudentGenerator: React.FC<StudentGeneratorProps> = ({ words, beeImageUrl }) => {
  const [selectedGrade, setSelectedGrade] = useState<GradeLevel>(1);
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

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

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in relative">
      <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-sm text-center relative z-10">
        <h2 className="text-2xl font-bold text-stone-800 mb-2">Random Word Generator</h2>
        <p className="text-stone-500 mb-6">Select your grade and practice at your own pace.</p>

        <div className="flex justify-center flex-wrap gap-2 mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((g) => (
            <button
              key={g}
              onClick={() => { setSelectedGrade(g as GradeLevel); setCurrentWord(null); }}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-all ${selectedGrade === g
                ? 'bg-stone-800 text-yellow-400 shadow-lg scale-110'
                : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
            >
              {g}
            </button>
          ))}
        </div>

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
    </div>
  );
};