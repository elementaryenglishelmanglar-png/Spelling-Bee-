import React, { useEffect, useState } from 'react';
import { StudentProfile, Achievement } from '../types';
import { Trophy, Flame, Star, Medal, Crown, Target, Zap, BookOpen, Award } from 'lucide-react';
import { fetchStudentAchievements, fetchLeaderboard } from '../services/supabaseData';

interface StudentDashboardProps {
    student: StudentProfile;
    onStartPractice: (mode: 'generator' | 'drill') => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onStartPractice }) => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [rank, setRank] = useState<number | null>(null);

    useEffect(() => {
        loadDashboardData();
    }, [student.id]);

    const loadDashboardData = async () => {
        try {
            // Load achievements
            const earned = await fetchStudentAchievements(student.id);
            setAchievements(earned);

            // Load rank (this is a bit heavy, in a real app we might optimize this)
            const leaderboard = await fetchLeaderboard(student.grade);
            const studentRank = leaderboard.findIndex(s => s.id === student.id) + 1;
            setRank(studentRank > 0 ? studentRank : null);
        } catch (error) {
            console.error("Error loading dashboard data", error);
        }
    };

    // --- Rank Logic ---
    const calculateRankTitle = (xp: number) => {
        if (xp >= 7001) return { title: "Master of Letters", color: "text-purple-600", icon: Crown };
        if (xp >= 3001) return { title: "Vocabulary Knight", color: "text-red-600", icon: Zap };
        if (xp >= 1001) return { title: "Word Explorer", color: "text-blue-600", icon: Target };
        return { title: "Novice Speller", color: "text-green-600", icon: BookOpen };
    };

    const getNextLevelXP = (xp: number) => {
        if (xp >= 7001) return 10000; // Cap
        if (xp >= 3001) return 7001;
        if (xp >= 1001) return 3001;
        return 1001;
    };

    const currentXP = student.total_xp || 0;
    const { title: rankTitle, color: rankColor, icon: RankIcon } = calculateRankTitle(currentXP);
    const nextLevelXP = getNextLevelXP(currentXP);
    const progressPercent = Math.min((currentXP / nextLevelXP) * 100, 100);
    const xpToNext = Math.max(0, nextLevelXP - currentXP);

    // --- Badges Config ---
    const allBadges = [
        { key: 'first_win', name: 'First Victory', icon: Star, description: 'Complete your first session' },
        { key: 'streak_3', name: 'On Fire', icon: Flame, description: '3 Day Streak' },
        { key: 'xp_1000', name: 'Kilo Speller', icon: Zap, description: 'Earn 1000 XP' },
        { key: 'perfect_round', name: 'Perfectionist', icon: Target, description: '100% Correct in a session' },
        { key: 'champion', name: 'Champion', icon: Trophy, description: 'Reach #1 in Leaderboard' },
        { key: 'master', name: 'The Master', icon: Crown, description: 'Reach Master Level' },
    ];

    return (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in p-4 mb-20">

            {/* Header */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-full bg-stone-100 border-2 border-stone-200 overflow-hidden shadow-inner">
                        {student.photo ? (
                            <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-stone-300">
                                {student.firstName[0]}
                            </div>
                        )}
                    </div>
                    <div className="text-center md:text-left">
                        <h1 className="text-2xl font-bold text-stone-800">Hello, <span className="text-yellow-500">{student.firstName}</span>!</h1>
                        <p className="text-stone-500">Ready to spell today?</p>
                        <div className={`flex items-center gap-2 mt-1 font-bold ${rankColor}`}>
                            <RankIcon size={16} /> {rankTitle}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => onStartPractice('generator')}
                        className="px-6 py-3 bg-yellow-400 hover:bg-yellow-300 text-stone-900 rounded-xl font-bold transition-all shadow-md active:scale-95"
                    >
                        Practice
                    </button>
                    <button
                        onClick={() => onStartPractice('drill')}
                        className="px-6 py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95"
                    >
                        Exercises
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* Progress Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10"><Trophy size={120} /></div>
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold opacity-90 mb-1">Your Progress</h3>
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-4xl font-black">{currentXP.toLocaleString()}</span>
                            <span className="text-sm font-bold opacity-70 mb-2">XP earned</span>
                        </div>

                        <div className="mb-2 flex justify-between text-xs font-bold opacity-80">
                            <span>Current Level</span>
                            <span>{xpToNext} XP to next level</span>
                        </div>
                        <div className="h-4 bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                            <div
                                className="h-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-1000 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            ></div>
                        </div>
                    </div>
                </div>

                {/* Streak & Rank */}
                <div className="space-y-6">
                    <div className="bg-orange-500 rounded-3xl p-6 text-white shadow-lg flex items-center justify-between relative overflow-hidden">
                        <div className="absolute -left-4 -bottom-4 opacity-20"><Flame size={100} /></div>
                        <div className="relative z-10">
                            <h3 className="text-lg font-bold opacity-90">Daily Streak</h3>
                            <div className="text-4xl font-black">{student.current_streak || 0} <span className="text-lg">Days</span></div>
                        </div>
                        <Flame size={40} className="text-orange-200 animate-pulse" />
                    </div>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-stone-400 uppercase">Class Rank</h3>
                            <div className="text-3xl font-black text-stone-800">#{rank || '-'}</div>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                            <Medal size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Badges Grid */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
                <h3 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                    <Award className="text-yellow-500" /> Achievements
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {allBadges.map(badge => {
                        const isUnlocked = achievements.some(a => a.badgeKey === badge.key);
                        const BadgeIcon = badge.icon;

                        return (
                            <div
                                key={badge.key}
                                className={`p-4 rounded-2xl border text-center transition-all ${isUnlocked
                                    ? 'bg-yellow-50 border-yellow-200 shadow-sm scale-100'
                                    : 'bg-stone-50 border-stone-100 grayscale opacity-60'
                                    }`}
                            >
                                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3 ${isUnlocked ? 'bg-yellow-100 text-yellow-600' : 'bg-stone-200 text-stone-400'
                                    }`}>
                                    <BadgeIcon size={24} />
                                </div>
                                <h4 className="font-bold text-sm text-stone-800 mb-1 leading-tight">{badge.name}</h4>
                                <p className="text-[10px] text-stone-500 leading-tight">{badge.description}</p>
                            </div>
                        );
                    })}
                </div>
            </div>

        </div>
    );
};
