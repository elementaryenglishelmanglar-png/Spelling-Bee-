import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { WordEntry, GradeLevel, Session } from '../types';
import { BookOpen, Trophy, Users, TrendingUp } from 'lucide-react';

interface DashboardProps {
  words: WordEntry[];
  sessions: Session[];
  onChangeView: (view: 'manage' | 'session') => void;
  beeImageUrl?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ words, sessions, onChangeView, beeImageUrl }) => {
  const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  const gradeData = useMemo(() => grades.map((grade) => ({
    name: `G${grade}`,
    fullName: `Grade ${grade}`,
    count: words.filter((w) => w.grade === grade).length,
  })), [words]);

  const difficultyData = useMemo(() => {
    const easy = words.filter(w => w.difficulty === 'Easy').length;
    const medium = words.filter(w => w.difficulty === 'Medium' || !w.difficulty).length;
    const hard = words.filter(w => w.difficulty === 'Hard').length;
    return [
      { name: 'Easy', value: easy, color: '#22c55e' },
      { name: 'Medium', value: medium, color: '#f59e0b' },
      { name: 'Hard', value: hard, color: '#ef4444' },
    ];
  }, [words]);

  const difficultyByGrade = useMemo(() => {
    return grades.map(grade => {
      const gradeWords = words.filter(w => w.grade === grade);
      return {
        name: `G${grade}`,
        fullName: `Grade ${grade}`,
        Easy: gradeWords.filter(w => w.difficulty === 'Easy').length,
        Medium: gradeWords.filter(w => w.difficulty === 'Medium' || !w.difficulty).length,
        Hard: gradeWords.filter(w => w.difficulty === 'Hard').length,
      };
    });
  }, [words]);

  const totalWords = words.length;
  const hardWords = words.filter(w => w.difficulty === 'Hard').length;
  const easyWords = words.filter(w => w.difficulty === 'Easy').length;
  const mediumWords = words.filter(w => w.difficulty === 'Medium' || !w.difficulty).length;

  // Most failed words ranking
  const mostFailedWords = useMemo(() => {
    const wordFailures: Record<string, { word: string; failures: number; attempts: number }> = {};
    
    sessions.forEach(session => {
      session.attempts.forEach(attempt => {
        if (attempt.result === 'incorrect' && attempt.wordText !== 'SKIPPED') {
          const key = attempt.wordText.toLowerCase();
          if (!wordFailures[key]) {
            wordFailures[key] = { word: attempt.wordText, failures: 0, attempts: 0 };
          }
          wordFailures[key].failures++;
        }
        if (attempt.wordText !== 'SKIPPED') {
          const key = attempt.wordText.toLowerCase();
          if (!wordFailures[key]) {
            wordFailures[key] = { word: attempt.wordText, failures: 0, attempts: 0 };
          }
          wordFailures[key].attempts++;
        }
      });
    });

    return Object.values(wordFailures)
      .filter(w => w.failures > 0)
      .sort((a, b) => b.failures - a.failures)
      .slice(0, 10)
      .map((w, idx) => ({
        ...w,
        rank: idx + 1,
        failureRate: ((w.failures / w.attempts) * 100).toFixed(1),
      }));
  }, [sessions]);

  // Student performance
  const studentPerformance = useMemo(() => {
    const perf: Record<string, { name: string; correct: number; incorrect: number; total: number }> = {};
    
    sessions.forEach(session => {
      session.attempts.forEach(attempt => {
        if (attempt.result !== 'skipped') {
          if (!perf[attempt.studentId]) {
            perf[attempt.studentId] = { name: attempt.studentName, correct: 0, incorrect: 0, total: 0 };
          }
          perf[attempt.studentId].total++;
          if (attempt.result === 'correct') {
            perf[attempt.studentId].correct++;
          } else {
            perf[attempt.studentId].incorrect++;
          }
        }
      });
    });

    return Object.values(perf)
      .filter(s => s.total > 0)
      .sort((a, b) => {
        const rateA = a.correct / a.total;
        const rateB = b.correct / b.total;
        return rateB - rateA;
      })
      .slice(0, 10)
      .map(s => ({
        ...s,
        successRate: ((s.correct / s.total) * 100).toFixed(1),
      }));
  }, [sessions]);

  // Time trend data - sessions over time
  const timeTrendData = useMemo(() => {
    if (sessions.length === 0) return [];
    
    // Group sessions by date (day)
    const sessionsByDate: Record<string, { date: string; sessions: number; accuracy: number; totalAttempts: number }> = {};
    
    sessions.forEach(session => {
      const dateKey = new Date(session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!sessionsByDate[dateKey]) {
        sessionsByDate[dateKey] = { date: dateKey, sessions: 0, accuracy: 0, totalAttempts: 0 };
      }
      sessionsByDate[dateKey].sessions++;
      const correct = session.attempts.filter(a => a.result === 'correct').length;
      sessionsByDate[dateKey].totalAttempts += session.attempts.length;
      sessionsByDate[dateKey].accuracy += correct;
    });

    // Calculate average accuracy per day
    return Object.values(sessionsByDate)
      .map(d => ({
        ...d,
        avgAccuracy: d.totalAttempts > 0 ? Math.round((d.accuracy / d.totalAttempts) * 100) : 0,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-10); // Last 10 days
  }, [sessions]);

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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
          <div className="p-4 bg-green-100 text-green-600 rounded-xl">
            <TrendingUp size={32} />
          </div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Easy Words</p>
            <p className="text-3xl font-bold text-stone-900">{easyWords}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300">
          <div className="p-4 bg-red-100 text-red-600 rounded-xl">
            <Users size={32} />
          </div>
          <div>
            <p className="text-stone-500 text-sm font-medium">Hard Words</p>
            <p className="text-3xl font-bold text-stone-900">{hardWords}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Word Distribution by Grade */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-bold text-stone-800 mb-6">Word Distribution by Grade</h3>
          <div className="h-64 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#78716c', fontSize: 11}} 
                  dy={10}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#78716c', fontSize: 11}} width={30} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  labelFormatter={(value, payload) => {
                    if (payload && payload.length > 0) {
                      return payload[0].payload.fullName;
                    }
                    return value;
                  }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                  {gradeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#EAB308' : '#F59E0B'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-bold text-stone-800 mb-6">Difficulty Distribution</h3>
          <div className="h-64 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={difficultyData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {difficultyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Difficulty by Grade */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-stone-800 mb-6">Difficulty Breakdown by Grade</h3>
          <div className="h-64 w-full min-h-[200px] overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={400}>
              <BarChart data={difficultyByGrade} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{fill: '#78716c', fontSize: 11}} 
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#78716c', fontSize: 11}} width={30} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Easy" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Medium" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Hard" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Time Trends - Sessions Over Time */}
        {sessions.length > 0 && timeTrendData.length > 0 && (
          <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm lg:col-span-2">
            <h3 className="text-lg font-bold text-stone-800 mb-6">Session Trends Over Time</h3>
            <div className="h-64 w-full min-h-[200px] overflow-x-auto">
              <ResponsiveContainer width="100%" height="100%" minWidth={400}>
                <LineChart data={timeTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#78716c', fontSize: 11}} 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#78716c', fontSize: 11}} width={40} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="sessions" 
                    stroke="#EAB308" 
                    strokeWidth={2} 
                    dot={{ fill: '#EAB308', r: 4 }} 
                    name="Sessions"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="avgAccuracy" 
                    stroke="#22c55e" 
                    strokeWidth={2} 
                    dot={{ fill: '#22c55e', r: 4 }} 
                    name="Avg Accuracy %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {/* Most Failed Words & Student Performance */}
      {sessions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Most Failed Words */}
          {mostFailedWords.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
              <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <Trophy size={20} className="text-red-500" />
                Most Challenging Words
              </h3>
              <div className="space-y-2">
                {mostFailedWords.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-red-100 text-red-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {item.rank}
                      </div>
                      <div>
                        <p className="font-bold text-stone-800">{item.word}</p>
                        <p className="text-xs text-stone-500">{item.failures} failures out of {item.attempts} attempts</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{item.failureRate}%</p>
                      <p className="text-xs text-stone-400">failure rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Student Performance */}
          {studentPerformance.length > 0 && (
            <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
              <h3 className="text-lg font-bold text-stone-800 mb-4 flex items-center gap-2">
                <Users size={20} className="text-green-500" />
                Top Performers
              </h3>
              <div className="space-y-2">
                {studentPerformance.map((student, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-stone-800">{student.name}</p>
                        <p className="text-xs text-stone-500">{student.correct} correct, {student.incorrect} incorrect</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-600">{student.successRate}%</p>
                      <p className="text-xs text-stone-400">success rate</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
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
