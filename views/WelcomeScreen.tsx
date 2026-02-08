import React, { useState } from 'react';
import { UserCheck, Sparkles, GraduationCap, BookOpen, ArrowLeft, Lock, User } from 'lucide-react';
import { Role } from '../types';
import { validateTeacherCredentials, setTeacherSession } from '../lib/auth';

interface WelcomeScreenProps {
  onSelectRole: (role: Role) => void;
  beeImageUrl?: string;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onSelectRole, beeImageUrl }) => {
  const [showTeacherLogin, setShowTeacherLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const user = username.trim();
    const pass = password;
    if (!user || !pass) {
      setError('Ingresa usuario y contraseña.');
      return;
    }
    if (validateTeacherCredentials(user, pass)) {
      setTeacherSession();
      onSelectRole('teacher');
    } else {
      setError('Usuario o contraseña incorrectos.');
    }
  };

  const handleBackToRoles = () => {
    setShowTeacherLogin(false);
    setUsername('');
    setPassword('');
    setError('');
  };

  // Pantalla de login para Teacher / Coordinador
  if (showTeacherLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-200/50 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-200/50 rounded-full blur-3xl"></div>

        <div className="w-full max-w-md relative z-10">
          <button
            type="button"
            onClick={handleBackToRoles}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-800 mb-8 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Volver</span>
          </button>

          <div className="bg-white p-8 rounded-3xl shadow-xl border-2 border-stone-100">
            <div className="w-16 h-16 bg-stone-800 text-yellow-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <UserCheck size={32} />
            </div>
            <h2 className="text-2xl font-bold text-stone-800 text-center mb-2">Teacher & Coordinator</h2>
            <p className="text-stone-500 text-center text-sm mb-6">
              Inicia sesión con tu usuario y contraseña.
            </p>

            <form onSubmit={handleTeacherLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-stone-700 mb-1">
                  Usuario
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                    placeholder="Usuario"
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-stone-200 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 outline-none transition-all"
                    placeholder="Contraseña"
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
                className="w-full py-3 rounded-xl bg-stone-800 text-yellow-400 font-bold hover:bg-stone-900 transition-colors"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Pantalla principal: elegir rol
  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-100 via-orange-50 to-white flex items-center justify-center p-4 font-sans relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-yellow-200/50 rounded-full blur-3xl"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-orange-200/50 rounded-full blur-3xl"></div>

      <div className="max-w-4xl w-full relative z-10">
        <div className="text-center mb-12 flex flex-col items-center">
          {beeImageUrl ? (
            <div className="mb-6 relative">
                 <img 
                    src={beeImageUrl} 
                    alt="Spelling Bee Mascot" 
                    className="w-48 h-48 md:w-64 md:h-64 object-contain animate-bounce-slow drop-shadow-2xl hover:scale-105 transition-transform duration-500"
                    style={{ animationDuration: '3s' }}
                 />
                 <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/10 rounded-[100%] blur-md"></div>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center p-6 bg-white rounded-full shadow-xl mb-6 border-4 border-yellow-400">
                <BookOpen size={48} className="text-stone-800" />
            </div>
          )}
          
          <h1 className="text-5xl md:text-7xl font-black text-stone-900 mb-4 tracking-tight drop-shadow-sm">
            Spelling Bee <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-orange-500">Manager</span>
          </h1>
          <p className="text-xl md:text-2xl text-stone-600 max-w-2xl mx-auto font-medium">
            The ultimate platform for champions. <br/>Manage contests or practice at home!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Teacher Card */}
          <button
            onClick={() => setShowTeacherLogin(true)}
            className="group relative bg-white p-8 rounded-3xl shadow-xl border-2 border-stone-100 hover:border-stone-800 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <UserCheck size={120} className="text-stone-800" />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-stone-800 text-yellow-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <UserCheck size={32} />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">Teacher & Coordinator</h2>
              <p className="text-stone-500 leading-relaxed group-hover:text-stone-600">
                Manage word lists, run official spelling bee sessions, record student attempts, and view history logs.
              </p>
            </div>
          </button>

          {/* Student Card */}
          <button
            onClick={() => onSelectRole('student')}
            className="group relative bg-white p-8 rounded-3xl shadow-xl border-2 border-stone-100 hover:border-yellow-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 text-left overflow-hidden"
          >
             <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity text-yellow-500">
              <GraduationCap size={120} />
            </div>
            <div className="relative z-10">
              <div className="w-16 h-16 bg-yellow-400 text-stone-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                <Sparkles size={32} />
              </div>
              <h2 className="text-2xl font-bold text-stone-800 mb-2">Student & Family</h2>
              <p className="text-stone-500 leading-relaxed group-hover:text-stone-600">
                Practice vocabulary with flashcards, listen to pronunciations, and test your skills with spelling drills.
              </p>
            </div>
          </button>
        </div>
        
        <p className="text-center text-stone-400 mt-12 text-sm font-medium tracking-wide uppercase">
          Select a profile to continue
        </p>
      </div>
    </div>
  );
};
