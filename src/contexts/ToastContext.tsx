'use client';

import React, { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, AlertCircle, X } from 'lucide-react';

export type ToastType = 'success' | 'error';

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastApi {
  success: (message: string) => void;
  error: (message: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastApi | undefined>(undefined);

const AUTO_DISMISS_MS = 4000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // 记录每个 toast 的定时器，便于卸载/手动关闭时清理，避免内存泄漏。
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const push = useCallback((type: ToastType, message: string) => {
    if (!message) return;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);
    const timer = setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    timers.current.set(id, timer);
  }, [dismiss]);

  const success = useCallback((message: string) => push('success', message), [push]);
  const error = useCallback((message: string) => push('error', message), [push]);

  return (
    <ToastContext.Provider value={{ success, error, dismiss }}>
      {children}
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastViewport({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[200] flex flex-col items-center gap-3 px-4 sm:top-6">
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: -24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            className="pointer-events-auto w-full max-w-sm"
          >
            <div
              role={toast.type === 'error' ? 'alert' : 'status'}
              className={`glass-card flex items-start gap-3 rounded-2xl px-4 py-3 shadow-2xl ring-1 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90 ${
                toast.type === 'error'
                  ? 'ring-red-300/60 dark:ring-red-500/30'
                  : 'ring-emerald-300/60 dark:ring-emerald-500/30'
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {toast.type === 'error' ? (
                  <AlertCircle size={18} className="text-red-500 dark:text-red-400" strokeWidth={2.5} />
                ) : (
                  <CheckCircle2 size={18} className="text-emerald-500 dark:text-emerald-400" strokeWidth={2.5} />
                )}
              </span>
              <p className="flex-1 break-words text-sm font-semibold leading-snug text-slate-800 dark:text-slate-100">
                {toast.message}
              </p>
              <button
                type="button"
                onClick={() => onDismiss(toast.id)}
                className="shrink-0 rounded-lg p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Dismiss"
              >
                <X size={14} strokeWidth={2.5} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
