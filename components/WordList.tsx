import React, { useState, useRef } from 'react';
import { WordEntry, GradeLevel } from '../types';
import { Trash2, Volume2, Edit2, Check, X, Image as ImageIcon } from 'lucide-react';

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
          onClick={() => onDelete(word.id)}
          className="text-stone-400 hover:text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"
          title="Delete Word"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export const WordList: React.FC<WordListProps> = ({ words, currentGrade, onDelete, onUpdate }) => {
  const filteredWords = words.filter(w => w.grade === currentGrade);

  if (filteredWords.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-stone-300 rounded-xl bg-orange-50/50">
        <p className="text-stone-500 text-lg font-medium">No words added for Grade {currentGrade} yet.</p>
        <p className="text-stone-400 text-sm mt-1">Add words manually or use the AI tools above.</p>
      </div>
    );
  }

  return (
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
  );
};