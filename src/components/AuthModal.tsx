'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, X, Eye, EyeOff, ShieldCheck, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSettings } from '@/contexts/SettingsContext';
import { translations } from '@/lib/translations';

export default function AuthModal() {
  const { showAuthModal, authenticate, closeAuthModal } = useAuth();
  const { settings } = useSettings();
  const t = translations[settings.language];
  
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError(t.passwordRequired || 'Password is required');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    const success = await authenticate(password);
    
    if (!success) {
      setError(t.invalidPassword || 'Invalid password');
    }
    
    setIsLoading(false);
  };

  const handleClose = () => {
    setPassword('');
    setError('');
    closeAuthModal();
  };

  return (
    <AnimatePresence>
      {showAuthModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.5 }}
            className="w-full max-w-md glass-card p-8 rounded-[2rem] ring-1 ring-black/5 dark:ring-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 rounded-2xl">
                  <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {t.authRequired || 'Authentication Required'}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.authDescription || 'Enter password to modify tasks'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError('');
                  }}
                  placeholder={t.enterPassword || 'Enter password'}
                  className="w-full bg-slate-100 dark:bg-slate-900/50 border-none rounded-2xl px-6 py-4 pr-12 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Error Message */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="flex items-center gap-2 px-4 py-3 bg-red-500/10 dark:bg-red-500/20 rounded-xl"
                  >
                    <ShieldAlert className="w-5 h-5 text-red-500" />
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">
                      {error}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading || !password.trim()}
                className="w-full flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-bold transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-xl active:scale-[0.98] cursor-pointer"
              >
                {isLoading ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <ShieldCheck className="w-5 h-5" />
                )}
                <span>{isLoading ? (t.verifying || 'Verifying...') : (t.verify || 'Verify')}</span>
              </button>
            </form>

            {/* Footer Hint */}
            <p className="mt-6 text-center text-xs text-slate-400">
              {t.authHint || 'Contact administrator if you forgot the password'}
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
