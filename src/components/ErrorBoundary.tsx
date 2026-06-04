'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { translations } from '@/lib/translations';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// 读取当前语言：class 组件无法用 hook，直接复用 SettingsContext 的 localStorage key，失败回退 en。
function getLanguage(): 'zh' | 'en' {
  if (typeof window === 'undefined') return 'en';
  try {
    const raw = window.localStorage.getItem('stark-settings');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.language === 'zh' || parsed?.language === 'en') {
        return parsed.language;
      }
    }
  } catch {
    // ignore parse errors and fall back below
  }
  return 'en';
}

/**
 * 仅兜「渲染期」异常（render / lifecycle / 构造阶段抛错），避免白屏。
 * 异步 / fetch 错误不会被它捕获，那类错误在请求层用 toast 统一处理。
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Render error caught:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const t = translations[getLanguage()];

    return (
      <main className="min-h-[100dvh] bg-light-primary flex items-center justify-center p-6 py-[max(1.5rem,env(safe-area-inset-top))] transition-colors duration-500">
        <div className="glass-card max-w-md w-full rounded-[2rem] p-8 text-center shadow-2xl ring-1 ring-black/5 dark:ring-white/10">
          <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
            {t.errorBoundaryTitle}
          </h1>
          <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
            {t.errorBoundaryDesc}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={this.handleReset}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition-all hover:shadow-xl active:scale-95 dark:bg-white dark:text-slate-900"
            >
              {t.retry}
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 transition-all hover:bg-slate-200 active:scale-95 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {t.reload}
            </button>
          </div>
        </div>
      </main>
    );
  }
}
