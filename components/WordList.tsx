import React, { useState, useRef, useMemo } from 'react';
import { WordEntry, GradeLevel } from '../types';
import { Trash2, Volume2, Edit2, Check, X, Image as ImageIcon, Search, Filter, Download } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate(editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm(word);
    setIsEditing(false);
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

  const speakWord = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
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

                 <div className="flex-1">
                    <label className="text-xs font-bold text-stone-500 uppercase">Word</label>
                    <input 
                        value={editForm.word}
                        onChange={e => setEditForm({...editForm, word: e.target.value})}
                        className="w-full p-2 border border-stone-300 rounded-lg font-bold text-stone-800 focus:ring-2 focus:ring-yellow-200 outline-none"
                    />
                 </div>
             </div>
             
             <div>
               <label className="text-xs font-bold text-stone-500 uppercase">Definition</label>
               <textarea 
                 value={editForm.definition}
                 onChange={e => setEditForm({...editForm, definition: e.target.value})}
                 className="w-full p-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-200 outline-none"
                 rows={2}
               />
             </div>
             <div>
               <label className="text-xs font-bold text-stone-500 uppercase">Example</label>
               <textarea 
                 value={editForm.example}
                 onChange={e => setEditForm({...editForm, example: e.target.value})}
                 className="w-full p-2 border border-stone-300 rounded-lg text-sm italic focus:ring-2 focus:ring-yellow-200 outline-none"
                 rows={2}
               />
             </div>
          </div>
          <div className="w-full md:w-48 space-y-3 flex flex-col">
             <div>
               <label className="text-xs font-bold text-stone-500 uppercase">Difficulty</label>
               <select
                  value={editForm.difficulty}
                  onChange={e => setEditForm({...editForm, difficulty: e.target.value as any})}
                  className="w-full p-2 border border-stone-300 rounded-lg text-sm"
               >
                 <option value="Easy">Easy</option>
                 <option value="Medium">Medium</option>
                 <option value="Hard">Hard</option>
               </select>
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
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-xl border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center group">
      <div className="flex items-start gap-4 flex-1">
        <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 text-yellow-800 rounded-full flex items-center justify-center font-bold text-sm mt-1 border border-yellow-200">
          {index + 1}
        </div>
        
        {word.image && (
            <div className="flex-shrink-0 w-16 h-16 rounded-lg bg-stone-100 border border-stone-200 overflow-hidden">
                <img src={word.image} alt={word.word} className="w-full h-full object-cover" />
            </div>
        )}

        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-stone-800">{word.word}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
              word.difficulty === 'Hard' ? 'bg-red-100 text-red-700' :
              word.difficulty === 'Medium' ? 'bg-orange-100 text-orange-700' :
              'bg-green-100 text-green-700'
            }`}>
              {word.difficulty || 'Medium'}
            </span>
            <button 
              onClick={() => speakWord(word.word)}
              className="p-1.5 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-full transition-colors"
              title="Pronounce"
            >
              <Volume2 size={16} />
            </button>
          </div>
          <p className="text-sm text-stone-600 mt-1"><span className="font-semibold text-stone-400">Def:</span> {word.definition}</p>
          <p className="text-sm text-stone-500 italic mt-0.5"><span className="font-semibold not-italic text-stone-400">Ex:</span> "{word.example}"</p>
        </div>
      </div>
      
      <div className="flex gap-2 self-end sm:self-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => setIsEditing(true)}
          className="text-stone-400 hover:text-yellow-600 p-2 hover:bg-yellow-50 rounded-lg transition-colors"
          title="Edit Word"
        >
          <Edit2 size={18} />
        </button>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="text-stone-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
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
  const [difficultyFilter, setDifficultyFilter] = useState<'all' | 'Easy' | 'Medium' | 'Hard'>('all');
  const [showFilters, setShowFilters] = useState(false);

  const filteredWords = useMemo(() => {
    let result = words.filter(w => w.grade === currentGrade);

    // Filter by difficulty
    if (difficultyFilter !== 'all') {
      result = result.filter(w => w.difficulty === difficultyFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(w => 
        w.word.toLowerCase().includes(query) ||
        w.definition.toLowerCase().includes(query) ||
        w.example.toLowerCase().includes(query)
      );
    }

    return result;
  }, [words, currentGrade, difficultyFilter, searchQuery]);

  const exportToCSV = () => {
    const csvContent = [
      ['Word', 'Definition', 'Example', 'Difficulty', 'Grade'],
      ...filteredWords.map(w => [
        w.word,
        w.definition,
        w.example,
        w.difficulty || 'Medium',
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
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showFilters 
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
              <span className="text-xs font-bold text-stone-500 uppercase self-center">Difficulty:</span>
              {(['all', 'Easy', 'Medium', 'Hard'] as const).map(diff => (
                <button
                  key={diff}
                  onClick={() => setDifficultyFilter(diff)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    difficultyFilter === diff
                      ? diff === 'all' 
                        ? 'bg-stone-800 text-white' 
                        : diff === 'Hard'
                        ? 'bg-red-600 text-white'
                        : diff === 'Medium'
                        ? 'bg-orange-600 text-white'
                        : 'bg-green-600 text-white'
                      : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                  }`}
                >
                  {diff === 'all' ? 'All' : diff}
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
      {filteredWords.length === 0 ? (
        <div className="text-center py-8 text-stone-400">
          <p>No words match your search criteria.</p>
        </div>
      ) : (
        <div className="space-y-4">
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
  );
};
