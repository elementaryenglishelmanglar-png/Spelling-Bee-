import React, { useState, useEffect, useMemo } from 'react';
import { StudentProfile, GradeLevel } from '../types';
import { fetchLeaderboard } from '../services/supabaseData';
import { Trophy, Medal, Award, Filter, Search, Crown, Shield } from 'lucide-react';

type League = 'Diamond' | 'Platinum' | 'Gold' | 'Bronze' | 'Iron' | 'Paper' | 'All';

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

    // 2. Assign Leagues based on XP Thresholds
    const studentsWithLeagues = useMemo(() => {
        return gradeFilteredStudents.map((s, index) => {
            const xp = s.total_xp || 0;
            let league: League = 'Paper';

            if (xp >= 100000) league = 'Diamond';
            else if (xp >= 50000) league = 'Platinum';
            else if (xp >= 20000) league = 'Gold';
            else if (xp >= 5000) league = 'Bronze';
            else if (xp >= 1000) league = 'Iron';

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

    const getRankIcon = (rank: number, league: League) => {
        if (league === 'Diamond') return <Crown size={24} className="text-cyan-400 fill-cyan-400 animate-pulse" />;
        if (league === 'Platinum') return <Crown size={24} className="text-slate-300 fill-slate-300" />;
        if (league === 'Gold') return <Medal size={24} className="text-yellow-400 fill-yellow-400" />;
        if (league === 'Bronze') return <Medal size={24} className="text-orange-400 fill-orange-400" />;
        if (league === 'Iron') return <Medal size={24} className="text-stone-500 fill-stone-500" />;

        // Default rank number for Paper or others
        if (rank <= 3) return <Crown size={20} className="text-yellow-600/50" />;
        return <span className="text-stone-500 font-bold text-lg w-6 text-center">{rank}</span>;
    };

    const getLeagueColor = (league: League) => {
        switch (league) {
            case 'Diamond': return 'bg-cyan-100 text-cyan-700 border-cyan-200 ring-1 ring-cyan-300';
            case 'Platinum': return 'bg-slate-100 text-slate-700 border-slate-300 ring-1 ring-slate-400';
            case 'Gold': return 'bg-yellow-100 text-yellow-700 border-yellow-200 ring-1 ring-yellow-300';
            case 'Bronze': return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'Iron': return 'bg-stone-200 text-stone-700 border-stone-300';
            case 'Paper': return 'bg-stone-50 text-stone-500 border-stone-200 border-dashed';
            default: return 'bg-white text-stone-600 border-stone-100';
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in mb-20">
            {/* Sponsors Header */}
            <LeaderboardSponsors />

            <header className="text-center mb-6 mt-8">
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
                <div className="flex p-1 bg-stone-100 rounded-xl overflow-x-auto gap-1">
                    {(['All', 'Diamond', 'Platinum', 'Gold', 'Bronze', 'Iron', 'Paper'] as League[]).map((league) => (
                        <button
                            key={league}
                            onClick={() => setSelectedLeague(league)}
                            className={`flex-1 py-2 px-3 rounded-lg text-xs md:text-sm font-bold transition-all whitespace-nowrap ${selectedLeague === league
                                ? 'bg-white text-stone-800 shadow-sm ring-1 ring-stone-200'
                                : 'text-stone-400 hover:text-stone-600 hover:bg-stone-200/50'
                                }`}
                        >
                            {league === 'Diamond' && <span className="mr-1">💎</span>}
                            {league === 'Platinum' && <span className="mr-1">⬜</span>}
                            {league === 'Gold' && <span className="mr-1">🥇</span>}
                            {league === 'Bronze' && <span className="mr-1">🥉</span>}
                            {league === 'Iron' && <span className="mr-1">🔩</span>}
                            {league === 'Paper' && <span className="mr-1">📄</span>}
                            {league === 'All' ? 'Global' : league}
                        </button>
                    ))}
                </div>

                <div className="text-center text-[10px] md:text-xs text-stone-400 flex flex-wrap justify-center gap-3">
                    <span className="font-bold text-cyan-600">💎 Diamond: 100k+</span>
                    <span className="font-bold text-slate-500">⬜ Platinum: 50k+</span>
                    <span className="font-bold text-yellow-600">🥇 Gold: 20k+</span>
                    <span className="font-bold text-orange-600">🥉 Bronze: 5k+</span>
                    <span className="font-bold text-stone-600">🔩 Iron: 1k+</span>
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
                            className={`flex items-center gap-4 p-4 rounded-xl border-l-4 transition-all hover:scale-[1.01] bg-white border-stone-100 relative overflow-hidden ${student.league === 'Diamond' ? 'border-l-cyan-400' :
                                    student.league === 'Platinum' ? 'border-l-slate-300' :
                                        student.league === 'Gold' ? 'border-l-yellow-400' :
                                            student.league === 'Bronze' ? 'border-l-orange-400' :
                                                student.league === 'Iron' ? 'border-l-stone-400' :
                                                    'border-l-stone-200'
                                }`}
                        >
                            {/* Rank Badge */}
                            <div className="w-8 flex flex-col items-center justify-center shrink-0">
                                {getRankIcon(student.rank || 0, student.league as League)}
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
                                <p className="text-stone-400 font-bold text-[10px] uppercase tracking-wider">XP</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// Internal component for Sponsors display
import { Sponsor } from '../types';
import { fetchSponsors } from '../services/supabaseData';

const LeaderboardSponsors: React.FC = () => {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);

    useEffect(() => {
        fetchSponsors().then(setSponsors).catch(console.error);
    }, []);

    if (sponsors.length === 0) return null;

    return (
        <div className="mb-8 animate-fade-in text-stone-800">
            <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/bee.png')] opacity-5 bg-center bg-no-repeat bg-contain pointer-events-none"></div>
                <div className="relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <span className="h-px bg-yellow-400 w-8 md:w-16 opacity-70"></span>
                        <h3 className="text-sm md:text-base font-black text-yellow-400 uppercase tracking-[0.2em] drop-shadow-sm">The Best for the Best</h3>
                        <span className="h-px bg-yellow-400 w-8 md:w-16 opacity-70"></span>
                    </div>

                    <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
                        {sponsors.map(s => (
                            <div key={s.id} className="bg-white p-3 rounded-xl hover:scale-105 transition-all duration-300 group shadow-md">
                                <img
                                    src={s.logoUrl}
                                    alt={s.name}
                                    className={`object-contain transition-transform duration-300 ${s.tier === 'Gold' ? 'h-12 md:h-16' :
                                        s.tier === 'Silver' ? 'h-10 md:h-12' :
                                            'h-8 md:h-10'
                                        }`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
