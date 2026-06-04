'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, User, Eye, EyeOff, ShieldCheck, ShieldAlert, UserPlus, LogIn, Ticket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { translations } from '@/lib/translations';

type Mode = 'login' | 'register';

export default function AuthModal() {
  const { login, register, allowRegistration, requireInvite } = useAuth();
  const { settings } = useSettings();
  const t = translations[settings.language];

  const [mode, setMode] = useState<Mode>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isRegister = mode === 'register';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t.credentialsRequired || 'Username and password are required');
      return;
    }
    if (isRegister && requireInvite && !inviteCode.trim()) {
      setError(t.inviteRequired || 'Invitation code is required');
      return;
    }

    setIsLoading(true);
    setError('');

    const result = isRegister
      ? await register(username.trim(), password, inviteCode.trim() || undefined)
      : await login(username.trim(), password);

    if (!result.ok) {
      setError(result.error || (isRegister ? t.registerFailed : t.loginFailed) || 'Failed');
      setIsLoading(false);
    }
    // 成功后 AuthContext 状态变更，page.tsx 会卸载本组件，无需手动收尾。
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'login' ? 'register' : 'login'));
    setError('');
  };

  return (
    <main className="min-h-[100dvh] bg-light-primary flex items-center justify-center p-4 py-[max(1rem,env(safe-area-inset-top))] transition-colors duration-500">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
          className="w-full max-w-md glass-card p-8 rounded-[2rem] ring-1 ring-black/5 dark:ring-white/10 shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl">
              <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                {isRegister ? (t.registerTitle || 'Create account') : (t.loginTitle || 'Sign in')}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {isRegister
                  ? (t.registerDescription || 'Register to start managing your tasks')
                  : (t.loginDescription || 'Sign in to access your tasks')}
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setError('');
                }}
                placeholder={t.usernamePlaceholder || 'Username'}
                autoComplete="username"
                autoFocus
                className="w-full bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl pl-12 pr-4 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder={t.enterPassword || 'Password'}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
                className="w-full bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl pl-12 pr-12 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Invitation code - 仅注册且后端要求邀请码时显示 */}
            {isRegister && requireInvite && (
              <div className="relative">
                <Ticket className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value);
                    setError('');
                  }}
                  placeholder={t.invitePlaceholder || 'Invitation code'}
                  className="w-full bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl pl-12 pr-4 py-4 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                />
              </div>
            )}

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex items-center gap-2 px-4 py-3 bg-red-500/10 dark:bg-red-500/20 rounded-xl"
                >
                  <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">
                    {error}
                  </span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim() || (isRegister && requireInvite && !inviteCode.trim())}
              className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.98] cursor-pointer"
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <ShieldCheck className="w-5 h-5" />
                </motion.div>
              ) : isRegister ? (
                <UserPlus className="w-5 h-5" />
              ) : (
                <LogIn className="w-5 h-5" />
              )}
              <span>
                {isLoading
                  ? (t.verifying || 'Please wait...')
                  : isRegister
                    ? (t.register || 'Register')
                    : (t.login || 'Sign in')}
              </span>
            </button>
          </form>

          {/* Mode Switch - 仅当后端允许注册时显示 */}
          {allowRegistration && (
            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={toggleMode}
                className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
              >
                {isRegister ? (t.switchToLogin || 'Already have an account? Sign in') : (t.switchToRegister || 'Need an account? Register')}
              </button>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
