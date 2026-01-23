'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BarChart3, Info } from 'lucide-react';
import { Todo } from '@/lib/storage';
import { useSettings } from '@/contexts/SettingsContext';
import { translations } from '@/lib/translations';
import dynamic from 'next/dynamic';

// 动态导入图表组件以支持 SSR
const AnalyticsDashboard = dynamic(() => import('@/components/AnalyticsDashboard'), {
  loading: () => {
    const { settings } = useSettings();
    const t = translations[settings.language];
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t.analyticsLoading}</p>
      </div>
    );
  },
  ssr: false
});

export default function AnalyticsPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const t = translations[settings.language];
  const [todos, setTodos] = useState<Todo[]>([]);
  const [siteStats, setSiteStats] = useState({ pv: 0, uv: 0 });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [todosRes, statsRes] = await Promise.all([
          fetch('/api/todos'),
          fetch('/api/stats')
        ]);
        const todosData = await todosRes.json();
        const statsData = await statsRes.json();
        setTodos(todosData);
        setSiteStats(statsData);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-light-primary selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-20">
        
        {/* Header Pro Max */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center justify-between mb-12 sm:mb-16"
        >
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push('/')}
              className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
            >
              <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
            </button>
            <div>
              <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900 dark:text-white uppercase italic flex items-center gap-4">
                <BarChart3 className="text-blue-500" size={40} strokeWidth={3} />
                {t.insights}
              </h1>
              <div className="h-1 w-12 bg-blue-500 rounded-full mt-2" />
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
            <Info size={16} strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-widest">{t.liveDataEngine}</span>
          </div>
        </motion.div>

        {isLoading ? (
          <div className="h-96 flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">{t.aggregatingRecords}</p>
          </div>
        ) : (
          <AnalyticsDashboard todos={todos} siteStats={siteStats} />
        )}
      </div>
    </main>
  );
}
