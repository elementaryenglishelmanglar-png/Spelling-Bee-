import React, { useState, useEffect, useMemo } from 'react';
import { StudentProfile, GradeLevel } from '../types';
import { fetchLeaderboard } from '../services/supabaseData';
import { Trophy, Medal, Award, Filter, Search, Crown } from 'lucide-react';

export const Leaderboard: React.FC = () => {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [gradeFilter, setGradeFilter] = useState<GradeLevel | 'All'>('All');

    useEffect(() => {
        loadLeaderboard();
    }, []);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const data = await fetchLeaderboard();
            setStudents(data);
        } catch (error) {
            console.error("Failed to load leaderboard", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredStudents = useMemo(() => {
        if (gradeFilter === 'All') return students;
        return students.filter(s => s.grade === gradeFilter);
    }, [students, gradeFilter]);

    // Recalculate ranks based on filtered list
    const rankedStudents = useMemo(() => {
        return filteredStudents.map((s, index) => ({
            ...s,
            rank: index + 1
        }));
    }, [filteredStudents]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown size={24} className="text-yellow-500 fill-yellow-500" />;
        if (rank === 2) return <Medal size={24} className="text-stone-400 fill-stone-400" />;
        if (rank === 3) return <Medal size={24} className="text-orange-700 fill-orange-700" />;
        return <span className="text-stone-500 font-bold text-lg w-6 text-center">{rank}</span>;
    };

    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in">
            <header className="text-center mb-8">
                <h2 className="text-3xl font-black text-stone-800 flex items-center justify-center gap-3">
                    <Trophy size={36} className="text-yellow-500" />
                    Leaderboard
                </h2>
                <p className="text-stone-500 mt-2">Top spelling champions</p>
            </header>

            {/* Filter */}
            <div className="flex justify-center mb-8">
                <div className="bg-white p-2 rounded-xl shadow-sm border border-stone-200 flex items-center gap-4">
                    <div className="flex items-center gap-2 px-3 py-1 bg-stone-100 rounded-lg text-stone-600 font-bold text-sm uppercase">
                        <Filter size={16} /> Filter by Grade
                    </div>
                    <select
                        value={gradeFilter}
                        onChange={(e) => setGradeFilter(e.target.value === 'All' ? 'All' : Number(e.target.value) as GradeLevel)}
                        className="bg-transparent font-bold text-stone-800 outline-none cursor-pointer"
                    >
                        <option value="All">Global (All Grades)</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                            <option key={g} value={g}>Grade {g}</option>
                        ))}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : rankedStudents.length === 0 ? (
                <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-200">
                    <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg">No champions yet. Be the first!</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {rankedStudents.map((student) => (
                        <div
                            key={student.id}
                            className={`flex items-center gap-4 p-4 rounded-xl border transition-all hover:scale-[1.01] ${student.rank === 1 ? 'bg-yellow-50 border-yellow-200 shadow-md' :
                                    student.rank === 2 ? 'bg-stone-50 border-stone-200 shadow-sm' :
                                        student.rank === 3 ? 'bg-orange-50 border-orange-200 shadow-sm' :
                                            'bg-white border-stone-100'
                                }`}
                        >
                            <div className="w-12 flex justify-center shrink-0">
                                {getRankIcon(student.rank)}
                            </div>

                            <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 overflow-hidden shrink-0">
                                {student.photo ? (
                                    <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-stone-400 bg-stone-100">
                                        {student.firstName[0]}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className={`font-bold truncate ${student.rank === 1 ? 'text-yellow-800' : 'text-stone-800'}`}>
                                    {student.firstName} {student.lastName}
                                </h3>
                                <div className="flex items-center gap-2 text-xs text-stone-500">
                                    <span className="bg-stone-100 px-2 py-0.5 rounded text-stone-600 font-medium">Grade {student.grade}</span>
                                    {student.school && (
                                        <span className="truncate max-w-[150px] hidden sm:inline">• {student.school}</span>
                                    )}
                                </div>
                            </div>

                            <div className="text-right shrink-0">
                                <p className="text-2xl font-black text-stone-800 leading-none">
                                    {student.total_xp?.toLocaleString() ?? 0}
                                </p>
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">XP Points</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
