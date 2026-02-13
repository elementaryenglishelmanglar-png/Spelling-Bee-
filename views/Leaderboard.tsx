import React, { useState, useEffect, useMemo } from 'react';
import { StudentProfile, GradeLevel } from '../types';
import { fetchLeaderboard } from '../services/supabaseData';
import { Trophy, Medal, Award, Filter, Search, Crown, Shield } from 'lucide-react';

type League = 'All' | 'Gold' | 'Silver' | 'Bronze';

export const Leaderboard: React.FC = () => {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [gradeFilter, setGradeFilter] = useState<GradeLevel | 'All'>('All');
    const [selectedLeague, setSelectedLeague] = useState<League>('All');

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

    // 1. Filter by Grade first
    const gradeFilteredStudents = useMemo(() => {
        if (gradeFilter === 'All') return students;
        return students.filter(s => s.grade === gradeFilter);
    }, [students, gradeFilter]);

    // 2. Assign Leagues based on Grade-Specific Rank
    const studentsWithLeagues = useMemo(() => {
        const total = gradeFilteredStudents.length;
        if (total === 0) return [];

        return gradeFilteredStudents.map((s, index) => {
            const percentile = (index + 1) / total; // 1 = top rank (but index 0), so (0+1)/total. Small number is better.

            let league: League = 'Bronze';
            if (percentile <= 0.20) league = 'Gold';       // Top 20%
            else if (percentile <= 0.50) league = 'Silver'; // Next 30%

            return {
                ...s,
                rank: index + 1,
                league
            };
        });
    }, [gradeFilteredStudents]);

    // 3. Filter by Selected League
    const displayedStudents = useMemo(() => {
        if (selectedLeague === 'All') return studentsWithLeagues;
        return studentsWithLeagues.filter(s => s.league === selectedLeague);
    }, [studentsWithLeagues, selectedLeague]);

    const getRankIcon = (rank: number) => {
        if (rank === 1) return <Crown size={24} className="text-yellow-500 fill-yellow-500" />;
        if (rank === 2) return <Medal size={24} className="text-stone-400 fill-stone-400" />;
        if (rank === 3) return <Medal size={24} className="text-orange-700 fill-orange-700" />;
        return <span className="text-stone-500 font-bold text-lg w-6 text-center">{rank}</span>;
    };

    const getLeagueColor = (league: League) => {
        switch (league) {
            case 'Gold': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
            case 'Silver': return 'bg-stone-100 text-stone-600 border-stone-200';
            case 'Bronze': return 'bg-orange-50 text-orange-700 border-orange-200';
            default: return 'bg-white text-stone-600 border-stone-100';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in mb-20">
            <header className="text-center mb-6">
                <h2 className="text-3xl font-black text-stone-800 flex items-center justify-center gap-3">
                    <Trophy size={36} className="text-yellow-500" />
                    Leaderboard
                </h2>
                <p className="text-stone-500 mt-2">Compete for glory in the leagues!</p>
            </header>

            {/* Controls Container */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 mb-6 space-y-4">

                {/* Grade Filter */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-2 bg-stone-50 px-4 py-2 rounded-xl border border-stone-100">
                        <Filter size={16} className="text-stone-400" />
                        <span className="text-sm font-bold text-stone-500 uppercase">Grade:</span>
                        <select
                            value={gradeFilter}
                            onChange={(e) => setGradeFilter(e.target.value === 'All' ? 'All' : Number(e.target.value) as GradeLevel)}
                            className="bg-transparent font-bold text-stone-800 outline-none cursor-pointer"
                        >
                            <option value="All">All Grades</option>
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                                <option key={g} value={g}>Grade {g}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* League Tabs */}
                <div className="flex p-1 bg-stone-100 rounded-xl overflow-hidden">
                    {(['All', 'Gold', 'Silver', 'Bronze'] as League[]).map((league) => (
                        <button
                            key={league}
                            onClick={() => setSelectedLeague(league)}
                            className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${selectedLeague === league
                                    ? 'bg-white text-stone-800 shadow-sm'
                                    : 'text-stone-400 hover:text-stone-600'
                                }`}
                        >
                            {league === 'Gold' && <span className="mr-1">🏆</span>}
                            {league === 'Silver' && <span className="mr-1">🥈</span>}
                            {league === 'Bronze' && <span className="mr-1">🥉</span>}
                            {league === 'All' ? 'Global' : `${league} League`}
                        </button>
                    ))}
                </div>

                <div className="text-center text-xs text-stone-400">
                    <span className="font-bold">Gold:</span> Top 20% • <span className="font-bold">Silver:</span> Next 30% • <span className="font-bold">Bronze:</span> Bottom 50%
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : displayedStudents.length === 0 ? (
                <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-200">
                    <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg">No students found in this category.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayedStudents.map((student) => (
                        <div
                            key={student.id}
                            className={`flex items-center gap-4 p-4 rounded-xl border-l-4 transition-all hover:scale-[1.01] bg-white border-stone-100 relative overflow-hidden ${student.league === 'Gold' ? 'border-l-yellow-400' :
                                    student.league === 'Silver' ? 'border-l-stone-300' :
                                        'border-l-orange-300'
                                }`}
                        >
                            {/* Rank Badge */}
                            <div className="w-8 flex flex-col items-center justify-center shrink-0">
                                <span className="text-lg font-black text-stone-300">#{student.rank}</span>
                            </div>

                            <div className="w-12 h-12 rounded-full bg-stone-100 border border-stone-200 overflow-hidden shrink-0 relative">
                                {student.photo ? (
                                    <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center font-bold text-stone-400 bg-stone-100">
                                        {student.firstName[0]}
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-stone-800 truncate">
                                        {student.firstName} {student.lastName}
                                    </h3>
                                    {/* League Badge */}
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${getLeagueColor(student.league as League)}`}>
                                        {student.league}
                                    </span>
                                </div>

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
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">XP</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
