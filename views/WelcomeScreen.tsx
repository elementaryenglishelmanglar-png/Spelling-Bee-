import React, { useState } from 'react';
import { UserCheck, Sparkles, GraduationCap, BookOpen, ArrowLeft, Lock, User, School as SchoolIcon } from 'lucide-react';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Role } from '../types';
import { validateTeacherCredentials, setTeacherSession, setSchoolSession } from '../lib/auth';
import { validateSchoolLogin } from '../services/supabaseData';

interface WelcomeScreenProps {
  onSelectRole: (role: Role) => void;
  beeImageUrl?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectRole, beeImageUrl }) => {
  const [loginMode, setLoginMode] = useState<'admin' | 'school' | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = username.trim();
    const pass = password;

    if (!user || !pass) {
      setError('Please enter username and password.');
      return;
    }

    setLoading(true);

    try {
      if (loginMode === 'admin') {
        if (validateTeacherCredentials(user, pass)) {
          setTeacherSession();
          onSelectRole('teacher');
        } else {
          setError('Invalid administrator credentials.');
        }
      } else if (loginMode === 'school') {
        const school = await validateSchoolLogin(user, pass);
        if (school) {
          setSchoolSession(school);
          onSelectRole('school');
        } else {
          setError('Invalid school credentials.');
        }
      }
    } catch (e) {
      console.error(e);
      setError('An error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setLoginMode(null);
    setUsername('');
    setPassword('');
    setError('');
  };

  // ── Login Screen ──────────────────────────────────────────────────────────────
  if (loginMode) {
    const isSchool = loginMode === 'school';
    return (
      <div className="honeycomb-bg min-h-screen bg-stone-50 flex items-center justify-center p-4 font-sans">
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-stone-400 hover:text-amber-600 mb-8 transition-colors font-medium"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>

          {/* Card */}
          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl border border-stone-200/60 relative overflow-hidden">
            {/* Top decorative accent */}
            {!isSchool && <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600"></div>}

            {/* Icon */}
            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg
                ${isSchool
                  ? 'bg-blue-600 text-white shadow-blue-600/20'
                  : 'bg-stone-900 text-amber-500 shadow-amber-500/10'
                }`}
            >
              {isSchool ? <SchoolIcon size={32} /> : <UserCheck size={32} />}
            </div>

            {/* Heading — Playfair Display via font-serif */}
            <h2 className={`text-2xl sm:text-3xl font-black text-stone-900 text-center mb-2 tracking-tight ${!isSchool ? 'font-serif' : ''}`}>
              {isSchool ? 'Invited School Login' : 'Administrator Login'}
            </h2>
            <p className="text-stone-500 text-center text-sm mb-8 font-sans font-medium">
              Enter your credentials to securely access the portal.
            </p>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Username */}
              <div className="group">
                <label htmlFor="username" className="block text-sm font-bold text-stone-700 mb-1.5 transition-colors group-focus-within:text-amber-600">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-stone-200 outline-none transition-all
                      focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-stone-50 hover:border-stone-300 font-medium text-stone-800"
                    placeholder="Username"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div className="group">
                <label htmlFor="password" className="block text-sm font-bold text-stone-700 mb-1.5 transition-colors group-focus-within:text-amber-600">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 group-focus-within:text-amber-500 transition-colors" size={18} />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-stone-200 outline-none transition-all
                      focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-stone-50 hover:border-stone-300 font-medium text-stone-800"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg flex items-center gap-2 animate-fade-in text-rose-600">
                  <div className="shrink-0 w-1.5 h-1.5 rounded-full bg-rose-500"></div>
                  <p className="text-sm font-bold" role="alert">
                    {error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-xl font-bold transition-all duration-200 shadow-md flex items-center justify-center gap-2
                  ${isSchool
                    ? 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg active:scale-[0.98]'
                    : 'bg-stone-900 text-amber-500 hover:bg-stone-800 hover:text-amber-400 hover:shadow-xl active:scale-[0.98]'}
                  ${loading ? 'opacity-80 cursor-not-allowed hidden-text' : ''}`}
              >
                {loading ? (
                  <LoadingSpinner size={20} className="!gap-0" />
                ) : (
                  'Secure Login'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── Main Role Selection Screen ────────────────────────────────────────────────
  return (
    <div className="honeycomb-bg min-h-screen bg-stone-50 flex flex-col items-center justify-between p-4 font-sans overflow-x-hidden">

      <div className="max-w-6xl w-full flex-1 flex flex-col justify-center">

        {/* ── Hero Section ── */}
        <div className="text-center mb-12 flex flex-col items-center">
          {beeImageUrl ? (
            <div className="mb-6 relative">
              <img
                src={beeImageUrl}
                alt="Spelling Bee Mascot"
                className="w-48 h-48 md:w-56 md:h-56 object-contain animate-bounce-slow drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                style={{ animationDuration: '3s' }}
              />
              {/* Ground shadow */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/10 rounded-[100%] blur-md"></div>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center p-6 bg-white rounded-full shadow-lg mb-6 border-2 border-amber-300">
              <BookOpen size={48} className="text-stone-800" />
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-black text-stone-900 mb-4 tracking-tight">
            Spelling Bee{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-amber-600">
              Manglar 2026
            </span>
          </h1>
          <p className="text-lg md:text-xl text-stone-500 max-w-2xl mx-auto font-medium font-sans">
            Welcome to the 4th Edition
          </p>

          {/* Decorative amber rule */}
          <div className="mt-6 flex items-center gap-3">
            <span className="h-px w-16 bg-amber-300"></span>
            <span className="text-amber-500 text-lg">✦</span>
            <span className="h-px w-16 bg-amber-300"></span>
          </div>
        </div>

        {/* ── Profile Prompt ── */}
        <div className="text-center text-stone-400 mb-8 mt-2 text-xs font-medium tracking-widest uppercase animate-fade-in">
          Select a profile to continue
        </div>

        {/* ── Role Cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">

          {/* Administrator Card */}
          <button
            onClick={() => setLoginMode('admin')}
            className="group relative bg-white p-6 rounded-3xl shadow-md border border-stone-200
              hover:border-amber-500 hover:shadow-xl hover:-translate-y-2
              transition-all duration-300 text-left overflow-hidden flex flex-col h-full"
          >
            {/* Ghost icon */}
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <UserCheck size={100} className="text-stone-900" />
            </div>

            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-14 h-14 bg-stone-900 text-amber-400 rounded-2xl flex items-center justify-center mb-6
                group-hover:scale-110 transition-transform shadow-md">
                <UserCheck size={28} />
              </div>
              {/* h2 → Playfair Display automatically */}
              <h2 className="text-xl font-bold text-stone-900 mb-2">Administrator</h2>
              <p className="text-stone-500 text-sm leading-relaxed group-hover:text-stone-600 flex-1 font-sans">
                Manage word lists, run official contests, and oversee all schools.
              </p>
            </div>

            {/* Amber accent bottom bar */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600
              translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-b-3xl"></div>
          </button>

          {/* Invited School Card */}
          <button
            onClick={() => setLoginMode('school')}
            className="group relative bg-white p-6 rounded-3xl shadow-md border border-stone-200
              hover:border-amber-500 hover:shadow-xl hover:-translate-y-2
              transition-all duration-300 text-left overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <SchoolIcon size={100} className="text-blue-600" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6
                group-hover:scale-110 transition-transform shadow-md">
                <SchoolIcon size={28} />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">Invited School</h2>
              <p className="text-stone-500 text-sm leading-relaxed group-hover:text-stone-600 flex-1 font-sans">
                Register delegation students, view progress, and access event documents.
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600
              translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-b-3xl"></div>
          </button>

          {/* Student Card */}
          <button
            onClick={() => onSelectRole('student')}
            className="group relative bg-white p-6 rounded-3xl shadow-md border border-stone-200
              hover:border-amber-500 hover:shadow-xl hover:-translate-y-2
              transition-all duration-300 text-left overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <GraduationCap size={100} className="text-amber-500" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-14 h-14 bg-amber-400 text-stone-900 rounded-2xl flex items-center justify-center mb-6
                group-hover:scale-110 transition-transform shadow-md">
                <Sparkles size={28} />
              </div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">Student</h2>
              <p className="text-stone-500 text-sm leading-relaxed group-hover:text-stone-600 flex-1 font-sans">
                Practice vocabulary, listen to pronunciations, and test your skills.
              </p>
            </div>
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 to-amber-600
              translate-y-1 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 rounded-b-3xl"></div>
          </button>

        </div>
      </div>

      {/* ── Sponsors Footer ── */}
      <WelcomeSponsors />
    </div>
  );
};

// ── Internal Sponsors Component ───────────────────────────────────────────────
import { Sponsor } from '../types';
import { fetchSponsors } from '../services/supabaseData';
import { useEffect as useEffectReact } from 'react';

const WelcomeSponsors: React.FC = () => {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  useEffectReact(() => {
    fetchSponsors().then(setSponsors).catch(console.error);
  }, []);

  if (sponsors.length === 0) return null;

  return (
    <div className="w-full animate-fade-in z-20 mt-8 md:absolute md:bottom-4 md:left-0">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center justify-center gap-3 mb-3 opacity-50">
          <span className="h-px bg-stone-300 w-12"></span>
          <h3 className="text-[10px] sm:text-xs font-bold text-stone-400 uppercase tracking-widest font-sans">
            Proudly Supported By
          </h3>
          <span className="h-px bg-stone-300 w-12"></span>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 pb-4">
          {sponsors.map(s => (
            <a
              key={s.id}
              href={s.websiteUrl || '#'}
              target={s.websiteUrl ? '_blank' : '_self'}
              rel="noreferrer"
              className="group transition-transform hover:scale-110 duration-300 opacity-60 hover:opacity-100 grayscale hover:grayscale-0"
              title={s.name}
            >
              <img
                src={s.logoUrl}
                alt={s.name}
                className={`object-contain transition-all duration-300 drop-shadow-sm
                  ${s.tier === 'Gold' ? 'h-10 md:h-14' :
                    s.tier === 'Silver' ? 'h-8 md:h-10' :
                      'h-6 md:h-8'}`}
              />
            </a>
          ))}
        </div>

        <p className="text-center text-[10px] text-stone-300 uppercase tracking-widest font-medium font-sans">
          © {new Date().getFullYear()} Official Spelling Bee Platform
        </p>
      </div>
    </div>
  );
};
