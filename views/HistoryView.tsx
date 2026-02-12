import React, { useState, useMemo } from 'react';
import { Session, GradeLevel } from '../types';
import { Calendar, BookOpen, UserCheck, ChevronRight, X, Award, Building2, Clock, Filter, Search, Trash2 } from 'lucide-react';

interface HistoryViewProps {
  sessions: Session[];
  onDeleteSession?: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ sessions, onDeleteSession }) => {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [gradeFilter, setGradeFilter] = useState<GradeLevel | 'all'>('all');
  const [studentFilter, setStudentFilter] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Get unique students from all sessions
  const uniqueStudents = useMemo(() => {
    const students = new Set<string>();
    sessions.forEach(session => {
      session.attempts.forEach(attempt => {
        students.add(attempt.studentName);
      });
    });
    return Array.from(students).sort();
  }, [sessions]);

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // Filter by grade
    if (gradeFilter !== 'all') {
      result = result.filter(s => s.grade === gradeFilter);
    }

    // Filter by student name
    if (studentFilter.trim()) {
      const query = studentFilter.toLowerCase();
      result = result.filter(s =>
        s.attempts.some(a => a.studentName.toLowerCase().includes(query))
      );
    }

    // Filter by date range
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      result = result.filter(s => new Date(s.date) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // End of day
      result = result.filter(s => new Date(s.date) <= toDate);
    }

    return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions, gradeFilter, studentFilter, dateFrom, dateTo]);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-stone-400">
        <Clock size={48} className="mb-4 opacity-20" />
        <p className="text-lg">No sessions recorded yet.</p>
      </div>
    );
  }

  // Modal for details
  if (selectedSession) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-stone-100 bg-stone-50 flex justify-between items-start">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h2 className="text-2xl font-bold text-stone-800">Session Details</h2>
                {selectedSession.contestType && (
                  <span className="px-2 py-1 bg-stone-800 text-white text-xs font-bold rounded uppercase flex items-center gap-1">
                    <Building2 size={12} /> {selectedSession.contestType}
                  </span>
                )}
                {selectedSession.stage && (
                  <span className="px-2 py-1 bg-yellow-400 text-stone-900 text-xs font-bold rounded uppercase flex items-center gap-1">
                    <Award size={12} /> {selectedSession.stage}
                  </span>
                )}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-sm text-stone-500">
                <span className="flex items-center gap-1"><Calendar size={14} /> {new Date(selectedSession.date).toLocaleString()}</span>
                <span className="flex items-center gap-1"><UserCheck size={14} /> Moderator: <span className="font-semibold text-stone-700">{selectedSession.moderator}</span></span>
                <span className="flex items-center gap-1"><BookOpen size={14} /> Grade {selectedSession.grade}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onDeleteSession && (
                <button
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
                      onDeleteSession(selectedSession.id);
                      setSelectedSession(null);
                    }
                  }}
                  className="p-2 hover:bg-red-50 text-stone-400 hover:text-red-500 rounded-full transition-colors"
                  title="Delete Session"
                >
                  <Trash2 size={20} />
                </button>
              )}
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500 hover:text-stone-800"
              >
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-left text-sm border-collapse">
              <thead className="bg-white text-stone-500 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="p-4 font-bold border-b border-stone-200 bg-stone-50">#</th>
                  <th className="p-4 font-bold border-b border-stone-200 bg-stone-50">Student</th>
                  <th className="p-4 font-bold border-b border-stone-200 bg-stone-50">Word</th>
                  <th className="p-4 font-bold border-b border-stone-200 bg-stone-50">Typed Input</th>
                  <th className="p-4 font-bold border-b border-stone-200 bg-stone-50 text-center">Protocol</th>
                  <th className="p-4 font-bold border-b border-stone-200 bg-stone-50 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {selectedSession.attempts.map((attempt, i) => (
                  <tr key={i} className="hover:bg-stone-50 transition-colors">
                    <td className="p-4 text-stone-400 font-mono text-xs">{attempt.round}</td>
                    <td className="p-4 font-bold text-stone-800">{attempt.studentName}</td>
                    <td className="p-4">
                      <span className="font-bold text-stone-800">{attempt.wordText}</span>
                    </td>
                    <td className="p-4 font-mono text-stone-600">
                      {attempt.typedSpelling || <span className="text-stone-300 italic">No input</span>}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <span title="Opened Protocol (Say word first)" className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold border ${attempt.protocolOpened ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-300 border-red-100'}`}>O</span>
                        <span title="Closed Protocol (Say word last)" className={`w-6 h-6 flex items-center justify-center rounded text-[10px] font-bold border ${attempt.protocolClosed ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-300 border-red-100'}`}>C</span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${attempt.result === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {attempt.result}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selectedSession.attempts.length === 0 && (
              <div className="p-12 text-center text-stone-400">No attempts recorded in this session.</div>
            )}
          </div>

          {/* Footer Stats */}
          <div className="p-6 bg-stone-50 border-t border-stone-200 flex flex-wrap gap-4 justify-around text-sm">
            <div className="text-center min-w-[80px]">
              <span className="block text-stone-400 text-[10px] font-bold uppercase tracking-wider">Total Words</span>
              <span className="font-bold text-xl text-stone-800">{selectedSession.attempts.length}</span>
            </div>
            <div className="text-center min-w-[80px]">
              <span className="block text-stone-400 text-[10px] font-bold uppercase tracking-wider">Correct</span>
              <span className="font-bold text-xl text-green-600">{selectedSession.attempts.filter(a => a.result === 'correct').length}</span>
            </div>
            <div className="text-center min-w-[80px]">
              <span className="block text-stone-400 text-[10px] font-bold uppercase tracking-wider">Accuracy</span>
              <span className="font-bold text-xl text-stone-800">
                {selectedSession.attempts.length > 0
                  ? Math.round((selectedSession.attempts.filter(a => a.result === 'correct').length / selectedSession.attempts.length) * 100)
                  : 0}%
              </span>
            </div>
            <div className="text-center min-w-[80px]">
              <span className="block text-stone-400 text-[10px] font-bold uppercase tracking-wider">Duration</span>
              <span className="font-bold text-xl text-stone-800">{Math.floor(selectedSession.durationSeconds / 60)}m {selectedSession.durationSeconds % 60}s</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main List View
  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-bold text-stone-800 flex items-center gap-2">
          <Clock className="text-stone-400" /> Session History
        </h2>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${showFilters
            ? 'bg-yellow-100 border-yellow-300 text-stone-800'
            : 'bg-white border-stone-300 text-stone-600 hover:bg-stone-50'
            }`}
        >
          <Filter size={16} />
          <span className="text-sm font-medium">Filters</span>
          {(gradeFilter !== 'all' || studentFilter || dateFrom || dateTo) && (
            <span className="w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
              {[gradeFilter !== 'all' ? 1 : 0, studentFilter ? 1 : 0, dateFrom ? 1 : 0, dateTo ? 1 : 0].reduce((a, b) => a + b, 0)}
            </span>
          )}
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-xl border border-stone-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Grade Filter */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2 uppercase">Grade</label>
              <select
                value={gradeFilter}
                onChange={(e) => setGradeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as GradeLevel)}
                className="w-full p-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-200 outline-none"
              >
                <option value="all">All Grades</option>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                  <option key={g} value={g}>Grade {g}</option>
                ))}
              </select>
            </div>

            {/* Student Filter */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2 uppercase">Student</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                <input
                  type="text"
                  value={studentFilter}
                  onChange={(e) => setStudentFilter(e.target.value)}
                  placeholder="Search student..."
                  className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-200 outline-none"
                />
              </div>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2 uppercase">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-200 outline-none"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-xs font-bold text-stone-600 mb-2 uppercase">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full p-2 border border-stone-300 rounded-lg text-sm focus:ring-2 focus:ring-yellow-200 outline-none"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {(gradeFilter !== 'all' || studentFilter || dateFrom || dateTo) && (
            <div className="mt-4 pt-4 border-t border-stone-200">
              <button
                onClick={() => {
                  setGradeFilter('all');
                  setStudentFilter('');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="text-sm text-stone-500 hover:text-stone-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Results Count */}
      {filteredSessions.length !== sessions.length && (
        <div className="text-sm text-stone-500">
          Showing {filteredSessions.length} of {sessions.length} sessions
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {filteredSessions.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <Filter size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg">No sessions match your filters.</p>
          </div>
        ) : (
          filteredSessions.map((session) => {
            const correctCount = session.attempts.filter(a => a.result === 'correct').length;
            const accuracy = session.attempts.length > 0 ? Math.round((correctCount / session.attempts.length) * 100) : 0;

            return (
              <button
                key={session.id}
                onClick={() => setSelectedSession(session)}
                className="w-full text-left bg-white p-6 rounded-xl border border-stone-200 shadow-sm hover:shadow-lg hover:border-yellow-400 transition-all group"
              >
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

                  {/* Left: Info */}
                  <div className="flex-1 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {session.contestType && (
                        <span className="px-2 py-1 bg-stone-800 text-yellow-400 text-[10px] uppercase font-bold rounded flex items-center gap-1 shadow-sm">
                          <Building2 size={10} /> {session.contestType}
                        </span>
                      )}
                      {session.stage && (
                        <span className={`px-2 py-1 text-[10px] uppercase font-bold rounded border flex items-center gap-1 shadow-sm ${session.stage === 'Final' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                          <Award size={10} /> {session.stage}
                        </span>
                      )}
                      <span className="text-xs font-bold text-stone-400 uppercase tracking-wide ml-1">
                        {new Date(session.date).toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-stone-700">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <UserCheck size={18} className="text-stone-400" />
                        {session.moderator}
                      </h3>
                      <span className="text-stone-300 hidden sm:inline">|</span>
                      <span className="text-sm font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded">Grade {session.grade}</span>
                    </div>
                  </div>

                  {/* Right: Stats & Arrow */}
                  <div className="flex items-center justify-between w-full md:w-auto gap-6 border-t md:border-t-0 border-stone-100 pt-4 md:pt-0">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-stone-800 leading-none mb-1">{session.attempts.length} <span className="text-xs font-normal text-stone-400 uppercase">Words</span></p>
                      <p className="text-xs font-bold text-green-600">{accuracy}% Accuracy</p>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center text-stone-300 group-hover:bg-yellow-400 group-hover:text-stone-900 transition-colors shadow-sm">
                      <ChevronRight size={20} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
