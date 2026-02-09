import React, { useState, useRef } from 'react';
import { GradeLevel, WordEntry } from '../types';
import { enrichWordWithGemini } from '../services/geminiService';
import { Sparkles, Plus, Loader2, Image as ImageIcon, X } from 'lucide-react';
import { useToast } from '../lib/toastContext';

interface WordFormProps {
  currentGrade: GradeLevel;
  onAddWord: (word: WordEntry) => void;
}

export const WordForm: React.FC<WordFormProps> = ({ currentGrade, onAddWord }) => {
  const { showToast } = useToast();
  const [inputWord, setInputWord] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        const errorMsg = "Image too large. Please keep under 2MB.";
        setError(errorMsg);
        showToast(errorMsg, 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleManualAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputWord.trim()) return;
    
    // Quick add without AI
    const newWord: WordEntry = {
      id: crypto.randomUUID(),
      word: inputWord.trim(),
      definition: 'No definition provided.',
      example: 'No example provided.',
      grade: currentGrade,
      difficulty: 'Medium',
      image: image || undefined
    };
    onAddWord(newWord);
    resetForm();
  };

  const handleAIAdd = async () => {
    if (!inputWord.trim()) {
      const errorMsg = "Please enter a word first.";
      setError(errorMsg);
      showToast(errorMsg, 'warning');
      return;
    }
    setIsLoading(true);
    setError(null);

    try {
      const enrichment = await enrichWordWithGemini(inputWord.trim(), currentGrade);
      const newWord: WordEntry = {
        id: crypto.randomUUID(),
        word: inputWord.trim(),
        grade: currentGrade,
        image: image || undefined,
        ...enrichment
      };
      onAddWord(newWord);
      resetForm();
      showToast(`Word "${inputWord.trim()}" enriched with AI successfully!`, 'success');
    } catch (err) {
      const errorMsg = "Failed to fetch AI data. Check API key or internet.";
      setError(errorMsg);
      showToast(errorMsg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setInputWord('');
    setImage(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="bg-gradient-to-br from-yellow-50 to-white p-6 rounded-2xl border border-yellow-200 shadow-sm mb-8">
      <h3 className="text-md font-bold text-stone-800 mb-4 flex items-center gap-2">
        Add New Word to Grade {currentGrade}
      </h3>
      
      <div className="flex flex-col md:flex-row gap-4 items-start">
        {/* Image Upload Box */}
        <div className="flex-shrink-0">
             <div 
                className="w-20 h-20 rounded-xl bg-white border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-400 transition-colors relative"
                onClick={() => fileInputRef.current?.click()}
             >
                {image ? (
                    <>
                        <img src={image} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                            onClick={(e) => { e.stopPropagation(); removeImage(); }}
                            className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                        >
                            <X className="text-white" size={20} />
                        </button>
                    </>
                ) : (
                    <div className="text-center p-1">
                        <ImageIcon className="text-stone-400 mx-auto" size={20} />
                        <span className="text-[10px] text-stone-400 font-bold block mt-1">Add Pic</span>
                    </div>
                )}
             </div>
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
             />
        </div>

        <div className="flex-1 w-full space-y-3">
            <input
                type="text"
                value={inputWord}
                onChange={(e) => setInputWord(e.target.value)}
                placeholder="Type a word (e.g., 'Concierge')"
                className="w-full px-4 py-3 rounded-xl border border-stone-300 focus:border-yellow-500 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
                onKeyDown={(e) => {
                if (e.key === 'Enter') handleAIAdd();
                }}
            />
            
            <div className="flex gap-2">
                <button
                onClick={handleAIAdd}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 bg-stone-800 hover:bg-stone-900 disabled:bg-stone-500 text-yellow-400 px-6 py-3 rounded-xl font-bold transition-all shadow-md"
                >
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
                <span>AI Auto-Fill</span>
                </button>
                <button
                onClick={handleManualAdd}
                disabled={isLoading}
                className="flex items-center justify-center gap-2 bg-white hover:bg-stone-50 text-stone-700 border border-stone-300 px-6 py-3 rounded-xl font-medium transition-all"
                >
                <Plus size={18} />
                <span className="hidden sm:inline">Manual Add</span>
                </button>
            </div>
        </div>
      </div>

      {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
      <p className="text-xs text-stone-500 mt-3">
        * "AI Auto-Fill" fetches definition & example. Upload an optional picture to act as a flashcard for students.
      </p>
    </div>
  );
};