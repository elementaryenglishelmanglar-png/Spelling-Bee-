import React, { useEffect, useState } from 'react';
import { StudentProfile, Achievement, ShopItem, InventoryItem, Vendor, Sponsor } from '../types';
import { fetchStudentAchievements, fetchLeaderboard, purchaseItem, fetchStudentInventory, isSupabaseConfigured, fetchVendors, fetchSponsors, checkAndUnlockAchievements, fetchStudentWordStats } from '../services/supabaseData';
import { Trophy, Flame, Star, Medal, Crown, Target, Zap, BookOpen, Award, ShoppingBag, Coins, Heart, Shield, Sparkles, Lock, CheckCircle, Pen } from 'lucide-react';

interface StudentDashboardProps {
    student: StudentProfile;
    onStartPractice: (mode: 'generator' | 'drill') => void;
    onRefreshStudent?: () => void;
}

const SHOP_ITEMS: ShopItem[] = [
    {
        id: 'streak_freeze',
        name: 'Streak Freeze',
        description: 'Protect your streak for one missed day. Used automatically.',
        cost: 50,
        icon: Flame
    },
    {
        id: 'streak_shield',
        name: 'Streak Shield',
        description: 'Budget streak protector. Shields one missed day.',
        cost: 30,
        icon: Shield
    },
    {
        id: 'extra_life',
        name: 'Extra Life',
        description: 'Restore 3 lives during a game when you run out.',
        cost: 40,
        icon: Heart
    },
    {
        id: 'double_coins',
        name: 'Double Coins',
        description: 'Earn 2x BeeCoins for your next 10 correct answers.',
        cost: 80,
        icon: Coins
    },
    {
        id: 'double_xp',
        name: 'Double XP Potion',
        description: 'Earn 2x XP for the next 30 minutes.',
        cost: 100,
        icon: Zap
    },
];

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ student, onStartPractice, onRefreshStudent }) => {
    const [achievements, setAchievements] = useState<Achievement[]>([]);
    const [rank, setRank] = useState<number | null>(null);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [purchasing, setPurchasing] = useState<string | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [sponsors, setSponsors] = useState<Sponsor[]>([]);

    // Force re-render on coin update if necessary, though simpler to rely on parent passing fresh student
    // For now we assume student prop is fresh or we don't handle real-time coin updates without refresh.

    useEffect(() => {
        loadDashboardData();
        if (onRefreshStudent) onRefreshStudent();
    }, [student.id]);

    const loadDashboardData = async () => {
        try {
            // Load rank first — needed for achievement context
            const leaderboard = await fetchLeaderboard(student.grade);
            const studentRank = leaderboard.findIndex(s => s.id === student.id) + 1;
            setRank(studentRank > 0 ? studentRank : null);

            // Load Inventory
            const inv = await fetchStudentInventory(student.id);
            setInventory(inv);

            // Calculate total correct
            const stats = await fetchStudentWordStats(student.id);
            const totalCorrectAnswers = stats.filter((s: any) => s.is_correct).length;

            // Auto-grant any achievements the student qualifies for but hasn't received yet.
            // This fixes existing high-XP students whose badges were never saved.
            await checkAndUnlockAchievements(student.id, {
                totalXp: student.total_xp ?? 0,
                currentStreak: student.current_streak ?? 0,
                leaderboardRank: studentRank > 0 ? studentRank : 99999,
                totalCorrectAnswers,
                coinsBalance: student.coins ?? 0,
                inventoryItemCount: inv.length,
            });

            // Now load the (freshly updated) achievements
            const earned = await fetchStudentAchievements(student.id);
            setAchievements(earned);



            // Load Vendors and Sponsors
            const v = await fetchVendors();
            setVendors(v);
            const s = await fetchSponsors();
            setSponsors(s);
        } catch (error) {
            console.error('Error loading dashboard data', error);
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
                // Refresh student data so coin balance updates in the header
                if (onRefreshStudent) onRefreshStudent();
                alert(`¡Compra exitosa! Ahora tienes "${item.name}" en tu inventario.`);
            } else {
                alert('Compra fallida. Es posible que no tengas suficientes BeeCoins o que haya un error. Intenta de nuevo.');
            }
        } catch (e) {
            console.error('Purchase error', e);
            alert('Hubo un error al procesar la compra. Intenta de nuevo.');
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
        // Milestone
        { key: 'first_win',       name: 'First Victory',    icon: Star,      description: 'Get your first correct answer',        color: 'amber'  },

        // Streaks
        { key: 'streak_3',        name: 'On Fire',           icon: Flame,     description: 'Maintain a 3-day streak',               color: 'orange' },
        { key: 'streak_7',        name: 'Week Warrior',      icon: Flame,     description: 'Maintain a 7-day streak',               color: 'orange' },
        { key: 'streak_14',       name: 'Unstoppable',       icon: Flame,     description: 'Maintain a 14-day streak',              color: 'orange' },
        { key: 'streak_30',       name: 'Legend Streak',     icon: Flame,     description: 'Maintain a 30-day streak',              color: 'red'    },
        { key: 'streak_60',       name: 'Iron Will',         icon: Flame,     description: 'Maintain a 60-day streak',              color: 'red'    },
        { key: 'streak_100',      name: 'Century Club',      icon: Flame,     description: 'Maintain a 100-day streak',             color: 'rose'   },

        // XP Tiers
        { key: 'xp_100',          name: 'First Steps',       icon: Zap,       description: 'Earn 100 XP',                           color: 'blue'   },
        { key: 'xp_500',          name: 'Rising Star',       icon: Zap,       description: 'Earn 500 XP',                           color: 'blue'   },
        { key: 'xp_1000',         name: 'Kilo Speller',      icon: Zap,       description: 'Earn 1,000 XP',                         color: 'blue'   },
        { key: 'xp_2500',         name: 'XP Hoarder',        icon: Zap,       description: 'Earn 2,500 XP',                         color: 'blue'   },
        { key: 'xp_5000',         name: 'Mega Speller',      icon: Zap,       description: 'Earn 5,000 XP',                         color: 'indigo' },
        { key: 'xp_10000',        name: 'Grand Master XP',   icon: Zap,       description: 'Earn 10,000 XP',                        color: 'purple' },
        { key: 'xp_15000',        name: 'Spellcaster',       icon: Zap,       description: 'Earn 15,000 XP',                        color: 'purple' },
        { key: 'xp_25000',        name: 'XP Titan',          icon: Zap,       description: 'Earn 25,000 XP',                        color: 'purple' },
        { key: 'xp_50000',        name: 'XP God',            icon: Zap,       description: 'Earn 50,000 XP',                        color: 'pink'   },

        // In-Session Streaks
        { key: 'hotstreak_10',    name: 'Heating Up',        icon: Target,    description: '10 correct answers in a row',           color: 'green'  },
        { key: 'perfect_round',   name: 'Perfectionist',     icon: Target,    description: '20 correct answers in a row',           color: 'green'  },
        { key: 'hotstreak_30',    name: 'Laser Focus',       icon: Target,    description: '30 correct answers in a row',           color: 'emerald'},
        { key: 'hotstreak_50',    name: 'Unbreakable',       icon: Target,    description: '50 correct answers in a row',           color: 'emerald'},

        // Speed
        { key: 'speed_demon',     name: 'Speed Demon',       icon: Zap,       description: 'Answer correctly in under 3 seconds',   color: 'yellow' },

        // Total Correct Answers
        { key: 'correct_50',      name: 'Word Finder',       icon: BookOpen,  description: '50 total correct words',                color: 'teal'   },
        { key: 'correct_200',     name: 'Vocab Builder',     icon: BookOpen,  description: '200 total correct words',               color: 'teal'   },
        { key: 'correct_500',     name: 'Dictionary Mind',   icon: BookOpen,  description: '500 total correct words',               color: 'teal'   },
        { key: 'correct_1000',    name: 'Lexicon Master',    icon: BookOpen,  description: '1,000 total correct words',             color: 'cyan'   },
        { key: 'correct_2500',    name: 'Walking Thesaurus', icon: BookOpen,  description: '2,500 total correct words',             color: 'cyan'   },

        // Rank
        { key: 'top_5',           name: 'Top 5 Finisher',    icon: Medal,     description: 'Reach top 5 on the leaderboard',        color: 'gold'   },
        { key: 'top_3',           name: 'Podium Finisher',   icon: Medal,     description: 'Reach top 3 on the leaderboard',        color: 'gold'   },
        { key: 'champion',        name: 'Champion',          icon: Trophy,    description: 'Reach #1 on the leaderboard',           color: 'gold'   },

        // Economy
        { key: 'coins_100',       name: 'Bee Saver',         icon: Coins,     description: 'Accumulate 100 BeeCoins',               color: 'lime'   },
        { key: 'coins_500',       name: 'Bee Tycoon',        icon: Coins,     description: 'Accumulate 500 BeeCoins',               color: 'lime'   },
        { key: 'first_purchase',  name: 'First Purchase',    icon: ShoppingBag,description: 'Buy your first item from the shop',    color: 'amber'  },
        { key: 'collector',       name: 'The Collector',     icon: ShoppingBag,description: 'Own 3 or more items simultaneously',   color: 'amber'  },

        // Prestige
        { key: 'master',          name: 'The Master',        icon: Crown,     description: 'Reach Master rank (7,001+ XP)',         color: 'purple' },
    ];

    // Color palette for unlocked badge cards
    const badgeColors: Record<string, { bg: string; ring: string; icon: string; glow: string }> = {
        amber:  { bg: 'bg-amber-50',   ring: 'ring-amber-400',   icon: 'text-amber-500',  glow: '0 0 18px rgba(251,191,36,0.55)'  },
        orange: { bg: 'bg-orange-50',  ring: 'ring-orange-400',  icon: 'text-orange-500', glow: '0 0 18px rgba(249,115,22,0.5)'   },
        red:    { bg: 'bg-red-50',     ring: 'ring-red-400',     icon: 'text-red-500',    glow: '0 0 18px rgba(239,68,68,0.5)'    },
        rose:   { bg: 'bg-rose-50',    ring: 'ring-rose-400',    icon: 'text-rose-500',   glow: '0 0 18px rgba(244,63,94,0.5)'    },
        blue:   { bg: 'bg-blue-50',    ring: 'ring-blue-400',    icon: 'text-blue-500',   glow: '0 0 18px rgba(59,130,246,0.5)'   },
        indigo: { bg: 'bg-indigo-50',  ring: 'ring-indigo-400',  icon: 'text-indigo-500', glow: '0 0 18px rgba(99,102,241,0.5)'   },
        purple: { bg: 'bg-purple-50',  ring: 'ring-purple-400',  icon: 'text-purple-500', glow: '0 0 20px rgba(168,85,247,0.6)'   },
        pink:   { bg: 'bg-pink-50',    ring: 'ring-pink-400',    icon: 'text-pink-500',   glow: '0 0 18px rgba(236,72,153,0.5)'   },
        green:  { bg: 'bg-green-50',   ring: 'ring-green-400',   icon: 'text-green-500',  glow: '0 0 18px rgba(34,197,94,0.5)'    },
        emerald:{ bg: 'bg-emerald-50', ring: 'ring-emerald-400', icon: 'text-emerald-500',glow: '0 0 18px rgba(16,185,129,0.5)'   },
        teal:   { bg: 'bg-teal-50',    ring: 'ring-teal-400',    icon: 'text-teal-500',   glow: '0 0 18px rgba(20,184,166,0.5)'   },
        cyan:   { bg: 'bg-cyan-50',    ring: 'ring-cyan-400',    icon: 'text-cyan-500',   glow: '0 0 18px rgba(6,182,212,0.5)'    },
        yellow: { bg: 'bg-yellow-50',  ring: 'ring-yellow-400',  icon: 'text-yellow-500', glow: '0 0 18px rgba(234,179,8,0.5)'    },
        lime:   { bg: 'bg-lime-50',    ring: 'ring-lime-400',    icon: 'text-lime-500',   glow: '0 0 18px rgba(132,204,22,0.5)'   },
        gold:   { bg: 'bg-amber-50',   ring: 'ring-amber-500',   icon: 'text-amber-600',  glow: '0 0 22px rgba(217,119,6,0.7)'    },
    };

    return (
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 animate-fade-in p-3 sm:p-4 mb-20">

            {/* Header */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-sm border border-stone-200 flex flex-col gap-5">
                {/* Student info row */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-stone-100 border-2 border-stone-200 overflow-hidden shadow-inner shrink-0">
                        {student.photo ? (
                            <img src={student.photo} alt={student.firstName} className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-stone-300">
                                {student.firstName[0]}
                            </div>
                        )}
                    </div>
                    <div className="text-left flex-1">
                        <h1 className="text-xl sm:text-2xl font-bold text-stone-900">Hello, <span className="text-amber-500">{student.firstName}</span>!</h1>
                        <p className="text-sm text-stone-500">Ready to spell today?</p>
                        <div className={`flex items-center gap-2 mt-1 font-bold text-sm ${rankColor}`}>
                            <RankIcon size={16} /> {rankTitle}
                        </div>
                    </div>
                    {/* BeeCoins badge */}
                    <div className="bg-amber-50 px-3 py-2 rounded-xl border border-amber-200 flex flex-col items-center shrink-0">
                        <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wide">Balance</span>
                        <span className="font-black text-amber-700 text-sm whitespace-nowrap">{student.coins ?? 0} 🐝</span>
                    </div>
                </div>

                {/* CTA Buttons — w-full, unified amber primary style */}
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => onStartPractice('generator')}
                        className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-stone-900 rounded-2xl font-bold transition-all shadow-md text-sm flex items-center justify-center gap-2"
                    >
                        <BookOpen size={18} /> Practice
                    </button>
                    <button
                        onClick={() => onStartPractice('drill')}
                        className="w-full py-3.5 bg-stone-900 hover:bg-stone-800 active:scale-[0.98] text-amber-400 rounded-2xl font-bold transition-all shadow-md text-sm flex items-center justify-center gap-2"
                    >
                        <Target size={18} /> Exercises
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">

                {/* Progress Card — dark premium */}
                <div className="md:col-span-2 bg-stone-900 rounded-3xl p-4 sm:p-6 text-white shadow-lg relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Trophy size={120} /></div>
                    <div className="relative z-10">
                        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Your Progress</h3>
                        <div className="flex items-end gap-2 mb-5">
                            <span className="text-3xl sm:text-4xl font-black text-white">{currentXP.toLocaleString()}</span>
                            <span className="text-xs sm:text-sm font-semibold text-stone-400 mb-1.5">XP earned</span>
                        </div>

                        <div className="mb-2 flex justify-between text-xs font-bold text-stone-500">
                            <span>{rankTitle}</span>
                            <span className="text-amber-400">{xpToNext} XP to next</span>
                        </div>
                        {/* Progress bar — amber-500 with glow */}
                        <div className="relative h-3 bg-stone-700 rounded-full overflow-hidden">
                            <div
                                className="absolute top-0 left-0 h-full bg-amber-500 transition-all duration-1000 ease-out rounded-full"
                                style={{
                                    width: `${progressPercent}%`,
                                    boxShadow: '0 0 12px rgba(245,158,11,0.6), 0 0 4px rgba(245,158,11,0.4)'
                                }}
                            />
                        </div>
                        {/* Milestone dots */}
                        <div className="relative h-0 mt-1">
                            {[25, 50, 75].map(pct => (
                                <div
                                    key={pct}
                                    className="absolute -top-4 -translate-x-1/2"
                                    style={{ left: `${pct}%` }}
                                >
                                    <div className={`w-2 h-2 rounded-full border ${progressPercent >= pct
                                            ? 'bg-amber-400 border-amber-300'
                                            : 'bg-stone-600 border-stone-500'
                                        }`} />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Streak & Rank */}
                <div className="space-y-4 sm:space-y-6">
                    {/* Streak Card — clean white */}
                    <div className="bg-white rounded-3xl p-4 sm:p-6 border border-stone-200 shadow-sm flex items-center justify-between">
                        <div>
                            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-1">Daily Streak</h3>
                            <div className="text-3xl sm:text-4xl font-black text-stone-900">
                                {student.current_streak || 0}
                                <span className="text-base sm:text-lg font-semibold text-stone-400 ml-1">Days</span>
                            </div>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center">
                            <Flame
                                size={30}
                                className="text-amber-500"
                                style={{ filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.5))' }}
                            />
                        </div>
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
                        <span className="ml-auto text-xs font-semibold text-stone-400">{achievements.length}/{allBadges.length} unlocked</span>
                    </h3>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        {allBadges.map(badge => {
                            const isUnlocked = achievements.some(a => a.badgeKey === badge.key);
                            const BadgeIcon = badge.icon;
                            const palette = badgeColors[badge.color] ?? badgeColors['amber'];

                            return (
                                <div
                                    key={badge.key}
                                    className={`p-3 rounded-2xl border-2 text-center transition-all duration-300 relative overflow-hidden ${
                                        isUnlocked
                                            ? `${palette.bg} border-transparent ring-2 ${palette.ring}`
                                            : 'bg-stone-50 border-stone-100 grayscale opacity-50'
                                    }`}
                                    style={isUnlocked ? { boxShadow: palette.glow } : {}}
                                >
                                    {/* Shine overlay for unlocked */}
                                    {isUnlocked && (
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none rounded-2xl" />
                                    )}
                                    <div className={`w-10 h-10 mx-auto rounded-full flex items-center justify-center mb-2 relative z-10 ${
                                        isUnlocked ? `bg-white shadow-md ${palette.icon}` : 'bg-stone-200 text-stone-400'
                                    }`}>
                                        <BadgeIcon size={20} />
                                    </div>
                                    <h4 className={`font-bold text-xs mb-0.5 leading-tight relative z-10 ${
                                        isUnlocked ? 'text-stone-900' : 'text-stone-400'
                                    }`}>{badge.name}</h4>
                                    <p className={`text-[10px] leading-tight relative z-10 ${
                                        isUnlocked ? 'text-stone-500' : 'text-stone-400'
                                    }`}>{badge.description}</p>
                                    {isUnlocked && (
                                        <CheckCircle size={12} className={`absolute top-2 right-2 ${palette.icon} opacity-80`} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>



        </div>
    );
};

