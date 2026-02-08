import React, { useState } from 'react';
import { Session } from '../types';
import { Calendar, BookOpen, UserCheck, ChevronRight, X, Award, Building2, Clock } from 'lucide-react';

interface HistoryViewProps {
  sessions: Session[];
}

export const HistoryView: React.FC<HistoryViewProps> = ({ sessions }) => {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-stone-400">
        <Clock size={48} className="mb-4 opacity-20" />
        <p className="text-lg">No sessions recorded yet.</p>
      </div>
    );
  }

  // Sort by date descending
  const sortedSessions = [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
                        <span className="flex items-center gap-1"><Calendar size={14}/> {new Date(selectedSession.date).toLocaleString()}</span>
                        <span className="flex items-center gap-1"><UserCheck size={14}/> Moderator: <span className="font-semibold text-stone-700">{selectedSession.moderator}</span></span>
                        <span className="flex items-center gap-1"><BookOpen size={14}/> Grade {selectedSession.grade}</span>
                    </div>
                </div>
                <button 
                    onClick={() => setSelectedSession(null)}
                    className="p-2 hover:bg-stone-200 rounded-full transition-colors text-stone-500 hover:text-stone-800"
                >
                    <X size={24} />
                </button>
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
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            attempt.result === 'correct' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <h2 className="text-2xl font-bold text-stone-800 mb-6 flex items-center gap-2">
         <Clock className="text-stone-400" /> Session History
      </h2>
      
      <div className="grid grid-cols-1 gap-4">
        {sortedSessions.map((session) => {
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
        })}
      </div>
    </div>
  );
};