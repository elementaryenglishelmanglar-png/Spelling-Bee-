import React, { useState, useMemo } from 'react';
import { WordEntry, GradeLevel } from '../types';
import { RefreshCw, Flag, Hash, BookOpen, MessageSquare, Shuffle, Trash2 } from 'lucide-react';

interface PracticeModeProps {
  words: WordEntry[];
  registeredStudents?: any[];
  onSaveSession?: (session: any) => void;
}

export const PracticeMode: React.FC<PracticeModeProps> = ({ words }) => {
  // Generator configuration
  const [generatorGrade, setGeneratorGrade] = useState<GradeLevel>(1);
  const [wordRangeMin, setWordRangeMin] = useState<number | ''>('');
  const [wordRangeMax, setWordRangeMax] = useState<number | ''>('');
  const [avoidRepetition, setAvoidRepetition] = useState<boolean>(true);

  // Session state
  const [currentWord, setCurrentWord] = useState<WordEntry | null>(null);
  const [shownWordIds, setShownWordIds] = useState<Set<string>>(new Set());
  const [isRevealed, setIsRevealed] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [totalGenerated, setTotalGenerated] = useState(0);

  // Words for the selected grade
  const gradeWords = useMemo(
    () => words.filter(w => w.grade === generatorGrade),
    [words, generatorGrade]
  );

  const totalWords = gradeWords.length;

  // Words within range
  const poolInRange = useMemo(() => {
    let startIndex = 0;
    let endIndex = totalWords - 1;
    if (typeof wordRangeMin === 'number' && wordRangeMin > 0) {
      startIndex = Math.min(wordRangeMin - 1, totalWords - 1);
    }
    if (typeof wordRangeMax === 'number' && wordRangeMax > 0) {
      endIndex = Math.min(wordRangeMax - 1, totalWords - 1);
    }
    if (endIndex < startIndex) [startIndex, endIndex] = [endIndex, startIndex];
    return gradeWords.slice(startIndex, endIndex + 1);
  }, [gradeWords, wordRangeMin, wordRangeMax, totalWords]);

  // Available pool after repetition filter
  const availablePool = useMemo(() => {
    if (!avoidRepetition) return poolInRange;
    const filtered = poolInRange.filter(w => !shownWordIds.has(w.id));
    return filtered.length > 0 ? filtered : poolInRange; // reset when exhausted
  }, [poolInRange, shownWordIds, avoidRepetition]);

  // Manual clear — only called by the Clear button
  const clearSession = () => {
    setCurrentWord(null);
    setShownWordIds(new Set());
    setIsRevealed(false);
    setTotalGenerated(0);
  };

  const generateWord = () => {
    if (poolInRange.length === 0) return;

    // If pool is exhausted (all shown), reset and use full range
    let pool = availablePool;
    if (avoidRepetition && pool.length === 0) {
      setShownWordIds(new Set());
      pool = poolInRange;
    }

    // Exclude current word from immediate next pick if possible
    let candidates = currentWord ? pool.filter(w => w.id !== currentWord.id) : pool;
    if (candidates.length === 0) candidates = pool;

    const picked = candidates[Math.floor(Math.random() * candidates.length)];

    // Animate
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentWord(picked);
      setIsRevealed(false);
      setIsAnimating(false);
      setTotalGenerated(prev => prev + 1);
      if (avoidRepetition) {
        setShownWordIds(prev => new Set([...prev, picked.id]));
      }
    }, 180);
  };

  // Word number in the list (1-based index in gradeWords)
  const wordListNumber = useMemo(() => {
    if (!currentWord) return null;
    // Prefer explicit wordNumber field, otherwise use position in array
    if (currentWord.wordNumber) return currentWord.wordNumber;
    const idx = gradeWords.findIndex(w => w.id === currentWord.id);
    return idx >= 0 ? idx + 1 : null;
  }, [currentWord, gradeWords]);

  const remainingInPool = availablePool.length;
  const exhausted = avoidRepetition && shownWordIds.size >= poolInRange.length && poolInRange.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-stone-800 flex items-center gap-2">
            <Shuffle className="text-amber-500" size={24} />
            Word Generator
          </h2>
          <p className="text-stone-500 text-sm mt-0.5">Generate a random word from any list with its full details.</p>
        </div>
        <div className="flex items-center gap-3">
          {totalGenerated > 0 && (
            <>
              <div className="text-right">
                <div className="text-2xl font-black text-stone-800">{totalGenerated}</div>
                <div className="text-xs text-stone-400 font-medium uppercase tracking-wide">Generated</div>
              </div>
              <button
                onClick={clearSession}
                title="Clear all generated words and reset session"
                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-500 hover:text-red-600 font-bold text-xs rounded-xl border border-red-200 transition-colors"
              >
                <Trash2 size={13} />
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* List Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Flag size={12} />
              Word List
            </label>
            <select
              value={generatorGrade}
              onChange={(e) => setGeneratorGrade(Number(e.target.value) as GradeLevel)}
              className="w-full p-3 border border-stone-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-amber-300 outline-none bg-stone-50 text-stone-800"
            >
              {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                <option key={g} value={g}>
                  {g === 12 ? 'Group 3' : `Grade ${g}`} ({words.filter(w => w.grade === g).length} words)
                </option>
              ))}
            </select>
          </div>

          {/* Range Selector */}
          <div>
            <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              Word Range <span className="text-stone-400 font-normal">(1–{totalWords})</span>
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-500 font-medium flex-shrink-0">From</span>
              <input
                type="number"
                min={1}
                max={totalWords || 1}
                value={wordRangeMin === '' ? '' : wordRangeMin}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') { setWordRangeMin(''); return; }
                  const n = Number(raw);
                  if (!isNaN(n) && n > 0) setWordRangeMin(n);
                }}
                placeholder="1"
                className="w-20 p-2.5 border border-stone-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-amber-300 outline-none"
              />
              <span className="text-xs text-stone-400">to</span>
              <input
                type="number"
                min={1}
                max={totalWords || 1}
                value={wordRangeMax === '' ? '' : wordRangeMax}
                onChange={(e) => {
                  const raw = e.target.value;
                  if (raw === '') { setWordRangeMax(''); return; }
                  const n = Number(raw);
                  if (!isNaN(n) && n > 0) setWordRangeMax(n);
                }}
                placeholder={String(totalWords || '—')}
                className="w-20 p-2.5 border border-stone-200 rounded-lg text-sm text-center focus:ring-2 focus:ring-amber-300 outline-none"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1.5">
              {poolInRange.length} word{poolInRange.length !== 1 ? 's' : ''} in selected range
            </p>
          </div>
        </div>

        {/* Avoid repetition toggle */}
        <div className="mt-4 pt-4 border-t border-stone-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-stone-700">Avoid repeating words</p>
            <p className="text-xs text-stone-400">
              {avoidRepetition
                ? exhausted
                  ? '⚠️ All words shown — list will reset on next generate'
                  : `${remainingInPool} word${remainingInPool !== 1 ? 's' : ''} remaining`
                : 'Words may repeat'}
            </p>
          </div>
          <button
            onClick={() => setAvoidRepetition(!avoidRepetition)}
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-amber-300 ${
              avoidRepetition ? 'bg-amber-400' : 'bg-stone-200'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                avoidRepetition ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>


      </div>

      {/* Generate Button */}
      <button
        onClick={generateWord}
        disabled={poolInRange.length === 0}
        className="w-full py-5 bg-stone-900 text-amber-400 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-stone-800 active:scale-[0.98] transition-all shadow-xl shadow-stone-900/20 disabled:opacity-40 disabled:cursor-not-allowed border-2 border-stone-800 hover:border-stone-700"
      >
        <RefreshCw size={22} className={isAnimating ? 'animate-spin' : ''} />
        {currentWord ? 'Next Random Word' : 'Generate Random Word'}
      </button>

      {/* Word Display Card */}
      <div
        className={`transition-all duration-200 ${isAnimating ? 'opacity-0 translate-y-2 scale-[0.98]' : 'opacity-100 translate-y-0 scale-100'}`}
      >
        {currentWord ? (
          <div className="bg-white border-2 border-stone-100 rounded-2xl overflow-hidden shadow-lg">

            {/* Word Number Badge */}
            <div className="bg-gradient-to-r from-stone-900 to-stone-800 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {wordListNumber !== null && (
                  <div className="flex items-center gap-1.5 bg-amber-400/20 border border-amber-400/40 text-amber-300 rounded-lg px-3 py-1.5">
                    <Hash size={13} />
                    <span className="text-sm font-black">{wordListNumber}</span>
                  </div>
                )}
                <span className="text-stone-400 text-xs font-semibold uppercase tracking-widest">
                  {currentWord.grade === 12 ? 'Group 3' : `Grade ${currentWord.grade}`}
                  {currentWord.partOfSpeech && (
                    <span className="ml-2 text-stone-500">· {currentWord.partOfSpeech}</span>
                  )}
                </span>
              </div>
              {currentWord.theme && (
                <span className="text-xs bg-stone-700 text-stone-300 px-2 py-1 rounded-md font-medium">
                  {currentWord.theme}
                </span>
              )}
            </div>

            {/* The Word */}
            <div className="px-8 py-10 text-center border-b border-stone-100">
              <p className="text-6xl font-black text-stone-900 tracking-tight leading-none select-none">
                {currentWord.word}
              </p>
            </div>

            {/* Definition & Example — always visible */}
            <div className="px-6 py-5 space-y-4">

              {/* Definition */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center mt-0.5">
                  <BookOpen size={15} className="text-blue-500" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-1">Definition</p>
                  <p className="text-stone-700 text-sm leading-relaxed font-medium">
                    {currentWord.definition || <span className="text-stone-300 italic">No definition available</span>}
                  </p>
                </div>
              </div>

              {/* Example */}
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center mt-0.5">
                  <MessageSquare size={15} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-stone-400 uppercase tracking-widest mb-1">Example</p>
                  <p className="text-stone-600 text-sm leading-relaxed italic">
                    "{currentWord.example || <span className="text-stone-300 not-italic">No example available</span>}"
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation row */}
            <div className="px-6 pb-5 flex items-center justify-between gap-3">
              <div className="text-xs text-stone-400 font-medium">
                Word <span className="font-bold text-stone-600">{totalGenerated}</span> of this session
              </div>
              <button
                onClick={generateWord}
                className="flex items-center gap-2 px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs rounded-xl transition-colors"
              >
                <RefreshCw size={13} />
                New Word
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white border-2 border-dashed border-stone-200 rounded-2xl p-16 text-center">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shuffle size={32} className="text-stone-300" />
            </div>
            <p className="text-stone-400 font-semibold text-lg">No word generated yet</p>
            <p className="text-stone-300 text-sm mt-1">
              Click the button above to generate a random word from{' '}
              {generatorGrade === 12 ? 'Group 3' : `Grade ${generatorGrade}`}.
            </p>
          </div>
        )}
      </div>

    </div>
  );
};