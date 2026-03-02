import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StudentProfile, Sponsor } from '../types';
import { fetchLeaderboard, fetchSponsors } from '../services/supabaseData';
import { useLiveChannel, LiveCommand } from '../lib/liveChannel';
import { Trophy, Zap, RefreshCw, Maximize2, Crown, Shield, ShieldAlert, Star, Target, Hexagon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────
export type DisplayMode = 'standby' | 'leaderboard' | 'team-reveal' | 'spotlight';
type League = 'Diamond' | 'Platinum' | 'Gold' | 'Bronze' | 'Iron' | 'Paper';

interface RankedStudent extends StudentProfile {
    rank: number;
    league: League;
}

export interface LiveEventDisplayProps {
    initialStudents?: StudentProfile[];
}

// ─── League helpers ───────────────────────────────────────────────────────────
function getLeague(xp: number): League {
    if (xp >= 100000) return 'Diamond';
    if (xp >= 50000) return 'Platinum';
    if (xp >= 20000) return 'Gold';
    if (xp >= 5000) return 'Bronze';
    if (xp >= 1000) return 'Iron';
    return 'Paper';
}

function toRanked(raw: StudentProfile[]): RankedStudent[] {
    return raw
        .slice()
        .sort((a, b) => (b.total_xp ?? 0) - (a.total_xp ?? 0))
        .map((s, i) => ({ ...s, rank: i + 1, league: getLeague(s.total_xp ?? 0) }));
}

// ─── Esports League Badges ───────────────────────────────────────────────────
export const LEAGUE_META: Record<League, {
    icon: React.ElementType;
    bgClass: string;
    borderClass: string;
    iconClass: string;
    labelClass: string;
    glowClass: string;
    cardGlow: string;
}> = {
    Diamond: {
        icon: Crown,
        bgClass: 'bg-gradient-to-b from-cyan-900 to-slate-900',
        borderClass: 'border-cyan-300',
        iconClass: 'text-cyan-200',
        labelClass: 'bg-cyan-950 text-cyan-300 border-x border-b border-cyan-800',
        glowClass: 'bg-cyan-500',
        cardGlow: 'rgba(34,211,238,0.6)', // cyan-400
    },
    Platinum: {
        icon: Hexagon,
        bgClass: 'bg-gradient-to-b from-slate-700 to-stone-900',
        borderClass: 'border-slate-300',
        iconClass: 'text-slate-200',
        labelClass: 'bg-slate-900 text-slate-300 border-x border-b border-slate-700',
        glowClass: 'bg-slate-400',
        cardGlow: 'rgba(148,163,184,0.5)', // slate-400
    },
    Gold: {
        icon: Star,
        bgClass: 'bg-gradient-to-b from-amber-700 to-yellow-900',
        borderClass: 'border-yellow-400',
        iconClass: 'text-yellow-300',
        labelClass: 'bg-amber-950 text-yellow-400 border-x border-b border-amber-800',
        glowClass: 'bg-amber-500',
        cardGlow: 'rgba(250,204,21,0.6)', // yellow-400
    },
    Bronze: {
        icon: ShieldAlert,
        bgClass: 'bg-gradient-to-b from-orange-800 to-red-900',
        borderClass: 'border-orange-400',
        iconClass: 'text-orange-300',
        labelClass: 'bg-orange-950 text-orange-400 border-x border-b border-orange-800',
        glowClass: 'bg-orange-600',
        cardGlow: 'rgba(249,115,22,0.6)', // orange-500
    },
    Iron: {
        icon: Shield,
        bgClass: 'bg-gradient-to-b from-stone-700 to-stone-900',
        borderClass: 'border-stone-500',
        iconClass: 'text-stone-300',
        labelClass: 'bg-stone-900 text-stone-400 border-x border-b border-stone-800',
        glowClass: 'bg-stone-600',
        cardGlow: 'rgba(120,113,108,0.3)', // stone-500
    },
    Paper: {
        icon: Target,
        bgClass: 'bg-gradient-to-b from-stone-800 to-stone-950',
        borderClass: 'border-stone-600',
        iconClass: 'text-stone-500',
        labelClass: 'bg-stone-900 text-stone-500 border-x border-b border-stone-800',
        glowClass: 'bg-stone-800',
        cardGlow: 'rgba(87,83,78,0.2)', // stone-600
    },
};

export const LeagueBadge: React.FC<{ league: League; className?: string; hideText?: boolean }> = ({ league, className = '', hideText = false }) => {
    const meta = LEAGUE_META[league];
    const Icon = meta.icon;

    return (
        <div className={`relative inline-flex flex-col items-center justify-center font-black uppercase italic tracking-widest ${className}`}>
            {/* Outer Glow */}
            <div className={`absolute inset-0 rounded-full blur-xl opacity-30 ${meta.glowClass}`} />

            {/* Shield / Diamond Background Shape */}
            <div className={`relative z-10 flex items-center justify-center p-2 rounded-xl border-t-2 border-b-4 ${meta.bgClass} ${meta.borderClass} shadow-2xl skew-x-[-10deg]`}>
                {/* Inner shimmer */}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-50" />
                <div className="skew-x-[10deg]">
                    <Icon size={24} className={meta.iconClass} style={{ filter: `drop-shadow(0 0 10px ${meta.cardGlow})` }} />
                </div>
            </div>

            {/* League Text Label */}
            {!hideText && (
                <div className={`relative z-20 -mt-2 px-3 py-0.5 rounded border-t border-white/20 text-[10px] sm:text-xs shadow-lg skew-x-[-10deg] ${meta.labelClass}`}>
                    <span className="block skew-x-[10deg]">{league}</span>
                </div>
            )}
        </div>
    );
};

const RANK_COLOUR: Record<number, string> = { 1: 'text-amber-400', 2: 'text-slate-300', 3: 'text-orange-400' };

// ─── CSS Animations ───────────────────────────────────────────────────────────
const CSS_ANIMATIONS = `
@keyframes floatBee {
  0%,100% { transform: translateY(0px) rotate(-2deg); }
  50%      { transform: translateY(-18px) rotate(2deg); }
}
@keyframes pulseGlow {
  0%,100% { text-shadow: 0 0 30px rgba(245,158,11,0.6), 0 0 60px rgba(245,158,11,0.3); }
  50%      { text-shadow: 0 0 60px rgba(245,158,11,0.9), 0 0 120px rgba(245,158,11,0.5); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes scanline {
  0%   { top: -10%; }
  100% { top: 110%; }
}
@keyframes marquee {
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
}
.animate-marquee { display: flex; width: max-content; animation: marquee 30s linear infinite; }
`;

// ─── Background decorations ───────────────────────────────────────────────────
const HoneycombBg: React.FC = () => (
    <div
        className="absolute inset-0 pointer-events-none"
        style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='112' height='200'%3E%3Cpath d='M56 132L0 100V36L56 4l56 32v64L56 132zM56 196L0 164v-64L56 100l56 32v64L56 196z' fill='none' stroke='%23f59e0b' stroke-width='1'/%3E%3C/svg%3E")`,
            backgroundSize: '112px 200px',
            opacity: 0.02,
        }}
    />
);

const ScanlineOverlay: React.FC = () => (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 50 }}>
        <div style={{
            position: 'absolute', left: 0, right: 0, height: '4px',
            background: 'linear-gradient(to bottom, transparent, rgba(245,158,11,0.08), transparent)',
            animation: 'scanline 8s linear infinite'
        }} />
    </div>
);

const LiveClock: React.FC = () => {
    const [time, setTime] = useState(() => new Date());
    useEffect(() => { const id = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(id); }, []);
    return (
        <span className="text-stone-600 text-xs font-mono tabular-nums tracking-widest">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
    );
};

// ─── Sponsor Ticker ───────────────────────────────────────────────────────────
const LiveSponsors: React.FC<{ sponsors: Sponsor[] }> = ({ sponsors }) => {
    if (!sponsors || sponsors.length === 0) return null;
    return (
        <div className="absolute bottom-0 left-0 right-0 bg-stone-950/90 backdrop-blur-md border-t border-stone-800/80 p-3 z-40 overflow-hidden flex items-center shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
            <span className="text-[10px] font-bold text-stone-500 uppercase tracking-[0.3em] shrink-0 mr-8 ml-4">Sponsored By</span>
            <div className="flex-1 overflow-hidden relative" style={{ maskImage: 'linear-gradient(to right, transparent, black 5%, black 95%, transparent)' }}>
                <div className="animate-marquee flex gap-16 items-center">
                    {sponsors.concat(sponsors).map((s, i) => (
                        <div key={i} className="flex items-center">
                            <img src={s.logoUrl} alt={s.name} className={`object-contain opacity-70 grayscale hover:grayscale-0 transition-all duration-300 ${s.tier === 'Gold' ? 'h-12' : s.tier === 'Silver' ? 'h-9' : 'h-7'}`} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── MODE 1: Standby ──────────────────────────────────────────────────────────
const StandbyScreen: React.FC = () => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex flex-col items-center justify-center h-full w-full gap-8 relative z-10"
    >
        <motion.div
            animate={{ y: [0, -18, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            <img src="/bee.png" alt="Spelling Bee Mascot"
                className="w-64 h-64 md:w-80 md:h-80 object-contain drop-shadow-2xl"
                style={{ filter: 'drop-shadow(0 0 40px rgba(245,158,11,0.5))' }} />
        </motion.div>

        <div className="text-center px-8 space-y-4">
            <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="font-serif text-amber-500/70 text-xl md:text-2xl tracking-[0.4em] uppercase font-semibold"
            >
                Colegio El Manglar · 2026
            </motion.p>

            <motion.h1
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, type: "spring", bounce: 0.5 }}
                className="font-serif font-black leading-tight"
                style={{
                    fontSize: 'clamp(3rem, 7vw, 6rem)',
                    background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #fcd34d, #f59e0b, #fbbf24)',
                    backgroundSize: '200% auto',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                    animation: 'shimmer 3s linear infinite, pulseGlow 3s ease-in-out infinite',
                }}>
                4th Interschool<br />Spelling Bee<br />Manglar
            </motion.h1>

            <motion.div
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ delay: 1, duration: 0.8 }}
                className="flex items-center justify-center gap-4 mt-6"
            >
                <span className="h-px bg-amber-500/40 w-32" />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
                    <Trophy className="text-amber-500" size={28} />
                </motion.div>
                <span className="h-px bg-amber-500/40 w-32" />
            </motion.div>
        </div>

        <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="text-stone-500 text-lg md:text-xl tracking-widest uppercase font-sans mt-4"
        >
            Compete · Achieve · Excel
        </motion.p>
    </motion.div>
);

// ─── MODE 2: Leaderboard ──────────────────────────────────────────────────────
const LeaderboardRow: React.FC<{ student: RankedStudent; index: number }> = ({ student, index }) => {
    const isTop3 = student.rank <= 3;
    const meta = LEAGUE_META[student.league];
    return (
        <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, type: "spring", stiffness: 300, damping: 24 }}
            layout
            className={`flex items-center gap-5 px-6 py-4 rounded-2xl border backdrop-blur-sm transition-all
                ${isTop3 ? `bg-stone-900/70 ${meta.borderClass} border shadow-[0_0_20px_${meta.cardGlow}]` : 'bg-stone-900/40 border-amber-500/20'}`
            }
        >
            <div className="w-14 shrink-0 text-center">
                {isTop3 ? (
                    <motion.span
                        animate={student.rank === 1 ? { scale: [1, 1.1, 1] } : {}}
                        transition={student.rank === 1 ? { duration: 2, repeat: Infinity } : {}}
                        className={`inline-block text-4xl md:text-5xl font-black font-serif ${RANK_COLOUR[student.rank] ?? 'text-stone-400'}`}
                    >
                        {student.rank === 1 ? '🥇' : student.rank === 2 ? '🥈' : '🥉'}
                    </motion.span>
                ) : <span className="text-2xl font-black text-stone-500">#{student.rank}</span>}
            </div>
            <div className={`shrink-0 rounded-full overflow-hidden border-4 ${isTop3 ? meta.borderClass : 'border-stone-700'} ${isTop3 ? `shadow-[0_0_15px_${meta.cardGlow}]` : ''}`}
                style={{ width: isTop3 ? '96px' : '72px', height: isTop3 ? '96px' : '72px' }}>
                {
                    student.photo
                        ? <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full bg-stone-700 flex items-center justify-center text-amber-400 font-black text-2xl">{student.firstName?.[0]}</div>
                }
            </div >
            <div className="flex-1 min-w-0">
                <h2 className={`font-black leading-tight text-white truncate ${isTop3 ? 'text-3xl md:text-4xl' : 'text-xl md:text-2xl'}`}>
                    {student.firstName} <span className="text-stone-400 font-medium">{student.lastName}</span>
                </h2>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {student.school && <span className="text-stone-400 text-sm font-medium truncate max-w-xs">{student.school}</span>}
                    <span className="text-stone-600 text-sm">·</span>
                    <span className="text-stone-400 text-sm">{student.grade === 12 ? 'Group 3' : `Grade ${student.grade}`}</span>
                </div>
            </div>
            <div className="shrink-0 flex items-center justify-center w-24">
                <LeagueBadge league={student.league} />
            </div>
            <div className="shrink-0 text-right w-28">
                <p className={`font-black leading-none ${isTop3 ? 'text-4xl md:text-5xl text-amber-400' : 'text-2xl md:text-3xl text-amber-500/80'}`}
                    style={isTop3 ? { textShadow: '0 0 20px rgba(245,158,11,0.6)' } : undefined}>
                    {(student.total_xp ?? 0).toLocaleString()}
                </p>
                <p className="text-stone-500 text-xs font-bold uppercase tracking-widest flex items-center justify-end gap-1 mt-0.5">
                    <Zap size={10} className="text-amber-500" />XP
                </p>
            </div>
        </motion.div >
    );
};

const LiveLeaderboard: React.FC<{ students: RankedStudent[]; onRefresh: () => void; loading: boolean; lastRefresh: Date | null }> = ({
    students, onRefresh, loading, lastRefresh
}) => (
    <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="flex flex-col h-full w-full relative z-10 pb-16"
    >
        <div className="flex items-center justify-between px-10 py-5 border-b border-amber-500/10 shrink-0">
            <div className="flex items-center gap-4">
                <img src="/bee.png" alt="Bee" className="w-12 h-12 object-contain" style={{ filter: 'drop-shadow(0 0 8px rgba(245,158,11,0.5))' }} />
                <div>
                    <p className="text-amber-500/60 text-xs font-bold uppercase tracking-[0.3em]">Live Rankings</p>
                    <h2 className="font-serif font-black text-amber-500" style={{ fontSize: 'clamp(1.25rem, 3vw, 2rem)', textShadow: '0 0 20px rgba(245,158,11,0.5)' }}>
                        4th Interschool Spelling Bee Manglar
                    </h2>
                </div>
            </div>
            <div className="flex items-center gap-5">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                    </span>
                    <span className="text-red-400 text-xs font-black uppercase tracking-widest">Live</span>
                </div>
                <LiveClock />
                <button onClick={onRefresh} disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-amber-500/30 text-amber-500/60 hover:text-amber-400 hover:border-amber-400 transition-all text-xs font-bold">
                    <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />Refresh
                </button>
                <button onClick={() => document.documentElement.requestFullscreen?.()}
                    className="p-1.5 rounded-lg border border-stone-700 text-stone-600 hover:text-stone-400 hover:border-stone-500 transition-all">
                    <Maximize2 size={13} />
                </button>
            </div>
        </div>
        <div className="flex-1 overflow-hidden px-10 py-6">
            {loading ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                    <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" style={{ boxShadow: '0 0 30px rgba(245,158,11,0.4)' }} />
                    <p className="text-stone-500 text-sm uppercase tracking-widest">Fetching Rankings…</p>
                </div>
            ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-stone-600">
                    <Trophy size={64} className="opacity-20" />
                    <p className="text-xl">No rankings yet.</p>
                </div>
            ) : (
                <div className="space-y-4 h-full overflow-hidden">
                    <AnimatePresence>
                        {students.map((s, i) => <LeaderboardRow key={s.id} student={s} index={i} />)}
                    </AnimatePresence>
                </div>
            )}
        </div>
        <div className="px-10 py-3 border-t border-amber-500/10 shrink-0 flex items-center justify-between bg-stone-900/40">
            <div className="flex gap-5 text-xs text-stone-600 font-semibold">
                <span>💎 100k+</span><span>🥇 20k+</span><span>🥉 5k+</span><span>🔩 1k+</span>
            </div>
            {lastRefresh && <span className="text-stone-700 text-xs">Updated {lastRefresh.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>}
        </div>
    </motion.div>
);

// ─── MODE 3: Team Reveal (Esports loading screen) ─────────────────────────────
const TeamRevealCard: React.FC<{ student: StudentProfile; index: number; total: number }> = ({ student, index }) => {
    const league = getLeague(student.total_xp ?? 0);
    const meta = LEAGUE_META[league];
    const delay = index * 0.1;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50, rotateY: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0, rotateY: 0 }}
            transition={{ delay, duration: 0.5, type: 'spring', bounce: 0.4 }}
            className="flex flex-col w-[240px] h-[340px] lg:w-[280px] lg:h-[400px] xl:w-[320px] xl:h-[460px] shrink-0 overflow-hidden rounded-3xl border-2 border-stone-700/60 bg-stone-900/80 backdrop-blur-sm group relative shadow-2xl"
        >
            {/* Background glow base */}
            <div className="absolute inset-0 pointer-events-none opacity-20 transition-opacity duration-500 group-hover:opacity-40"
                style={{ background: `radial-gradient(circle at center, ${meta.cardGlow} 0%, transparent 70%)` }} />

            {/* Photo — auto-stretches. min-h is critical. */}
            <div className="flex-1 relative overflow-hidden bg-stone-950 min-h-[160px] h-full w-full">
                {student.photo ? (
                    <img src={student.photo} alt={student.firstName}
                        className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110" />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-amber-400 font-black opacity-30"
                        style={{ fontSize: 'clamp(4rem, 10vw, 8rem)' }}>
                        {student.firstName?.[0]}
                    </div>
                )}
                {/* Gradient overlay for text */}
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-stone-950 via-stone-950/80 to-transparent" />
                <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
            </div>

            {/* School Label */}
            <div className="absolute top-3 right-3 bg-stone-950/80 backdrop-blur border border-stone-800 px-2 py-1 rounded text-[10px] font-bold text-stone-300 max-w-[80%] truncate shadow-lg">
                {student.school}
            </div>

            {/* Content overlay */}
            <div className="relative pt-6 pb-4 px-4 flex flex-col items-center text-center -mt-8 backdrop-blur-none border-t border-stone-800/50">
                <div className="absolute -top-7">
                    <LeagueBadge league={league} hideText />
                </div>

                <div className="w-full mt-2">
                    <h3 className="text-white font-black leading-none uppercase tracking-wide truncate shadow-black"
                        style={{ fontSize: 'clamp(1rem, 2vw, 1.4rem)', textShadow: '0 2px 5px rgba(0,0,0,0.8)' }}>
                        {student.firstName}
                    </h3>
                    <h3 className="text-stone-400 font-bold leading-tight text-[11px] uppercase tracking-widest mt-1 truncate">
                        {student.lastName}
                    </h3>
                </div>

                <div className="flex items-center gap-1 mt-2 bg-stone-900/80 px-2 py-1 rounded border border-stone-800 w-auto justify-center">
                    <Zap size={12} className="text-amber-500" />
                    <span className="text-amber-400 font-black text-[11px] tracking-widest">{(student.total_xp ?? 0).toLocaleString()}</span>
                </div>
            </div>
        </motion.div>
    );
};

const TeamRevealScreen: React.FC<{ students: StudentProfile[]; grade: number }> = ({ students, grade }) => {
    // Determine dynamic grid sizing
    const count = students.length;
    let cols = 3;
    let rows = 1;

    if (count <= 3) { cols = count; rows = 1; }
    else if (count <= 4) { cols = 4; rows = 1; }
    else if (count <= 6) { cols = 3; rows = 2; }
    else if (count <= 8) { cols = 4; rows = 2; }
    else if (count <= 10) { cols = 5; rows = 2; }
    else if (count <= 12) { cols = 6; rows = 2; }
    else if (count <= 15) { cols = 5; rows = 3; }
    else { cols = Math.ceil(Math.sqrt(count * 1.5)); rows = Math.ceil(count / cols); }

    const gradeLabel = grade === 12 ? 'Group 3' : `Grade ${grade}`;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col h-full w-full relative z-10 pb-16"
        >
            {/* Header */}
            <div className="text-center pt-6 pb-4 shrink-0">
                <motion.p
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="text-amber-500/60 text-xs font-black uppercase tracking-[0.4em] mb-1"
                >
                    Interschool Spelling Bee
                </motion.p>
                <div className="flex items-center justify-center gap-6">
                    <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-px bg-gradient-to-r from-transparent to-amber-500/50 w-32 origin-right" />
                    <motion.h2
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.3, type: "spring", bounce: 0.5 }}
                        className="font-sans font-black text-white italic tracking-tighter uppercase"
                        style={{
                            fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                            textShadow: '0 0 40px rgba(245,158,11,0.5)',
                            animation: 'pulseGlow 3s ease-in-out infinite',
                        }}
                    >
                        {gradeLabel}
                    </motion.h2>
                    <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} className="h-px bg-gradient-to-l from-transparent to-amber-500/50 w-32 origin-left" />
                </div>
            </div>

            {/* Dynamic Flex Layout Instead of Grid */}
            <div className="flex-1 px-8 pb-8 flex items-center justify-center outline-none">
                <div className="flex flex-wrap items-center justify-center content-center gap-6 lg:gap-8 w-full max-w-[1600px] mx-auto h-full overflow-y-auto pt-4">
                    {students.map((s, i) => (
                        <TeamRevealCard key={s.id} student={s} index={i} total={students.length} />
                    ))}
                </div>
            </div>
        </motion.div>
    );
};

// ─── MODE 4: Spotlight (Cinematic Hero Presentation) ──────────────────────────
const SpotlightScreen: React.FC<{ student: StudentProfile }> = ({ student }) => {
    const league = getLeague(student.total_xp ?? 0);
    const meta = LEAGUE_META[league];
    const gradeLabel = student.grade === 12 ? 'Group 3' : `Grade ${student.grade}`;

    return (
        <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex h-full w-full items-center justify-center relative overflow-hidden bg-stone-950 pb-16 z-10"
        >
            {/* Background elements */}
            <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, transparent 10px, transparent 20px)'
            }} />

            {/* Split Screen Backdrop */}
            <motion.div
                initial={{ x: '100%' }} animate={{ x: 0 }} transition={{ type: 'spring', damping: 30, stiffness: 100 }}
                className="absolute top-0 bottom-0 left-1/3 right-0 transform skew-x-[-15deg] bg-stone-900 shadow-2xl"
                style={{ borderLeft: `16px solid ${meta.cardGlow.replace(/[\d.]+\)$/, '0.6)')}` }}
            />

            {/* Huge League Glow */}
            <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity }}
                className={`absolute top-1/2 left-2/3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px] w-[800px] h-[800px] ${meta.glowClass}`}
            />

            {/* Gigantic Ghost Text */}
            <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 0.05 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="absolute right-0 top-1/2 -translate-y-1/2 font-black italic uppercase select-none pointer-events-none whitespace-nowrap"
                style={{ fontSize: '25vw', lineHeight: 0.8, color: "white" }}
            >
                {student.firstName || "BEES"}
            </motion.div>

            <div className="relative z-10 w-full max-w-7xl mx-auto flex items-center h-[85vh] px-12 pt-8">
                {/* Profile Photo Panel */}
                <motion.div
                    initial={{ x: -100, opacity: 0, rotateY: 30 }}
                    animate={{ x: 0, opacity: 1, rotateY: 0 }}
                    transition={{ type: 'spring', bounce: 0.4, duration: 1, delay: 0.2 }}
                    className="w-5/12 h-full relative z-20"
                    style={{ perspective: 1000 }}
                >
                    <div className="absolute inset-0 bg-stone-900 border-2 border-stone-700 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.8)] transform -rotate-[3deg]">
                        {student.photo ? (
                            <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover object-top scale-105" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-stone-700 bg-stone-950 font-black"
                                style={{ fontSize: '10rem' }}>
                                {student.firstName?.[0]}
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-transparent to-transparent opacity-80" />

                        {/* Frame Border Glow */}
                        <div className="absolute inset-0 ring-4 ring-inset shadow-inner" style={{ borderColor: meta.cardGlow, opacity: 0.5 }} />
                    </div>
                </motion.div>

                {/* Information Panel */}
                <div className="w-7/12 pl-16 z-30 flex flex-col justify-center">
                    {/* Badge */}
                    <motion.div
                        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
                        className="inline-flex items-center gap-3 bg-stone-950 border border-stone-800 px-6 py-2 shadow-xl mb-6 self-start transform -rotate-1 rounded-lg"
                    >
                        <span className="text-amber-500 font-black uppercase tracking-[0.2em] text-sm">{gradeLabel}</span>
                        <span className="w-1.5 h-1.5 bg-stone-600 rounded-full" />
                        <span className="text-stone-300 font-bold uppercase tracking-wider text-sm">{student.school}</span>
                    </motion.div>

                    {/* Identifying Information */}
                    <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }}>
                        <h1 className="font-sans font-black text-white italic leading-[0.85] uppercase tracking-tighter" style={{
                            fontSize: 'clamp(4rem, 7vw, 6rem)',
                            textShadow: '4px 4px 0px rgba(0,0,0,0.8)'
                        }}>
                            {student.firstName}
                        </h1>
                        <h2 className="font-sans font-black text-stone-500 italic uppercase tracking-widest mt-2 bg-clip-text" style={{ fontSize: 'clamp(2rem, 3.5vw, 2.8rem)' }}>
                            {student.lastName}
                        </h2>
                    </motion.div>

                    {/* Stats Module */}
                    <motion.div
                        initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.7 }}
                        className="flex items-center gap-8 mt-12 bg-stone-950/80 p-6 rounded-2xl border border-stone-800/80 backdrop-blur-md shadow-2xl"
                    >
                        <div className="transform scale-[1.3] origin-center px-4">
                            <LeagueBadge league={league} hideText={false} />
                        </div>
                        <div className="w-px h-16 bg-stone-800" />
                        <div className="flex flex-col flex-1 pl-4">
                            <div className="flex justify-between items-end mb-1">
                                <span className="text-stone-500 font-black uppercase tracking-[0.3em] text-xs flex items-center gap-2">
                                    <Zap size={14} className="text-amber-500" /> Total XP Earned
                                </span>
                            </div>
                            <span className="text-white font-black italic tracking-wider text-5xl leading-none" style={{ textShadow: `0 0 15px ${meta.cardGlow}` }}>
                                {(student.total_xp ?? 0).toLocaleString()}
                            </span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const LiveEventDisplay: React.FC<LiveEventDisplayProps> = ({ initialStudents }) => {
    const [mode, setMode] = useState<DisplayMode>('standby');
    const [leaderboardStudents, setLeaderboardStudents] = useState<RankedStudent[]>(() =>
        initialStudents ? toRanked(initialStudents) : []
    );
    const [teamStudents, setTeamStudents] = useState<StudentProfile[]>([]);
    const [teamGrade, setTeamGrade] = useState<number>(1);
    const [spotlightStudent, setSpotlightStudent] = useState<StudentProfile | null>(null);
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);
    const [loading, setLoading] = useState(false);
    const [showTop, setShowTop] = useState(10);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const styleInjected = useRef(false);
    const autoRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Inject CSS animations once
    useEffect(() => {
        if (styleInjected.current) return;
        styleInjected.current = true;
        const id = 'live-event-animations';
        if (!document.getElementById(id)) {
            const tag = document.createElement('style');
            tag.id = id;
            tag.textContent = CSS_ANIMATIONS;
            document.head.appendChild(tag);
        }
    }, []);

    // Load Data (Sponsors + Leaderboard)
    useEffect(() => {
        fetchSponsors().then(setSponsors).catch(console.error);
    }, []);

    const loadLeaderboard = useCallback(async () => {
        setLoading(true);
        try {
            const raw = await fetchLeaderboard();
            setLeaderboardStudents(toRanked(raw));
            setLastRefresh(new Date());
        } catch (err) {
            console.error('LiveEventDisplay: failed to fetch leaderboard', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Auto-refresh leaderboard every 30s
    useEffect(() => {
        if (mode === 'leaderboard') {
            loadLeaderboard();
            autoRefreshRef.current = setInterval(loadLeaderboard, 30_000);
        } else {
            if (autoRefreshRef.current) { clearInterval(autoRefreshRef.current); autoRefreshRef.current = null; }
        }
        return () => { if (autoRefreshRef.current) clearInterval(autoRefreshRef.current); };
    }, [mode, loadLeaderboard]);

    // Listen for commands from admin tab via BroadcastChannel
    useLiveChannel((cmd: LiveCommand) => {
        switch (cmd.type) {
            case 'standby':
                setMode('standby');
                break;
            case 'leaderboard':
                setMode('leaderboard');
                break;
            case 'team-reveal':
                setTeamStudents(cmd.students);
                setTeamGrade(cmd.grade);
                setMode('team-reveal');
                break;
            case 'spotlight':
                setSpotlightStudent(cmd.student);
                setMode('spotlight');
                break;
        }
    });

    const displayedLeaderboard = leaderboardStudents.slice(0, showTop);

    return (
        <div className="relative min-h-screen w-full overflow-hidden bg-stone-950 flex flex-col font-sans">
            <HoneycombBg />
            <ScanlineOverlay />
            <div className="absolute pointer-events-none" style={{
                inset: 0,
                background: 'radial-gradient(ellipse 80% 60% at 50% 110%, rgba(245,158,11,0.06) 0%, transparent 70%)',
            }} />

            {/* ── Floating control bar (visible on the projector for manual override) ── */}
            <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-stone-900/80 backdrop-blur border border-amber-500/20 rounded-xl px-3 py-2"
                style={{ boxShadow: '0 0 20px rgba(0,0,0,0.6)' }}>
                {(['standby', 'leaderboard'] as const).map(m => (
                    <button key={m} onClick={() => setMode(m)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all capitalize ${mode === m ? 'bg-amber-500 text-stone-900' : 'text-stone-500 hover:text-stone-300'}`}>
                        {m}
                    </button>
                ))}
                {mode === 'leaderboard' && (
                    <>
                        <div className="w-px h-4 bg-stone-700 mx-1" />
                        <span className="text-stone-600 text-xs font-bold">Top</span>
                        {[5, 10, 25].map(n => (
                            <button key={n} onClick={() => setShowTop(n)}
                                className={`w-8 h-8 rounded-md text-xs font-black transition-all ${showTop === n ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50' : 'text-stone-600 hover:text-stone-400'}`}>
                                {n}
                            </button>
                        ))}
                    </>
                )}
            </div>

            {/* ── Content ── */}
            <div className="relative z-10 flex-1 flex">
                <AnimatePresence mode="wait">
                    {mode === 'standby' && <StandbyScreen key="standby" />}
                    {mode === 'leaderboard' && <LiveLeaderboard key="leaderboard" students={displayedLeaderboard} onRefresh={loadLeaderboard} loading={loading} lastRefresh={lastRefresh} />}
                    {mode === 'team-reveal' && <TeamRevealScreen key="team" students={teamStudents} grade={teamGrade} />}
                    {mode === 'spotlight' && spotlightStudent && <SpotlightScreen key={`spotlight-${spotlightStudent.id}`} student={spotlightStudent} />}
                </AnimatePresence>
            </div>

            {/* Global Sponsors Ticker */}
            <LiveSponsors sponsors={sponsors} />
        </div>
    );
};
