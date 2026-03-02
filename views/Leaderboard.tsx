import React, { useState, useEffect, useMemo } from 'react';
import { StudentProfile, GradeLevel } from '../types';
import { fetchLeaderboard } from '../services/supabaseData';
import { Trophy, Medal, Award, Filter, Crown, Shield, Star, Crown as CrownIcon, Hexagon, ShieldAlert, Target } from 'lucide-react';
import { LeagueBadge, LEAGUE_META } from './LiveEventDisplay';

type League = 'Diamond' | 'Platinum' | 'Gold' | 'Bronze' | 'Iron' | 'Paper' | 'All';

// ── League config table ────────────────────────────────────────────────────
const LEAGUES: { id: League; label: string }[] = [
    { id: 'All', label: 'Global' },
    { id: 'Diamond', label: 'Diamond' },
    { id: 'Platinum', label: 'Platinum' },
    { id: 'Gold', label: 'Gold' },
    { id: 'Bronze', label: 'Bronze' },
    { id: 'Iron', label: 'Iron' },
    { id: 'Paper', label: 'Paper' },
];

// ── League card visual styles ──────────────────────────────────────────────
const getCardStyle = (league: League) => {
    switch (league) {
        case 'Diamond':
            // Subtle silver-grey metallic, clean border
            return 'bg-gradient-to-r from-slate-50 to-stone-50 border border-slate-200 shadow-[0_0_0_1px_rgba(148,163,184,0.4)] ring-1 ring-slate-300/60';
        case 'Platinum':
            // Cool neutral with slight shimmer suggestion
            return 'bg-stone-50 border border-stone-300 shadow-sm';
        case 'Gold':
            // Warm amber-tinted background
            return 'bg-amber-50/60 border border-amber-200 shadow-sm';
        case 'Bronze':
            // Warm terracotta hint
            return 'bg-orange-50/50 border border-orange-200 shadow-sm';
        case 'Iron':
            // Plain stone, slightly darker border
            return 'bg-stone-50 border border-stone-300 shadow-sm';
        case 'Paper':
            // Minimal, dashed
            return 'bg-white border border-dashed border-stone-200';
        default:
            return 'bg-white border border-stone-100';
    }
};

// ── League badge (inline pill on the card) ─────────────────────────────────
// Removed getLeagueBadgeStyle as we're using LeagueBadge now

// ── Left-accent colour per league ─────────────────────────────────────────
const getAccentBorder = (league: League) => {
    switch (league) {
        case 'Diamond': return 'border-l-slate-400';
        case 'Platinum': return 'border-l-stone-400';
        case 'Gold': return 'border-l-amber-400';
        case 'Bronze': return 'border-l-orange-400';
        case 'Iron': return 'border-l-stone-500';
        case 'Paper': return 'border-l-stone-200';
        default: return 'border-l-stone-200';
    }
};

// ── Avatar helper ──────────────────────────────────────────────────────────
const Avatar = ({ student, size = 'md' }: { student: any; size?: 'sm' | 'md' | 'lg' }) => {
    const sz = size === 'lg' ? 'w-16 h-16' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-11 h-11';
    return (
        <div className={`${sz} rounded-full bg-stone-100 border-2 border-white overflow-hidden shrink-0 flex items-center justify-center font-bold text-stone-400 shadow-sm`}>
            {student.photo
                ? <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                : <span>{student.firstName?.[0]}</span>}
        </div>
    );
};

// ── Podium ─────────────────────────────────────────────────────────────────
const PODIUM_ORDER = [1, 0, 2]; // indices: 2nd, 1st, 3rd

const PodiumCard: React.FC<{ student: any; position: number }> = ({ student, position }) => {
    const isFirst = position === 0;
    const medal = ['🥇', '🥈', '🥉'][position];
    const heights = ['h-24', 'h-16', 'h-12']; // platform height
    const platformBg = [
        'bg-amber-400',          // 1st – gold
        'bg-stone-300',          // 2nd – silver
        'bg-orange-300',         // 3rd – bronze
    ];

    return (
        <div className={`flex flex-col items-center gap-1 ${isFirst ? 'scale-105 z-10' : ''}`}>
            {/* Crown for 1st */}
            {isFirst && <Crown size={20} className="text-amber-500 mb-0.5" />}

            {/* Avatar */}
            <div className={`rounded-full overflow-hidden border-4 shadow-lg ${isFirst
                ? 'w-20 h-20 border-amber-400'
                : 'w-14 h-14 border-stone-300'}`}>
                {student.photo
                    ? <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                    : <div className="w-full h-full bg-stone-200 flex items-center justify-center font-black text-stone-500 text-xl">
                        {student.firstName?.[0]}
                    </div>}
            </div>

            {/* Name + XP */}
            <p className={`font-black text-stone-900 leading-tight text-center max-w-[90px] truncate ${isFirst ? 'text-sm' : 'text-xs'}`}>
                {student.firstName}
            </p>
            <p className={`font-bold text-stone-500 ${isFirst ? 'text-xs' : 'text-[10px]'}`}>
                {student.total_xp?.toLocaleString()} XP
            </p>

            {/* Platform block */}
            <div className={`w-full rounded-t-lg ${heights[position]} ${platformBg[position]} flex items-center justify-center text-white font-black text-xl shadow-inner mt-1 min-w-[80px]`}>
                {medal}
            </div>
        </div>
    );
};

const Podium = ({ top3 }: { top3: any[] }) => {
    if (top3.length < 1) return null;
    return (
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 mb-4">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest text-center mb-6">Top Rankings</p>
            <div className="flex items-end justify-center gap-3">
                {PODIUM_ORDER.map(idx => {
                    const s = top3[idx];
                    if (!s) return <div key={idx} className="min-w-[80px]" />;
                    return <PodiumCard key={s.id} student={s} position={idx} />;
                })}
            </div>
        </div>
    );
};

// ── Main Component ─────────────────────────────────────────────────────────
export const Leaderboard: React.FC = () => {
    const [students, setStudents] = useState<StudentProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [gradeFilter, setGradeFilter] = useState<GradeLevel | 'All'>('All');
    const [selectedLeague, setSelectedLeague] = useState<League>('All');

    useEffect(() => { loadLeaderboard(); }, []);

    const loadLeaderboard = async () => {
        setLoading(true);
        try {
            const data = await fetchLeaderboard();
            setStudents(data);
        } catch (error) {
            console.error('Failed to load leaderboard', error);
        } finally {
            setLoading(false);
        }
    };

    const gradeFilteredStudents = useMemo(() => {
        if (gradeFilter === 'All') return students;
        return students.filter(s => s.grade === gradeFilter);
    }, [students, gradeFilter]);

    const studentsWithLeagues = useMemo(() => {
        return gradeFilteredStudents.map((s, index) => {
            const xp = s.total_xp || 0;
            let league: League = 'Paper';
            if (xp >= 100000) league = 'Diamond';
            else if (xp >= 50000) league = 'Platinum';
            else if (xp >= 20000) league = 'Gold';
            else if (xp >= 5000) league = 'Bronze';
            else if (xp >= 1000) league = 'Iron';
            return { ...s, rank: index + 1, league };
        });
    }, [gradeFilteredStudents]);

    const displayedStudents = useMemo(() => {
        if (selectedLeague === 'All') return studentsWithLeagues;
        return studentsWithLeagues.filter(s => s.league === selectedLeague);
    }, [studentsWithLeagues, selectedLeague]);

    // Top-3 from the globally ranked (grade-filtered) list, not league-filtered
    const top3 = studentsWithLeagues.slice(0, 3);
    // Remaining rows = rank 4+ (only from filtered list, skip the ones shown in podium)
    const listStudents = displayedStudents.filter(s => (s.rank || 0) > 3);

    return (
        <div className="max-w-4xl mx-auto p-4 animate-fade-in mb-20">
            {/* Sponsors */}
            <LeaderboardSponsors />

            {/* Header */}
            <header className="text-center mb-6 mt-8">
                <h2 className="text-3xl font-black text-stone-900 flex items-center justify-center gap-3">
                    <Trophy size={34} className="text-amber-500" />
                    Leaderboard
                </h2>
                <p className="text-stone-500 mt-1 text-sm">Compete for glory in the leagues!</p>
            </header>

            {/* Controls */}
            <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 mb-5 space-y-4">

                {/* Grade filter */}
                <div className="flex justify-center">
                    <div className="flex items-center gap-2 bg-stone-50 px-4 py-2 rounded-xl border border-stone-100">
                        <Filter size={14} className="text-stone-400" />
                        <span className="text-xs font-bold text-stone-500 uppercase">Grade:</span>
                        <select
                            value={gradeFilter}
                            onChange={e => setGradeFilter(e.target.value === 'All' ? 'All' : Number(e.target.value) as GradeLevel)}
                            className="bg-transparent font-bold text-stone-800 outline-none cursor-pointer text-sm"
                        >
                            <option value="All">All Grades</option>
                            {[12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(g => (
                                <option key={g} value={g}>{g === 12 ? 'Group 3' : `Grade ${g}`}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* League pills — wrapping flex row */}
                <div className="flex flex-wrap justify-center gap-2">
                    {LEAGUES.map(({ id, label }) => {
                        const Icon = id !== 'All' ? LEAGUE_META[id as Exclude<League, 'All'>].icon : Trophy;
                        return (
                            <button
                                key={id}
                                onClick={() => setSelectedLeague(id)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all border active:scale-95
                                    ${selectedLeague === id
                                        ? 'bg-stone-900 text-white border-stone-900 shadow-md scale-105'
                                        : 'bg-stone-100 text-stone-500 border-stone-200 shadow-sm hover:bg-white hover:border-stone-300 hover:text-stone-700'}`}
                            >
                                <Icon size={14} className={selectedLeague === id ? 'text-amber-400' : 'text-stone-400'} />
                                {label}
                            </button>
                        );
                    })}
                </div>

                {/* XP thresholds legend */}
                <div className="text-center text-[10px] text-stone-400 flex flex-wrap justify-center gap-3">
                    <span className="font-semibold text-slate-500 flex items-center gap-1"><CrownIcon size={10} /> 100k+</span>
                    <span className="font-semibold text-stone-500 flex items-center gap-1"><Hexagon size={10} /> 50k+</span>
                    <span className="font-semibold text-amber-600 flex items-center gap-1"><Star size={10} /> 20k+</span>
                    <span className="font-semibold text-orange-500 flex items-center gap-1"><ShieldAlert size={10} /> 5k+</span>
                    <span className="font-semibold text-stone-500 flex items-center gap-1"><Shield size={10} /> 1k+</span>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : displayedStudents.length === 0 ? (
                <div className="text-center py-12 text-stone-400 bg-white rounded-2xl border border-stone-200">
                    <Trophy size={48} className="mx-auto mb-4 opacity-20" />
                    <p className="text-lg">No students found in this category.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* ── Podium: only show when 'All' league is selected OR ── */}
                    {/* top 3 belong to the league filter – simplest: always show podium from global top3 */}
                    {selectedLeague === 'All' && top3.length > 0 && (
                        <Podium top3={top3} />
                    )}

                    {/* ── Remaining list (rank 4+) ── */}
                    {listStudents.map(student => (
                        <div
                            key={student.id}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-l-4 transition-all hover:scale-[1.01] relative overflow-hidden
                                ${getCardStyle(student.league as League)}
                                ${getAccentBorder(student.league as League)}`}
                        >
                            {/* Rank number */}
                            <div className="w-8 text-center shrink-0">
                                <span className="text-stone-400 font-bold text-base">
                                    {student.rank}
                                </span>
                            </div>

                            {/* Avatar */}
                            <Avatar student={student} />

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h3 className="font-bold text-stone-900 truncate text-sm">
                                        {student.firstName} {student.lastName}
                                    </h3>
                                    <div className="scale-75 origin-left">
                                        <LeagueBadge league={student.league as League} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                                    <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-500 font-medium text-[10px]">
                                        {student.grade === 12 ? 'Group 3' : `Grade ${student.grade}`}
                                    </span>
                                    {student.school && (
                                        <span className="truncate max-w-[130px] hidden sm:inline">• {student.school}</span>
                                    )}
                                </div>
                            </div>

                            {/* XP */}
                            <div className="text-right shrink-0">
                                <p className="text-xl font-black text-stone-900 leading-none">
                                    {student.total_xp?.toLocaleString() ?? 0}
                                </p>
                                <p className="text-stone-400 font-bold text-[10px] uppercase tracking-wider">XP</p>
                            </div>
                        </div>
                    ))}

                    {/* If league filter is active, show ALL matching students (no podium split) */}
                    {selectedLeague !== 'All' && displayedStudents.map(student => (
                        <div
                            key={student.id}
                            className={`flex items-center gap-3 p-4 rounded-2xl border-l-4 transition-all hover:scale-[1.01] relative overflow-hidden
                                ${getCardStyle(student.league as League)}
                                ${getAccentBorder(student.league as League)}`}
                        >
                            <div className="w-8 text-center shrink-0">
                                <span className="text-stone-400 font-bold text-base">{student.rank}</span>
                            </div>
                            <Avatar student={student} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 flex-wrap">
                                    <h3 className="font-bold text-stone-900 truncate text-sm">
                                        {student.firstName} {student.lastName}
                                    </h3>
                                    <div className="scale-75 origin-left">
                                        <LeagueBadge league={student.league as League} />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-stone-400 mt-0.5">
                                    <span className="bg-stone-100 px-1.5 py-0.5 rounded text-stone-500 font-medium text-[10px]">
                                        {student.grade === 12 ? 'Group 3' : `Grade ${student.grade}`}
                                    </span>
                                    {student.school && (
                                        <span className="truncate max-w-[130px] hidden sm:inline">• {student.school}</span>
                                    )}
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xl font-black text-stone-900 leading-none">
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

// ── Sponsors component ─────────────────────────────────────────────────────
import { Sponsor } from '../types';
import { fetchSponsors } from '../services/supabaseData';

const LeaderboardSponsors: React.FC = () => {
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);

    useEffect(() => {
        fetchSponsors().then(setSponsors).catch(console.error);
    }, []);

    if (sponsors.length === 0) return null;

    return (
        <div className="mb-8 animate-fade-in">
            <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/bee.png')] opacity-5 bg-center bg-no-repeat bg-contain pointer-events-none" />
                <div className="relative z-10">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <span className="h-px bg-amber-400 w-8 md:w-16 opacity-70" />
                        <h3 className="text-sm md:text-base font-black text-amber-400 uppercase tracking-[0.2em]">THE BEST OF THE BEST</h3>
                        <span className="h-px bg-amber-400 w-8 md:w-16 opacity-70" />
                    </div>
                    <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10">
                        {sponsors.map(s => (
                            <div key={s.id} className="bg-white p-3 rounded-xl hover:scale-105 transition-all shadow-md">
                                <img
                                    src={s.logoUrl}
                                    alt={s.name}
                                    className={`object-contain ${s.tier === 'Gold' ? 'h-12 md:h-16' : s.tier === 'Silver' ? 'h-10 md:h-12' : 'h-8 md:h-10'}`}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
