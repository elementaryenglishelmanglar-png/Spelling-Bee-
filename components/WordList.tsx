import React, { useState, useRef, useMemo } from 'react';
import { WordEntry, GradeLevel } from '../types';
import { Trash2, Volume2, Edit2, Check, X, Image as ImageIcon, Search, Filter, Download, Upload, Mic, Sparkles, Loader2 } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { supabase } from '../lib/supabase';
import { enrichWordWithGemini } from '../services/geminiService';
import { generateAndUploadAudio } from '../services/audioService';

interface WordListProps {
  words: WordEntry[];
  currentGrade: GradeLevel;
  onDelete: (id: string) => void;
  onUpdate: (word: WordEntry) => void;
}

interface WordListItemProps {
  word: WordEntry;
  index: number;
  onDelete: (id: string) => void;
  onUpdate: (word: WordEntry) => void;
}

const WordListItem: React.FC<WordListItemProps> = ({
  word,
  index,
  onDelete,
  onUpdate
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(word);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [isAIFilling, setIsAIFilling] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate(editForm);
    setIsEditing(false);
    setAiError(null);
  };

  const handleCancel = () => {
    setEditForm(word);
    setIsEditing(false);
    setAiError(null);
  };

  const handleAIFill = async () => {
    setIsAIFilling(true);
    setAiError(null);
    try {
      const enrichment = await enrichWordWithGemini(editForm.word, editForm.grade);
      setEditForm(prev => ({ ...prev, ...enrichment }));
    } catch (err: any) {
      setAiError(err?.message ?? 'AI fill failed');
    } finally {
      setIsAIFilling(false);
    }
  };

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    setAiError(null);
    try {
      const publicUrl = await generateAndUploadAudio(editForm.word);
      setEditForm(prev => ({ ...prev, audioUrl: publicUrl }));
    } catch (err: any) {
      setAiError(err?.message ?? 'Audio generation failed');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Image too large. Max 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditForm({ ...editForm, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      alert("Audio file too large. Max 5MB.");
      return;
    }

    try {
      setIsUploadingAudio(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('word-audio')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('word-audio')
        .getPublicUrl(fileName);

      setEditForm({ ...editForm, audioUrl: publicUrl });
    } catch (error: any) {
      console.error('Error uploading audio:', error);
      alert(`Failed to upload audio: ${error.message || error.error_description || 'Unknown error'}`);
    } finally {
      setIsUploadingAudio(false);
    }
  };

  const speakWord = (text: string, audioUrl?: string) => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(e => {
        console.warn("Audio playback failed", e);
      });
    } else {
      alert("No audio uploaded for this word.");
    }
  };

  if (isEditing) {
    return (
      <div className="bg-white p-4 rounded-xl border-2 border-yellow-400 shadow-md flex flex-col gap-4 animate-fade-in">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex gap-4">
              {/* Image Edit */}
              <div
                className="w-20 h-20 flex-shrink-0 rounded-lg bg-stone-50 border border-stone-200 overflow-hidden relative group cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                title="Change Image"
              >
                {editForm.image ? (
                  <img src={editForm.image} className="w-full h-full object-cover" alt="Word" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <ImageIcon size={24} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-bold">Change</span>
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleImageUpload}
              />

              <div className="flex-1 space-y-2">
                <div>
                  <label className="text-xs font-bold text-stone-500 uppercase">Word</label>
                  <input
                    value={editForm.word}
                    onChange={e => setEditForm({ ...editForm, word: e.target.value })}
                    className="w-full p-2 border border-stone-300 rounded-lg font-bold text-stone-800 focus:ring-2 focus:ring-yellow-200 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Audio Upload */}
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase flex items-center gap-2 mb-1">
                <Mic size={12} /> Audio Pronunciation
              </label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => audioInputRef.current?.click()}
                  disabled={isUploadingAudio}
                  className="px-3 py-2 bg-stone-100 border border-stone-300 rounded-lg text-xs font-bold text-stone-600 hover:bg-stone-200 flex items-center gap-2"
                >
                  <Upload size={14} /> {editForm.audioUrl ? 'Replace Audio' : 'Upload Audio'}
                </button>
                {isUploadingAudio && <span className="text-xs text-stone-400 animate-pulse">Uploading...</span>}
                <button
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio || isUploadingAudio || !editForm.word.trim()}
                  className="flex items-center gap-1.5 px-3 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold transition-colors"
                  title="Generate AI pronunciation audio (ElevenLabs)"
                >
                  {isGeneratingAudio
                    ? <><Loader2 size={13} className="animate-spin" /> Generating…</>
                    : <><Sparkles size={13} /> AI Audio</>}
                </button>
                {editForm.audioUrl && !isUploadingAudio && (
                  <div className="flex items-center gap-2 bg-green-50 px-2 py-1 rounded border border-green-200 text-green-700 text-xs">
                    <span className="font-bold">Audio Set</span>
                    <button onClick={() => speakWord(editForm.word, editForm.audioUrl)} className="hover:underline">Play</button>
                  </div>
                )}
              </div>
              <input
                type="file"
                ref={audioInputRef}
                className="hidden"
                accept="audio/*"
                onChange={handleAudioUpload}
              />
            </div>

            {/* AI Fill Button */}
            <button
              onClick={handleAIFill}
              disabled={isAIFilling || !editForm.word.trim()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-colors w-full justify-center"
            >
              {isAIFilling
                ? <><Loader2 size={13} className="animate-spin" /> Generating with AI…</>
                : <><Sparkles size={13} /> AI Auto-Fill Definition & Example</>}
            </button>

            {aiError && (
              <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">{aiError}</p>
            )}

            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Definition</label>
              <textarea
                value={editForm.definition}
                onChange={e => setEditForm({ ...editForm, definition: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-200 outline-none"
                rows={2}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-stone-500 uppercase">Example</label>
              <textarea
                value={editForm.example}
                onChange={e => setEditForm({ ...editForm, example: e.target.value })}
                className="w-full p-2 border border-stone-300 rounded-lg text-sm italic focus:ring-2 focus:ring-yellow-200 outline-none"
                rows={2}
              />
            </div>
          </div>
          <div className="w-full md:w-48 space-y-3 flex flex-col">
            <label className="text-xs font-bold text-stone-500 uppercase">Part of Speech</label>
            <select
              value={editForm.partOfSpeech || 'noun'}
              onChange={e => setEditForm({ ...editForm, partOfSpeech: e.target.value as any })}
              className="w-full p-2 border border-stone-300 rounded-lg text-sm"
            >
              <option value="noun">Noun</option>
              <option value="verb">Verb</option>
              <option value="adjective">Adjective</option>
              <option value="adverb">Adverb</option>
              <option value="preposition">Preposition</option>
              <option value="conjunction">Conjunction</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-stone-500 uppercase">Theme</label>
            <input
              value={editForm.theme || ''}
              onChange={e => setEditForm({ ...editForm, theme: e.target.value })}
              className="w-full p-2 border border-stone-300 rounded-lg text-sm"
              placeholder="e.g. Science"
            />
          </div>
          <div className="flex gap-2 mt-auto">
            <button onClick={handleSave} className="flex-1 bg-green-600 text-white p-2 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700">
              <Check size={16} /> Save
            </button>
            <button onClick={handleCancel} className="flex-1 bg-stone-200 text-stone-700 p-2 rounded-lg flex items-center justify-center gap-2 hover:bg-stone-300">
              <X size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center py-4 px-2 hover:bg-stone-100/50 transition-colors border-b border-stone-100 last:border-0">
      <div className="flex items-start gap-4 flex-1">
        <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm mt-1 border shadow-sm
          ${word.wordNumber ? 'bg-amber-400 text-stone-900 border-amber-300' : 'bg-stone-100 text-stone-500 border-stone-200'}`}
          title={word.wordNumber ? `Official word #${word.wordNumber}` : 'Order by addition'}
        >
          {word.wordNumber ?? index + 1}
        </div>

        {word.image && (
          <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden">
            <img src={word.image} alt={word.word} className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-stone-900 font-serif">{word.word}</h3>
            <span className={`text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-widest
              ${word.partOfSpeech === 'verb' ? 'bg-rose-100 text-rose-700' :
                word.partOfSpeech === 'adjective' ? 'bg-sky-100 text-sky-700' :
                  word.partOfSpeech === 'adverb' ? 'bg-purple-100 text-purple-700' :
                    'bg-emerald-100 text-emerald-700'
              }`}>
              {word.partOfSpeech || 'noun'}
            </span>
            {word.theme && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium border border-stone-200">
                {word.theme}
              </span>
            )}
            <button
              onClick={() => speakWord(word.word, word.audioUrl)}
              className={`p-1.5 rounded-full transition-colors ${word.audioUrl ? 'text-amber-500 hover:bg-amber-50' : 'text-stone-400 hover:text-stone-800 hover:bg-stone-200'}`}
              title={word.audioUrl ? "Play Recorded Audio" : "Pronounce (Robot)"}
            >
              <Volume2 size={16} />
            </button>
          </div>
          <p className="text-sm text-stone-600 mt-1"><span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">Def:</span> {word.definition}</p>
          <p className="text-sm text-stone-500 italic mt-0.5"><span className="text-[10px] uppercase font-bold text-stone-400 not-italic tracking-wider">Ex:</span> "{word.example}"</p>
        </div>
      </div>

      <div className="flex gap-2 self-end sm:self-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="text-stone-400 hover:text-amber-600 p-2 hover:bg-amber-50 rounded-lg transition-colors"
          title="Edit Word"
        >
          <Edit2 size={18} />
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-stone-400 hover:text-rose-500 p-2 hover:bg-rose-50 rounded-lg transition-colors"
          title="Delete Word"
        >
          <Trash2 size={18} />
        </button>
      </div>
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Word"
        message={`Are you sure you want to delete "${word.word}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={() => {
          onDelete(word.id);
          setShowDeleteConfirm(false);
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        type="danger"
      />
    </div>
  );
};

export const WordList: React.FC<WordListProps> = ({ words, currentGrade, onDelete, onUpdate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [partOfSpeechFilter, setPartOfSpeechFilter] = useState<'all' | 'noun' | 'verb' | 'adjective' | 'adverb' | 'preposition' | 'conjunction'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredWords = useMemo(() => {
    let result = words.filter(w => w.grade === currentGrade);

    // Filter by Part of Speech
    if (partOfSpeechFilter !== 'all') {
      result = result.filter(w => w.partOfSpeech === partOfSpeechFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w =>
        w.word.toLowerCase().includes(query) ||
        w.definition.toLowerCase().includes(query) ||
        w.example.toLowerCase().includes(query) ||
        (w.theme && w.theme.toLowerCase().includes(query))
      );
    }

    return result;
  }, [words, currentGrade, partOfSpeechFilter, searchQuery]);

  const exportToCSV = () => {
    const csvContent = [
      ['Word', 'Definition', 'Example', 'Part of Speech', 'Theme', 'Grade'],
      ...filteredWords.map(w => [
        w.word,
        w.definition,
        w.example,
        w.partOfSpeech || 'noun',
        w.theme || '',
        w.grade.toString()
      ])
    ].map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `spelling-bee-grade-${currentGrade}-words.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (words.filter(w => w.grade === currentGrade).length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-stone-300 rounded-xl bg-orange-50/50">
        <p className="text-stone-500 text-lg font-medium">No words added for Grade {currentGrade} yet.</p>
        <p className="text-stone-400 text-sm mt-1">Add words manually or use the AI tools above.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
          <div className="flex-1 w-full md:w-auto">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search words, definitions, examples..."
                className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-yellow-200 outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters
                ? 'bg-yellow-100 border-yellow-300 text-stone-800'
                : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
                }`}
            >
              <Filter size={16} />
              <span className="text-sm font-medium">Filters</span>
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-stone-800 text-white rounded-lg hover:bg-stone-900 transition-colors"
              title="Export to CSV"
            >
              <Download size={16} />
              <span className="text-sm font-medium">Export CSV</span>
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="mt-3 pt-3 border-t border-stone-200">
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-bold text-stone-500 uppercase self-center">Part of Speech:</span>
              {(['all', 'noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction'] as const).map(pos => (
                <button
                  key={pos}
                  onClick={() => setPartOfSpeechFilter(pos)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold capitalize transition-colors ${partOfSpeechFilter === pos
                    ? 'bg-stone-800 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      {filteredWords.length !== words.filter(w => w.grade === currentGrade).length && (
        <div className="text-sm text-stone-500">
          Showing {filteredWords.length} of {words.filter(w => w.grade === currentGrade).length} words
        </div>
      )}

      {/* Word List */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
        {filteredWords.length === 0 ? (
          <div className="text-center py-12 text-stone-400 bg-stone-50">
            <p>No words match your search criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-stone-100">
            {filteredWords.map((word, index) => (
              <WordListItem
                key={word.id}
                word={word}
                index={index}
                onDelete={onDelete}
                onUpdate={onUpdate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
