import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { WordEntry, GradeLevel } from '../types';
import { BookOpen, Trophy, Users } from 'lucide-react';

interface DashboardProps {
  words: WordEntry[];
  onChangeView: (view: 'manage' | 'session') => void;
  beeImageUrl?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ words, onChangeView, beeImageUrl }) => {
  const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  const data = grades.map((grade) => ({
    name: `G${grade}`, // Shortened for better fit on x-axis
    fullName: `Grade ${grade}`,
    count: words.filter((w) => w.grade === grade).length,
  }));

  const totalWords = words.length;
  const hardWords = words.filter(w => w.difficulty === 'Hard').length;

  return (
    <div className="space-y-8 animate-fade-in">
      <header className="mb-8 relative bg-white p-8 rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-lg">
             <h2 className="text-4xl font-black text-stone-800 mb-2">Contest Overview</h2>
             <p className="text-stone-500 text-lg">Welcome back, Teacher! Your spelling bee headquarters is ready.</p>
        </div>
        
        {beeImageUrl && (
            <div className="hidden md:block absolute right-[-20px] top-[-30px] w-48 h-48 opacity-20 md:opacity-100 md:relative md:w-40 md:h-40 md:top-auto md:right-auto animate-bounce-slow" style={{ animationDuration: '4s' }}>
                <img src={beeImageUrl} alt="Bee Mascot" className="w-full h-full object-contain drop-shadow-lg transform -rotate-12" />
            </div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
          <div className="p-4 bg-yellow-100 text-yellow-700 rounded-xl">
            <BookOpen size={32} />
          </div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Total Words</p>
            <p className="text-3xl font-bold text-stone-900">{totalWords}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
          <div className="p-4 bg-orange-100 text-orange-600 rounded-xl">
            <Trophy size={32} />
          </div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Contest Ready</p>
            <p className="text-3xl font-bold text-stone-900">{totalWords > 20 ? 'Yes' : 'Not Yet'}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
          <div className="p-4 bg-stone-100 text-stone-600 rounded-xl">
            <Users size={32} />
          </div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Hard Difficulty</p>
            <p className="text-3xl font-bold text-stone-900">{hardWords}</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
        <h3 className="text-lg font-bold text-stone-800 mb-6">Word Distribution by Grade</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#78716c', fontSize: 12}} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#78716c', fontSize: 12}} />
              <Tooltip 
                cursor={{fill: 'transparent'}}
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelFormatter={(value, payload) => {
                  if (payload && payload.length > 0) {
                    return payload[0].payload.fullName;
                  }
                  return value;
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {data.map((entry, index) => (
                  // Alternating Yellow-500 and Amber-500
                  <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#EAB308' : '#F59E0B'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button 
          onClick={() => onChangeView('manage')}
          className="p-6 bg-stone-800 rounded-xl text-yellow-400 font-bold text-lg hover:shadow-lg transition-all hover:scale-[1.01] flex flex-col items-center justify-center border border-stone-900"
        >
          <span>Manage Word Lists</span>
          <span className="text-sm font-normal text-stone-400 mt-1">Add or edit definitions</span>
        </button>
        <button 
          onClick={() => onChangeView('session')}
          className="p-6 bg-yellow-400 border border-yellow-500 rounded-xl text-stone-900 font-bold text-lg hover:bg-yellow-300 hover:shadow-lg transition-all hover:scale-[1.01] flex flex-col items-center justify-center"
        >
          <span>Start Practice Mode</span>
          <span className="text-sm font-normal text-stone-700 mt-1">Run a session</span>
        </button>
      </div>
    </div>
  );
};