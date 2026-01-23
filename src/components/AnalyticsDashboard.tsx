'use client';

import React, { useMemo, useState } from 'react';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { motion } from 'framer-motion';
import { format, subDays, isWithinInterval, startOfDay, endOfDay, eachDayOfInterval } from 'date-fns';
import { enUS, zhCN } from 'date-fns/locale';
import { Todo } from '@/lib/storage';
import { useSettings } from '@/contexts/SettingsContext';
import { translations } from '@/lib/translations';
import { Calendar, TrendingUp, CheckCircle2, Clock, Filter, ChevronLeft, ChevronRight, Eye, Users } from 'lucide-react';

interface AnalyticsDashboardProps {
  todos: Todo[];
  siteStats: { pv: number; uv: number };
}

type Range = '7d' | '30d' | 'all';

export default function AnalyticsDashboard({ todos, siteStats }: AnalyticsDashboardProps) {
  const { settings } = useSettings();
  const t = translations[settings.language];
  const [range, setRange] = useState<Range>('7d');

  const filteredData = useMemo(() => {
    const now = new Date();
    let startDate: Date;
    
    if (range === '7d') startDate = subDays(now, 6);
    else if (range === '30d') startDate = subDays(now, 29);
    else return todos;

    return todos.filter(todo => 
      todo.createdAt >= startDate.getTime()
    );
  }, [todos, range]);

  const dailyStats = useMemo(() => {
    const now = new Date();
    const days = range === '7d' ? 7 : range === '30d' ? 30 : 45;
    const interval = {
      start: startOfDay(subDays(now, days - 1)),
      end: endOfDay(now)
    };

    const dayList = eachDayOfInterval(interval);
    const locale = settings.language === 'zh' ? zhCN : enUS;
    
    return dayList.map(day => {
      const dayStart = startOfDay(day).getTime();
      const dayEnd = endOfDay(day).getTime();
      
      const createdCount = todos.filter(t => t.createdAt >= dayStart && t.createdAt <= dayEnd).length;
      const completedCount = todos.filter(t => t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd).length;
      
      return {
        date: format(day, 'MMM dd', { locale }),
        created: createdCount,
        completed: completedCount,
      };
    });
  }, [todos, range, settings.language]);

  const stats = useMemo(() => {
    const completed = filteredData.filter(t => t.completed).length;
    const total = filteredData.length;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, rate };
  }, [filteredData]);

  // Pro Max Custom Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/50 ring-1 ring-black/5">
          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                <span className="opacity-60 capitalize">{entry.name}:</span> {entry.value}
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Range Selector Pro Max */}
      <div className="flex justify-center">
        <div className="bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl flex gap-1 border border-slate-200/50 dark:border-slate-800/50 shadow-inner">
          {(['7d', '30d', 'all'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-300 cursor-pointer ${
                range === r 
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-md ring-1 ring-black/5' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {r === '7d' ? t.past7Days : r === '30d' ? t.pastMonth : t.allTime}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Grid Pro Max - Improved Alignment & Consistency */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 lg:gap-6">
        {[
          { label: t.pv, value: siteStats.pv, icon: Eye, color: 'indigo', bg: 'bg-indigo-500/10', text: 'text-indigo-500' },
          { label: t.uv, value: siteStats.uv, icon: Users, color: 'purple', bg: 'bg-purple-500/10', text: 'text-purple-500' },
          { label: t.totalCreated, value: stats.total, icon: Calendar, color: 'blue', bg: 'bg-blue-500/10', text: 'text-blue-500' },
          { label: t.completed, value: stats.completed, icon: CheckCircle2, color: 'emerald', bg: 'bg-emerald-500/10', text: 'text-emerald-500' },
          { label: t.successRate, value: `${stats.rate}%`, icon: TrendingUp, color: 'orange', bg: 'bg-orange-500/10', text: 'text-orange-500' },
        ].map((item, idx) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="glass-card p-5 lg:p-6 rounded-[2.5rem] flex items-center gap-4 lg:gap-6 hover-lift"
          >
            <div className={`p-4 ${item.bg} ${item.text} rounded-2xl shrink-0 transition-all duration-500`}>
              <item.icon size={24} strokeWidth={2.5} />
            </div>
            <div className="min-w-0 flex-1 flex flex-col justify-center">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-slate-400 mb-0.5 leading-tight">
                {item.label}
              </p>
              <p className="text-2xl lg:text-3xl font-black tabular-nums tracking-tighter text-slate-900 dark:text-white truncate">
                {item.value}
              </p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 gap-8">
        {/* Line Chart: Daily Activity */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-8 rounded-[3rem] overflow-hidden relative"
        >
          <div className="mb-8">
            <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-2">
              {t.dailyActivity}
              <div className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] rounded-full">{t.trend}</div>
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.creationVsCompletion}</p>
          </div>
          
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyStats}>
                <defs>
                  <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" className="dark:stroke-slate-800" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="created" 
                  name={t.createdLabel}
                  stroke="#3b82f6" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorCreated)" 
                  animationDuration={1500}
                />
                <Area 
                  type="monotone" 
                  dataKey="completed" 
                  name={t.completedLabel}
                  stroke="#10b981" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                  animationDuration={2000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Simplified Timeline (Gantt-like) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-8 rounded-[3rem]"
        >
          <div className="mb-8">
            <h3 className="text-lg font-black uppercase tracking-tighter text-slate-900 dark:text-white">
              {t.recentTaskTimeline}
            </h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{t.completionDuration}</p>
          </div>

          <div className="space-y-4">
            {todos.filter(t => t.completedAt).slice(0, 8).map((todo, idx) => {
              const duration = todo.completedAt! - todo.createdAt;
              const hours = Math.round(duration / (1000 * 60 * 60));
              const percentage = Math.min(Math.max((duration / (1000 * 60 * 60 * 24)) * 100, 10), 100);
              
              return (
                <div key={todo.id} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-300 truncate max-w-[200px]">
                      {todo.text}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">
                      {t.took} {hours}{t.language === 'zh' ? t.hours : 'h'}
                    </span>
                  </div>
                  <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ delay: 0.5 + idx * 0.1, duration: 1 }}
                      className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
