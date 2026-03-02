import React, { useState, useEffect, useCallback } from 'react';
import { StudentProfile, GradeLevel } from '../types';
import { fetchStudents, fetchSchools } from '../services/supabaseData';
import { sendLiveCommand } from '../lib/liveChannel';
import { Monitor, Users, Zap, LayoutGrid, Radio, UserCheck, RefreshCw, Tv, Star, ChevronRight } from 'lucide-react';
import { LeagueBadge, LEAGUE_META } from './LiveEventDisplay';

// ─── Grade config ──────────────────────────────────────────────────────────────
const GRADE_BUTTONS: { value: number; label: string }[] = [
    { value: 12, label: 'G3' },
    ...Array.from({ length: 11 }, (_, i) => ({ value: i + 1, label: `G${i + 1}` })),
];

// ─── Student mini-card in the roster ─────────────────────────────────────────
const StudentCard: React.FC<{
    student: StudentProfile;
    isSpotlit: boolean;
    onSpotlight: () => void;
}> = ({ student, isSpotlit, onSpotlight }) => {
    // Determine league text (fallback to Paper if xp missing or not a known league)
    const xp = student.total_xp ?? 0;
    let leagueText: keyof typeof LEAGUE_META = 'Paper';
    if (xp >= 100000) leagueText = 'Diamond';
    else if (xp >= 50000) leagueText = 'Platinum';
    else if (xp >= 20000) leagueText = 'Gold';
    else if (xp >= 5000) leagueText = 'Bronze';
    else if (xp >= 1000) leagueText = 'Iron';

    const meta = LEAGUE_META[leagueText];
    return (
        <div
            className={`
                group relative flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer
                ${isSpotlit
                    ? 'bg-amber-500/20 border-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.4)]'
                    : 'bg-stone-800/60 border-stone-700 hover:border-amber-500/50 hover:bg-stone-800'}
            `}
            onClick={onSpotlight}
            title={`Spotlight ${student.firstName} ${student.lastName}`}
        >
            {/* Photo */}
            <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-stone-600 bg-stone-700">
                {student.photo ? (
                    <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-amber-400 font-black text-lg">
                        {student.firstName?.[0]}
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">
                    {student.firstName} {student.lastName}
                </p>
                <p className="text-stone-400 text-xs truncate">{student.school}</p>
                <div className="flex items-center gap-2 mt-1">
                    <div className="scale-75 origin-left">
                        <LeagueBadge league={leagueText} hideText />
                    </div>
                    <p className={`text-xs font-bold ${meta.iconClass}`}>
                        {(student.total_xp ?? 0).toLocaleString()} XP
                    </p>
                </div>
            </div>

            {/* Spotlight indicator */}
            {isSpotlit ? (
                <Tv size={16} className="text-amber-400 shrink-0 animate-pulse" />
            ) : (
                <ChevronRight size={16} className="text-stone-600 shrink-0 group-hover:text-amber-500 transition-colors" />
            )}
        </div>
    );
};

// ─── Mode button ──────────────────────────────────────────────────────────────
const ModeButton: React.FC<{
    active: boolean;
    icon: React.ReactNode;
    label: string;
    sublabel: string;
    color: string;
    onClick: () => void;
}> = ({ active, icon, label, sublabel, color, onClick }) => (
    <button
        onClick={onClick}
        className={`
            flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-bold transition-all
            ${active
                ? `${color} scale-105 shadow-lg`
                : 'border-stone-700 bg-stone-800/50 text-stone-400 hover:border-stone-500 hover:text-stone-300'}
        `}
    >
        <span className="text-2xl">{icon}</span>
        <span className="text-sm font-black leading-tight">{label}</span>
        <span className="text-[10px] font-normal opacity-70 leading-tight text-center">{sublabel}</span>
    </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const LiveEventControls: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
    const [allStudents, setAllStudents] = useState<StudentProfile[]>([]);
    const [schoolIds, setSchoolIds] = useState<Set<string>>(new Set());
    const [schoolNames, setSchoolNames] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
    const [spotlitStudent, setSpotlitStudent] = useState<StudentProfile | null>(null);
    const [activeMode, setActiveMode] = useState<'standby' | 'leaderboard' | 'team-reveal' | 'spotlight'>('standby');
    const [projectorOpen, setProjectorOpen] = useState(false);

    // Load students and schools on mount
    useEffect(() => {
        const load = async () => {
            setLoading(true);
            try {
                const [students, schools] = await Promise.all([fetchStudents(), fetchSchools()]);
                setAllStudents(students);
                setSchoolIds(new Set(schools.map(s => s.id)));
                setSchoolNames(new Set(schools.map(s => s.name)));
            } catch (e) {
                console.error('LiveEventControls: failed to load', e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Check if projector tab is open via ping-pong
    useEffect(() => {
        const checkProjector = () => {
            try {
                const ch = new BroadcastChannel('spelling-bee-live');
                // If we can open a channel, assume it might be open
                // A real pong check would need the display to respond
                ch.close();
                setProjectorOpen(true); // optimistic
            } catch { setProjectorOpen(false); }
        };
        checkProjector();
    }, []);

    // Interschool students for the selected grade
    const gradeStudents = selectedGrade !== null
        ? allStudents.filter(s =>
            s.grade === selectedGrade &&
            (!!s.schoolId || schoolNames.has(s.school ?? ''))
        )
        : [];

    // ── Commands ──────────────────────────────────────────────────────────────
    const sendStandby = () => {
        sendLiveCommand({ type: 'standby' });
        setActiveMode('standby');
        setSpotlitStudent(null);
    };

    const sendLeaderboard = () => {
        sendLiveCommand({ type: 'leaderboard' });
        setActiveMode('leaderboard');
        setSpotlitStudent(null);
    };

    const sendTeamReveal = useCallback(() => {
        if (selectedGrade === null || gradeStudents.length === 0) return;
        sendLiveCommand({ type: 'team-reveal', students: gradeStudents, grade: selectedGrade });
        setActiveMode('team-reveal');
        setSpotlitStudent(null);
    }, [selectedGrade, gradeStudents]);

    const sendSpotlight = useCallback((student: StudentProfile) => {
        sendLiveCommand({ type: 'spotlight', student });
        setActiveMode('spotlight');
        setSpotlitStudent(student);
    }, []);

    const launchProjector = () => {
        const url = `${window.location.origin}${window.location.pathname}?live=1`;
        window.open(url, '_blank', 'noopener,noreferrer');
        setProjectorOpen(true);
    };

    return (
        <div className="min-h-screen bg-stone-950 text-white font-sans flex flex-col">
            {/* ── Top bar ── */}
            <div className="bg-stone-900 border-b border-stone-800 px-6 py-4 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-600 rounded-xl shadow-lg shadow-rose-900/50">
                        <Radio size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-white font-black text-lg leading-tight">Live Event Remote Control</h1>
                        <p className="text-stone-500 text-xs">4th Interschool Spelling Bee Manglar</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Back to dashboard */}
                    {onBack && (
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold text-stone-400 hover:text-stone-100 hover:bg-stone-800/50 transition-all"
                        >
                            ← Dashboard
                        </button>
                    )}

                    {/* Projector status */}
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${projectorOpen
                        ? 'bg-green-900/40 border-green-700 text-green-400'
                        : 'bg-stone-800 border-stone-700 text-stone-500'
                        }`}>
                        {projectorOpen
                            ? <><span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" /> Projector ready</>
                            : <><span className="w-2 h-2 bg-stone-600 rounded-full" /> No projector</>
                        }
                    </div>

                    {/* Launch button */}
                    <button
                        onClick={launchProjector}
                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition-all shadow-lg"
                    >
                        <Monitor size={16} />
                        {projectorOpen ? 'New Projector Tab' : 'Launch Projector'}
                    </button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* ── Left panel: Mode control ── */}
                <div className="w-72 shrink-0 bg-stone-900/60 border-r border-stone-800 flex flex-col p-5 gap-5 overflow-y-auto">
                    <div>
                        <p className="text-stone-500 text-[10px] font-black uppercase tracking-widest mb-3">Display Mode</p>
                        <div className="grid grid-cols-2 gap-2">
                            <ModeButton
                                active={activeMode === 'standby'}
                                icon="🐝"
                                label="Standby"
                                sublabel="Bee + event title"
                                color="border-amber-500 bg-amber-500/10 text-amber-400"
                                onClick={sendStandby}
                            />
                            <ModeButton
                                active={activeMode === 'leaderboard'}
                                icon="🏆"
                                label="Leaderboard"
                                sublabel="Global XP ranking"
                                color="border-blue-500 bg-blue-500/10 text-blue-400"
                                onClick={sendLeaderboard}
                            />
                        </div>

                        <button
                            onClick={sendTeamReveal}
                            disabled={selectedGrade === null || gradeStudents.length === 0}
                            className={`
                                w-full mt-2 flex items-center justify-between gap-3 px-4 py-4 rounded-2xl border-2 font-bold transition-all
                                ${activeMode === 'team-reveal'
                                    ? 'border-rose-500 bg-rose-500/10 text-rose-300 shadow-lg'
                                    : 'border-stone-700 bg-stone-800/50 text-stone-400 hover:border-rose-500/50 hover:text-rose-400'}
                                disabled:opacity-40 disabled:cursor-not-allowed
                            `}
                        >
                            <span className="flex items-center gap-2">
                                <LayoutGrid size={20} />
                                <span>
                                    <span className="block text-sm font-black">Team Reveal</span>
                                    <span className="text-[10px] font-normal opacity-70">LoL loading screen</span>
                                </span>
                            </span>
                            {selectedGrade !== null && gradeStudents.length > 0 && (
                                <span className="text-xs bg-rose-600 text-white px-2 py-1 rounded-full font-black">
                                    {gradeStudents.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Current spotlight */}
                    {activeMode === 'spotlight' && spotlitStudent && (
                        <div className="bg-amber-500/10 border border-amber-500/40 rounded-xl p-4">
                            <p className="text-amber-400/70 text-[10px] font-black uppercase tracking-widest mb-2">On screen now</p>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-700 border border-amber-500/50 shrink-0">
                                    {spotlitStudent.photo
                                        ? <img src={spotlitStudent.photo} alt="" className="w-full h-full object-cover" />
                                        : <div className="w-full h-full flex items-center justify-center text-amber-400 font-black">{spotlitStudent.firstName?.[0]}</div>
                                    }
                                </div>
                                <div className="min-w-0">
                                    <p className="text-white font-black text-sm truncate leading-tight">{spotlitStudent.firstName} {spotlitStudent.lastName}</p>
                                    <p className="text-stone-400 text-xs truncate">{spotlitStudent.school}</p>
                                </div>
                                <Tv size={16} className="text-amber-400 shrink-0 animate-pulse" />
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Right panel: Grade + Student roster ── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Grade selector */}
                    <div className="bg-stone-900/40 border-b border-stone-800 px-6 py-4 shrink-0">
                        <div className="flex items-center gap-3 mb-3">
                            <Users size={16} className="text-stone-400" />
                            <p className="text-stone-400 text-xs font-black uppercase tracking-widest">Select competing grade</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {GRADE_BUTTONS.map(({ value, label }) => {
                                const count = allStudents.filter(s =>
                                    s.grade === value && (!!s.schoolId || schoolNames.has(s.school ?? ''))
                                ).length;
                                return (
                                    <button
                                        key={value}
                                        onClick={() => setSelectedGrade(value)}
                                        disabled={count === 0}
                                        className={`
                                            relative px-4 py-2 rounded-xl text-sm font-bold transition-all border
                                            ${selectedGrade === value
                                                ? 'bg-amber-500 text-stone-900 border-amber-500 shadow-lg shadow-amber-900/30 scale-105'
                                                : count === 0
                                                    ? 'bg-stone-900 border-stone-800 text-stone-700 cursor-not-allowed'
                                                    : 'bg-stone-800 border-stone-700 text-stone-300 hover:border-amber-500/50 hover:text-amber-400'}
                                        `}
                                    >
                                        {label}
                                        {count > 0 && (
                                            <span className={`ml-1.5 text-[10px] font-black ${selectedGrade === value ? 'text-stone-700' : 'text-stone-500'}`}>
                                                {count}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Student roster */}
                    <div className="flex-1 overflow-y-auto px-6 py-5">
                        {loading ? (
                            <div className="flex items-center justify-center h-full gap-3 text-stone-500">
                                <RefreshCw size={20} className="animate-spin" />
                                <span className="text-sm">Loading students…</span>
                            </div>
                        ) : selectedGrade === null ? (
                            <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                <div className="w-16 h-16 bg-stone-800 rounded-2xl flex items-center justify-center">
                                    <Users size={28} className="text-stone-600" />
                                </div>
                                <div>
                                    <p className="text-stone-400 font-bold">Select a grade above</p>
                                    <p className="text-stone-600 text-sm mt-1">to see the IV Edition competitors</p>
                                </div>
                            </div>
                        ) : gradeStudents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-600">
                                <UserCheck size={40} className="opacity-30" />
                                <p className="text-sm">No interschool students registered for this grade</p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-black text-lg">
                                            {selectedGrade === 12 ? 'Group 3' : `Grade ${selectedGrade}`}
                                        </span>
                                        <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                                            {gradeStudents.length} competitors
                                        </span>
                                    </div>
                                    <button
                                        onClick={sendTeamReveal}
                                        className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs transition-all shadow-md"
                                    >
                                        <LayoutGrid size={14} />
                                        Show All on Screen
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                    {gradeStudents.map(student => (
                                        <StudentCard
                                            key={student.id}
                                            student={student}
                                            isSpotlit={spotlitStudent?.id === student.id && activeMode === 'spotlight'}
                                            onSpotlight={() => sendSpotlight(student)}
                                        />
                                    ))}
                                </div>

                                <p className="text-stone-700 text-xs text-center mt-6">
                                    Tap a student card to spotlight them on the projector
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
