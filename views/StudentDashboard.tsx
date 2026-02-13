import React, { useEffect, useState } from 'react';
import { StudentProfile, Achievement, ShopItem, InventoryItem } from '../types';
import { Trophy, Flame, Star, Medal, Crown, Target, Zap, BookOpen, Award, ShoppingBag, Lock, Unlock, Coins } from 'lucide-react';
import { fetchStudentAchievements, fetchLeaderboard, purchaseItem, fetchStudentInventory, isSupabaseConfigured } from '../services/supabaseData';

interface StudentDashboardProps {
    student: StudentProfile;
    onStartPractice: (mode: 'generator' | 'drill') => void;
    onRefreshStudent?: () => void;
}

const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'streak_freeze',
        name: 'Streak Freeze',
        description: 'Protect your streak for one missed day.',
        cost: 50,
        icon: Flame
    },
    {
        id: 'double_xp',
        name: 'Double XP Potion',
        description: 'Earn 2x XP for the next 30 minutes.',
        cost: 100,
        icon: Zap
    }
];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onStartPractice, onRefreshStudent }) => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [rank, setRank] = useState<number | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [purchasing, setPurchasing] = useState<string | null>(null);

    // Force re-render on coin update if necessary, though simpler to rely on parent passing fresh student
    // For now we assume student prop is fresh or we don't handle real-time coin updates without refresh.

    useEffect(() => {
        loadDashboardData();
        if (onRefreshStudent) onRefreshStudent();
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

            // Load Inventory
            const inv = await fetchStudentInventory(student.id);
            setInventory(inv);
        } catch (error) {
            console.error("Error loading dashboard data", error);
        }
    };

    const handlePurchase = async (item: ShopItem) => {
        if ((student.coins || 0) < item.cost) return;
        setPurchasing(item.id);
        try {
            const success = await purchaseItem(student.id, item.id, item.cost);
            if (success) {
                // Determine new quantity
                const existing = inventory.find(i => i.itemId === item.id);
                if (existing) {
                    setInventory(inv => inv.map(i => i.itemId === item.id ? { ...i, quantity: i.quantity + 1 } : i));
                } else {
                    setInventory(inv => [...inv, { id: 'temp', studentId: student.id, itemId: item.id, quantity: 1, purchasedAt: new Date().toISOString() }]);
                }
                // Ideally trigger a refresh of student data to update coins UI
                alert(`Purchased ${item.name}!`);
            } else {
                alert("Purchase failed. Try again.");
            }
        } catch (e) {
            console.error("Purchase error", e);
        } finally {
            setPurchasing(null);
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
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in p-3 sm:p-4 mb-20">

            {/* Header */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-stone-200 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-stone-100 border-2 border-stone-200 overflow-hidden shadow-inner shrink-0">
                        {student.photo ? (
                            <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-stone-300">
                                {student.firstName[0]}
                            </div>
                        )}
                    </div>
                    <div className="text-left">
                        <h1 className="text-xl sm:text-2xl font-bold text-stone-800">Hello, <span className="text-yellow-500">{student.firstName}</span>!</h1>
                        <p className="text-sm sm:text-base text-stone-500">Ready to spell today?</p>
                        <div className={`flex items-center gap-2 mt-1 font-bold text-sm ${rankColor}`}>
                            <RankIcon size={16} /> {rankTitle}
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap justify-center sm:justify-end gap-3 w-full md:w-auto">
                    <div className="bg-yellow-100 px-3 py-2 sm:px-4 sm:py-2 rounded-xl border border-yellow-200 flex items-center">
                        <span className="text-[10px] sm:text-xs font-bold text-yellow-700 uppercase mr-2">Balance</span>
                        <span className="font-black text-yellow-800 text-base sm:text-lg whitespace-nowrap">{student.coins ?? 0} BeeCoins</span>
                    </div>

                    <button
                        onClick={() => onStartPractice('generator')}
                        className="px-4 py-2 sm:px-6 sm:py-3 bg-yellow-400 hover:bg-yellow-300 text-stone-900 rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm sm:text-base flex-1 sm:flex-none"
                    >
                        Practice
                    </button>
                    <button
                        onClick={() => onStartPractice('drill')}
                        className="px-4 py-2 sm:px-6 sm:py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl font-bold transition-all shadow-md active:scale-95 text-sm sm:text-base flex-1 sm:flex-none"
                    >
                        Exercises
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">

                {/* Progress Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-4 sm:p-6 text-white shadow-lg relative overflow-visible">
                    <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><Trophy size={100} className="sm:w-[120px] sm:h-[120px]" /></div>
                    <div className="relative z-10">
                        <h3 className="text-base sm:text-lg font-bold opacity-90 mb-1">Your Progress</h3>
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-3xl sm:text-4xl font-black">{currentXP.toLocaleString()}</span>
                            <span className="text-xs sm:text-sm font-bold opacity-70 mb-2">XP earned</span>
                        </div>

                        <div className="mb-2 flex justify-between text-xs font-bold opacity-80">
                            <span>Current Level</span>
                            <span>{xpToNext} XP to next level</span>
                        </div>
                        <div className="relative h-4 bg-black/20 rounded-full backdrop-blur-sm mt-4">
                            <div
                                className="absolute top-0 left-0 h-full bg-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-all duration-1000 ease-out rounded-full"
                                style={{ width: `${progressPercent}%` }}
                            ></div>

                            {/* Milestones / Chests */}
                            {[25, 50, 75, 100].map(pct => (
                                <div key={pct} className="absolute top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center transform hover:scale-125 transition-transform cursor-pointer" style={{ left: `${pct}%`, marginLeft: '-12px' }}>
                                    <div className={`w-3 h-3 sm:w-4 sm:h-4 rounded-sm rotate-45 ${progressPercent >= pct ? 'bg-yellow-300 shadow-glow' : 'bg-stone-600 border border-stone-500'}`}></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Streak & Rank */}
                <div className="space-y-4 sm:space-y-6">
                    <div className="bg-gradient-to-br from-orange-400 to-red-500 rounded-3xl p-4 sm:p-6 text-white shadow-lg flex items-center justify-between relative overflow-hidden group">
                        <div className="absolute -left-4 -bottom-4 opacity-20"><Flame size={80} className="sm:w-[100px] sm:h-[100px]" /></div>
                        <div className="relative z-10">
                            <h3 className="text-base sm:text-lg font-bold opacity-90">Daily Streak</h3>
                            <div className="text-3xl sm:text-4xl font-black">{student.current_streak || 0} <span className="text-base sm:text-lg">Days</span></div>
                        </div>
                        <Flame size={32} className="sm:w-10 sm:h-10 text-yellow-300 animate-pulse drop-shadow-[0_0_8px_rgba(253,224,71,0.8)]" />
                    </div>

                    <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-stone-200 flex items-center justify-between">
                        <div>
                            <h3 className="text-xs sm:text-sm font-bold text-stone-400 uppercase">Class Rank</h3>
                            <div className="text-2xl sm:text-3xl font-black text-stone-800">#{rank || '-'}</div>
                        </div>
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600">
                            <Medal size={20} className="sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                {/* Shop Section */}
                <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-stone-200">
                    <h3 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                        <ShoppingBag className="text-yellow-500" /> Student Shop
                    </h3>
                    <div className="space-y-4">
                        {SHOP_ITEMS.map(item => {
                            const userHas = inventory.find(i => i.itemId === item.id);
                            const canAfford = (student.coins || 0) >= item.cost;
                            const ItemIcon = item.icon;

                            return (
                                <div key={item.id} className="flex items-center gap-4 p-4 rounded-xl border border-stone-100 bg-stone-50 hover:border-yellow-200 transition-colors">
                                    <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center text-stone-400 shadow-sm">
                                        <ItemIcon size={24} className="text-stone-700" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-stone-800">{item.name}</h4>
                                        <p className="text-xs text-stone-500 mb-2">{item.description}</p>
                                        <div className="inline-flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded text-xs font-bold text-yellow-700 border border-yellow-100">
                                            <span>💰</span> {item.cost} BeeCoins
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {userHas ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded mb-1">Owned: {userHas.quantity}</span>
                                                <div className="text-right">
                                                    <p className="text-2xl font-black text-yellow-600 leading-none">
                                                        {student.coins?.toLocaleString() ?? 0}
                                                    </p>
                                                    <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-wider">BeeCoins</p>
                                                </div>
                                                <button
                                                    onClick={() => handlePurchase(item)}
                                                    disabled={!canAfford || purchasing === item.id}
                                                    className="text-xs font-bold text-yellow-600 hover:text-yellow-700 disabled:opacity-50"
                                                >
                                                    Buy Another ({item.cost})
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() => handlePurchase(item)}
                                                disabled={!canAfford || purchasing === item.id}
                                                className={`px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1 ${canAfford
                                                    ? 'bg-yellow-400 text-stone-900 hover:bg-yellow-300 shadow-sm'
                                                    : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                                                    }`}
                                            >
                                                {purchasing === item.id ? '...' : (
                                                    <><Coins size={12} /> {item.cost}</>
                                                )}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Badges Grid */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-stone-200">
                    <h3 className="text-xl font-bold text-stone-800 mb-6 flex items-center gap-2">
                        <Award className="text-yellow-500" /> Achievements
                    </h3>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {allBadges.map(badge => {
                            const isUnlocked = achievements.some(a => a.badgeKey === badge.key);
                            const BadgeIcon = badge.icon;

                            return (
                                <div
                                    key={badge.key}
                                    className={`p-3 rounded-2xl border text-center transition-all ${isUnlocked
                                        ? 'bg-yellow-50 border-yellow-200 shadow-sm scale-100'
                                        : 'bg-stone-50 border-stone-100 grayscale opacity-60'
                                        }`}
                                >
                                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 ${isUnlocked ? 'bg-yellow-100 text-yellow-600' : 'bg-stone-200 text-stone-400'
                                        }`}>
                                        <BadgeIcon size={20} />
                                    </div>
                                    <h4 className="font-bold text-xs text-stone-800 mb-0.5 leading-tight">{badge.name}</h4>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

        </div>
    );
};
