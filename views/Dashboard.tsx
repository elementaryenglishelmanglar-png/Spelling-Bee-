import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend, LineChart, Line } from 'recharts';
import { WordEntry, GradeLevel, Session, ViewState } from '../types';
import { BookOpen, Trophy, Users, TrendingUp, Database, Play, Award, Store } from 'lucide-react';

interface DashboardProps {
  words: WordEntry[];
  sessions: Session[];
  onChangeView: (view: ViewState) => void;
  beeImageUrl?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ words, sessions, onChangeView, beeImageUrl }) => {
  const grades = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  const gradeData = useMemo(() => grades.map((grade) => ({
    name: grade === 12 ? 'G3' : `G${grade}`,
    fullName: grade === 12 ? 'Group 3' : `Grade ${grade}`,
    count: words.filter((w) => w.grade === grade).length,
  })), [words]);

  const posData = useMemo(() => {
    const noun = words.filter(w => w.partOfSpeech === 'noun' || !w.partOfSpeech).length;
    const verb = words.filter(w => w.partOfSpeech === 'verb').length;
    const adjective = words.filter(w => w.partOfSpeech === 'adjective').length;
    const adverb = words.filter(w => w.partOfSpeech === 'adverb').length;
    const preposition = words.filter(w => w.partOfSpeech === 'preposition').length;
    const conjunction = words.filter(w => w.partOfSpeech === 'conjunction').length;
    return [
      { name: 'Noun', value: noun, color: '#22c55e' },
      { name: 'Verb', value: verb, color: '#ef4444' },
      { name: 'Adjective', value: adjective, color: '#3b82f6' },
      { name: 'Adverb', value: adverb, color: '#a855f7' },
      { name: 'Prep', value: preposition, color: '#f97316' },
      { name: 'Conj', value: conjunction, color: '#ec4899' },
    ].filter(item => item.value > 0);
  }, [words]);

  const posByGrade = useMemo(() => {
    return grades.map(grade => {
      const gradeWords = words.filter(w => w.grade === grade);
      return {
        name: grade === 12 ? 'G3' : `G${grade}`,
        fullName: grade === 12 ? 'Group 3' : `Grade ${grade}`,
        Noun: gradeWords.filter(w => w.partOfSpeech === 'noun' || !w.partOfSpeech).length,
        Verb: gradeWords.filter(w => w.partOfSpeech === 'verb').length,
        Adj: gradeWords.filter(w => w.partOfSpeech === 'adjective').length,
        Adv: gradeWords.filter(w => w.partOfSpeech === 'adverb').length,
        Prep: gradeWords.filter(w => w.partOfSpeech === 'preposition').length,
        Conj: gradeWords.filter(w => w.partOfSpeech === 'conjunction').length,
      };
    });
  }, [words]);

  const wordStatsByGrade = useMemo(() => {
    return grades.map(grade => {
      const gradeWords = words.filter(w => w.grade === grade);
      const totalLetters = gradeWords.reduce((sum, w) => sum + w.word.length, 0);
      const avgLetters = gradeWords.length > 0 ? (totalLetters / gradeWords.length).toFixed(1) : 0;

      const themeCounts: Record<string, number> = {};
      gradeWords.forEach(w => {
        const theme = w.theme || 'General';
        themeCounts[theme] = (themeCounts[theme] || 0) + 1;
      });

      let topTheme = 'None';
      let maxCount = 0;
      Object.entries(themeCounts).forEach(([theme, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topTheme = theme;
        }
      });

      return {
        name: grade === 12 ? 'G3' : `G${grade}`,
        fullName: grade === 12 ? 'Group 3' : `Grade ${grade}`,
        avgLetters: Number(avgLetters),
        topTheme: topTheme,
        topThemeCount: maxCount,
        totalWords: gradeWords.length
      };
    }).filter(g => g.totalWords > 0);
  }, [words]);

  const totalWords = words.length;
  const nounsCount = words.filter(w => w.partOfSpeech === 'noun' || !w.partOfSpeech).length;
  const verbsCount = words.filter(w => w.partOfSpeech === 'verb').length;
  const adjectivesCount = words.filter(w => w.partOfSpeech === 'adjective').length;

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
    <div className="space-y-8 animate-fade-in pb-12">
      <header className="mb-8 relative bg-white p-8 rounded-3xl border border-stone-200 shadow-xl overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 max-w-lg">
          <h2 className="text-4xl font-black text-stone-900 mb-2 font-serif tracking-tight">Contest Overview</h2>
          <p className="text-stone-500 text-lg font-medium">Welcome back, Administrator. Your headquarters is ready.</p>
        </div>

        {beeImageUrl && (
          <div className="hidden md:block absolute right-[-20px] top-[-30px] w-48 h-48 opacity-20 md:opacity-100 md:relative md:w-40 md:h-40 md:top-auto md:right-auto animate-bounce-slow" style={{ animationDuration: '4s' }}>
            <img src={beeImageUrl} alt="Bee Mascot" className="w-full h-full object-contain drop-shadow-lg transform -rotate-12" />
          </div>
        )}
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300 group">
          <div className="p-4 bg-stone-50 text-stone-400 group-hover:text-amber-500 group-hover:bg-amber-50 rounded-xl transition-colors">
            <BookOpen size={32} />
          </div>
          <div>
            <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">Total Words</p>
            <p className="text-4xl font-black text-stone-900 font-serif">{totalWords}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300 group">
          <div className="p-4 bg-stone-50 text-stone-400 group-hover:text-amber-500 group-hover:bg-amber-50 rounded-xl transition-colors">
            <Trophy size={32} />
          </div>
          <div>
            <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">Contest Ready</p>
            <p className="text-3xl font-black text-stone-900 font-serif leading-tight mt-1">{totalWords > 20 ? 'Yes' : 'No'}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300 group">
          <div className="p-4 bg-stone-50 text-stone-400 group-hover:text-emerald-500 group-hover:bg-emerald-50 rounded-xl transition-colors">
            <TrendingUp size={32} />
          </div>
          <div>
            <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">Nouns</p>
            <p className="text-4xl font-black text-stone-900 font-serif">{nounsCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm flex items-center gap-4 transition-transform hover:-translate-y-1 duration-300 group">
          <div className="p-4 bg-stone-50 text-stone-400 group-hover:text-rose-500 group-hover:bg-rose-50 rounded-xl transition-colors">
            <Users size={32} />
          </div>
          <div>
            <p className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">Verb / Adj</p>
            <p className="text-4xl font-black text-stone-900 font-serif">{verbsCount + adjectivesCount}</p>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Word Distribution by Grade */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
          <h3 className="text-lg font-bold text-stone-900 mb-6 font-serif">Word Distribution by Grade</h3>
          <div className="h-64 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={300}>
              <BarChart data={gradeData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#78716c', fontSize: 11 }}
                  dy={10}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 11 }} width={30} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
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

        {/* Part Of Speech Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm">
          <h3 className="text-lg font-bold text-stone-800 mb-6">Part of Speech Overview</h3>
          <div className="h-64 w-full min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%" minWidth={300}>
              <PieChart>
                <Pie
                  data={posData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {posData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', fontSize: '12px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Part of Speech by Grade */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-stone-800 mb-6">Part of Speech Breakdown by Grade</h3>
          <div className="h-64 w-full min-h-[200px] overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={400}>
              <BarChart data={posByGrade} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#78716c', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 11 }} width={30} />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="Noun" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Verb" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Adj" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Adv" stackId="a" fill="#a855f7" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Prep" stackId="a" fill="#f97316" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Conj" stackId="a" fill="#ec4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Word Length & Themes by Grade */}
        <div className="bg-white p-6 rounded-2xl border border-stone-100 shadow-sm lg:col-span-2">
          <h3 className="text-lg font-bold text-stone-800 mb-6">Vocabulary Complexity & Themes by Grade</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-64 w-full min-h-[200px]">
              <h4 className="text-xs font-bold text-stone-500 uppercase mb-2 text-center">Avg Letters per Word</h4>
              <ResponsiveContainer width="100%" height="100%" minWidth={300}>
                <LineChart data={wordStatsByGrade} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} width={30} />
                  <Tooltip contentStyle={{ borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="avgLetters" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} name="Avg Letters" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h4 className="text-xs font-bold text-stone-500 uppercase mb-4">Top Themes per Grade</h4>
              <div className="grid grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-2">
                {wordStatsByGrade.map((stat, idx) => (
                  <div key={idx} className="bg-stone-50 p-3 rounded-xl border border-stone-200 flex flex-col justify-center">
                    <span className="text-xs font-bold text-stone-400 mb-1">{stat.fullName}</span>
                    <span className="text-sm font-bold text-stone-800 truncate" title={stat.topTheme}>{stat.topTheme}</span>
                    <span className="text-[10px] text-stone-500 mt-1">{stat.topThemeCount} words</span>
                  </div>
                ))}
              </div>
            </div>
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
                    tick={{ fill: '#78716c', fontSize: 11 }}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#78716c', fontSize: 11 }} width={40} />
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
            <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-sm">
              <h3 className="text-lg font-bold text-stone-900 mb-4 flex items-center gap-2 font-serif">
                <Trophy size={20} className="text-rose-500" />
                Most Challenging Words
              </h3>
              <div className="space-y-2">
                {mostFailedWords.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-white border border-stone-100 rounded-xl hover:border-stone-300 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-stone-50 text-stone-400 group-hover:bg-rose-50 group-hover:text-rose-600 rounded-full flex items-center justify-center font-bold text-sm transition-colors border border-stone-200">
                        {item.rank}
                      </div>
                      <div>
                        <p className="font-bold text-stone-900">{item.word}</p>
                        <p className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">{item.failures} failures</p>
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
      <div className="flex gap-4 mb-4 overflow-x-auto pb-4 scrollbar-hide">
        <button
          onClick={() => onChangeView('manage')}
          className="flex-shrink-0 flex items-center gap-2 px-6 py-4 bg-stone-900 text-white rounded-2xl shadow-md hover:shadow-xl hover:bg-stone-800 transition-all font-bold"
        >
          <Database size={20} className="text-amber-500" />
          Manage Word Lists
        </button>
        <button
          onClick={() => onChangeView('session')}
          className="flex-shrink-0 flex items-center gap-2 px-6 py-4 bg-amber-500 text-stone-900 rounded-2xl shadow-md hover:shadow-xl hover:bg-amber-400 transition-all font-bold"
        >
          <Play size={20} />
          Start Live Session
        </button>
        <button
          onClick={() => onChangeView('manage-sponsors')}
          className="flex-shrink-0 flex items-center gap-2 px-6 py-4 bg-white border border-stone-200 text-stone-700 rounded-2xl shadow-sm hover:shadow-md transition-all font-bold hover:border-amber-500"
        >
          <Award size={20} className="text-amber-500" />
          Sponsors
        </button>
        <button
          onClick={() => onChangeView('manage-vendors')}
          className="flex-shrink-0 flex items-center gap-2 px-6 py-4 bg-white border border-stone-200 text-stone-700 rounded-2xl shadow-sm hover:shadow-md transition-all font-bold hover:border-stone-400"
        >
          <Store size={20} className="text-stone-400" />
          Vendors
        </button>
      </div>
    </div>
  );
};
