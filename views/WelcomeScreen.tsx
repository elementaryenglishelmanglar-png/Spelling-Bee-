import React, { useState } from 'react';
import { UserCheck, Sparkles, GraduationCap, BookOpen, ArrowLeft, Lock, User, School as SchoolIcon } from 'lucide-react';
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
        // Keeping 'teacher' as internal role string for now to minimize refactoring
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

  // Generic Login Screen for both Admin and School
  if (loginMode) {
    const isSchool = loginMode === 'school';
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-200/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-200/50 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md relative z-10">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back</span>
          </button>

          <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-stone-100">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 ${isSchool ? 'bg-blue-600 text-white' : 'bg-stone-800 text-yellow-400'}`}>
              {isSchool ? <SchoolIcon size={32} /> : <UserCheck size={32} />}
            </div>
            <h2 className="text-2xl font-bold text-stone-800 text-center mb-2">
              {isSchool ? 'Invited School Login' : 'Administrator Login'}
            </h2>
            <p className="text-stone-500 text-center text-sm mb-6">
              Enter your credentials to access the portal.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 outline-none transition-all ${isSchool ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400'}`}
                    placeholder="Username"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 outline-none transition-all ${isSchool ? 'focus:ring-2 focus:ring-blue-500 focus:border-blue-500' : 'focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400'}`}
                    placeholder="Password"
                    autoComplete="current-password"
                  />
                </div>
              </div>
              {error && (
                <p className="text-red-600 text-sm font-medium" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 rounded-xl font-bold transition-colors ${isSchool ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-stone-800 text-yellow-400 hover:bg-stone-900'} ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {loading ? 'Verifying...' : 'Login'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Main Role Selection Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-white flex flex-col items-center justify-between p-4 font-sans relative overflow-x-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-200/50 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-200/50 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-6xl w-full relative z-10 flex-1 flex flex-col justify-center">
        <div className="text-center mb-12 flex flex-col items-center">
          {beeImageUrl ? (
            <div className="mb-6 relative">
              <img
                src={beeImageUrl}
                alt="Spelling Bee Mascot"
                className="w-48 h-48 md:w-56 md:h-56 object-contain animate-bounce-slow drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                style={{ animationDuration: '3s' }}
              />
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/10 rounded-[100%] blur-md"></div>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center p-6 bg-white rounded-full shadow-xl mb-6 border-4 border-yellow-400">
              <BookOpen size={48} className="text-stone-800" />
            </div>
          )}

          <h1 className="text-4xl md:text-6xl font-black text-stone-900 mb-4 tracking-tight drop-shadow-sm">
            Spelling Bee <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">Manager</span>
          </h1>
          <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto font-medium">
            The ultimate platform for champions.
          </p>
        </div>

        <div className="text-center text-stone-400 mb-8 mt-4 text-sm font-medium tracking-wide uppercase animate-fade-in">
          Select a profile to continue
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-12">
          {/* Admin Card */}
          <button
            onClick={() => setLoginMode('admin')}
            className="group relative bg-white p-6 rounded-3xl shadow-xl border-2 border-stone-100 hover:border-stone-800 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 text-left overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <UserCheck size={100} className="text-stone-800" />
            </div>
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-14 h-14 bg-stone-800 text-yellow-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <UserCheck size={28} />
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2">Administrator</h2>
              <p className="text-stone-500 text-sm leading-relaxed group-hover:text-stone-600 flex-1">
                Manage word lists, run official contests, and oversee all schools.
              </p>
            </div>
          </button>

          {/* Invited School Card */}
          <button
            onClick={() => setLoginMode('school')}
            className="group relative bg-white p-6 rounded-3xl shadow-xl border-2 border-stone-100 hover:border-blue-600 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 text-left overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-blue-600">
              <SchoolIcon size={100} />
            </div>
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <SchoolIcon size={28} />
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2">Invited School</h2>
              <p className="text-stone-500 text-sm leading-relaxed group-hover:text-stone-600 flex-1">
                Register delegation students, view progress, and access event documents.
              </p>
            </div>
          </button>

          {/* Student Card */}
          <button
            onClick={() => onSelectRole('student')}
            className="group relative bg-white p-6 rounded-3xl shadow-xl border-2 border-stone-100 hover:border-yellow-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 text-left overflow-hidden flex flex-col h-full"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity text-yellow-500">
              <GraduationCap size={100} />
            </div>
            <div className="relative z-10 flex-1 flex flex-col">
              <div className="w-14 h-14 bg-yellow-400 text-stone-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Sparkles size={28} />
              </div>
              <h2 className="text-xl font-bold text-stone-800 mb-2">Student</h2>
              <p className="text-stone-500 text-sm leading-relaxed group-hover:text-stone-600 flex-1">
                Practice vocabulary, listen to pronunciations, and test your skills.
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Sponsors Footer */}
      <WelcomeSponsors />
    </div>
  );
};

// Internal component for Sponsors display
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
        <div className="flex items-center justify-center gap-3 mb-3 opacity-60">
          <span className="h-px bg-stone-400 w-12"></span>
          <h3 className="text-[10px] sm:text-xs font-black text-stone-500 uppercase tracking-widest">Proudly Supported By</h3>
          <span className="h-px bg-stone-400 w-12"></span>
        </div>

        <div className="flex flex-wrap justify-center items-center gap-6 md:gap-10 pb-4">
          {sponsors.map(s => (
            <a
              key={s.id}
              href={s.websiteUrl || '#'}
              target={s.websiteUrl ? "_blank" : "_self"}
              rel="noreferrer"
              className="group transition-transform hover:scale-110 duration-300 opacity-70 hover:opacity-100 grayscale hover:grayscale-0"
              title={s.name}
            >
              <img
                src={s.logoUrl}
                alt={s.name}
                className={`object-contain transition-all duration-300 drop-shadow-sm ${s.tier === 'Gold' ? 'h-10 md:h-14' :
                  s.tier === 'Silver' ? 'h-8 md:h-10' :
                    'h-6 md:h-8'
                  }`}
              />
            </a>
          ))}
        </div>

        <p className="text-center text-[10px] text-stone-300 uppercase tracking-widest font-medium">
          © {new Date().getFullYear()} Official Spelling Bee Platform
        </p>
      </div>
    </div>
  );
};
