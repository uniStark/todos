'use client';

import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Todo } from '@/lib/storage';
import { Trash2, Plus, CheckCircle2, Circle, Calendar, Clock, List, Loader, CheckCheck, Settings as SettingsIcon, BarChart3, ShieldCheck, ShieldOff, LogOut, Pencil, Check, X, Github, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { translations } from '@/lib/translations';

// 动态导入 Logo 组件（非关键路径）
const StarkLogo = dynamic(() => import('@/components/StarkLogo'), {
  loading: () => <div className="h-32 flex items-center justify-center" />,
  ssr: true,
});

export default function Home() {
  const router = useRouter();
  const { settings } = useSettings();
  const { isAuthenticated, requestAuth, logout } = useAuth();
  const t = translations[settings.language];
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    fetchTodos();
    
    // Record PV/UV
    fetch('/api/stats', { method: 'POST' }).catch(err => console.error('Failed to record stats:', err));
    
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchTodos = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/todos');
      const data = await response.json();
      setTodos(data);
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addTodo = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // 检查权限
    if (!isAuthenticated) {
      requestAuth();
      return;
    }

    try {
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputValue }),
      });
      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      setInputValue('');
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  }, [inputValue, todos, isAuthenticated, requestAuth]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    // 检查权限
    if (!isAuthenticated) {
      requestAuth();
      return;
    }

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: !completed }),
      });
      const updatedTodo = await response.json();
      setTodos(todos.map((t) => (t.id === id ? updatedTodo : t)));
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  }, [todos, isAuthenticated, requestAuth]);

  const deleteTodo = useCallback(async (id: string) => {
    // 检查权限
    if (!isAuthenticated) {
      requestAuth();
      return;
    }

    try {
      await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      setTodos(todos.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  }, [todos, isAuthenticated, requestAuth]);

  // 开始编辑
  const startEdit = useCallback((id: string, text: string) => {
    // 检查权限
    if (!isAuthenticated) {
      requestAuth();
      return;
    }
    setEditingId(id);
    setEditText(text);
  }, [isAuthenticated, requestAuth]);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  // 保存编辑
  const saveEdit = useCallback(async (id: string) => {
    if (!editText.trim()) {
      cancelEdit();
      return;
    }

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, text: editText.trim() }),
      });
      const updatedTodo = await response.json();
      setTodos(todos.map((t) => (t.id === id ? updatedTodo : t)));
      cancelEdit();
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  }, [editText, todos, cancelEdit]);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    try {
      return date.toLocaleString(settings.language === 'zh' ? 'zh-CN' : 'en-US', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: settings.timezone,
      });
    } catch {
      return date.toLocaleString('zh-CN', {
        month: 'numeric',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  // 使用 useMemo 优化计算
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      if (filter === 'active') return !todo.completed;
      if (filter === 'completed') return todo.completed;
      return true;
    });
  }, [todos, filter]);

  const stats = useMemo(() => ({
    total: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  }), [todos]);

  return (
    <main className="min-h-screen bg-light-primary transition-colors duration-500">
      {/* Settings & Analytics Buttons (Fixed Top Right) */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40 flex flex-col gap-3">
        {/* Auth Status Indicator */}
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={isAuthenticated ? logout : requestAuth}
          className={`p-3 backdrop-blur-xl rounded-2xl border shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer ${
            isAuthenticated 
              ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-700' 
              : 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-300 dark:border-amber-700'
          }`}
          title={isAuthenticated ? t.logout : t.authRequired}
        >
          {isAuthenticated ? (
            <ShieldCheck size={22} className="text-emerald-600 dark:text-emerald-400" />
          ) : (
            <ShieldOff size={22} className="text-amber-600 dark:text-amber-400" />
          )}
        </motion.button>
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.1, rotate: 90 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/settings')}
          className="p-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer"
        >
          <SettingsIcon size={22} className="text-slate-700 dark:text-slate-300" />
        </motion.button>
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push('/analytics')}
          className="p-3 bg-blue-600 dark:bg-blue-500 text-white backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl hover:bg-blue-700 dark:hover:bg-blue-400 transition-all duration-300 cursor-pointer"
        >
          <BarChart3 size={22} strokeWidth={2.5} />
        </motion.button>
      </div>

      {/* Hero Section with Logo */}
      <section className="w-full pt-12 sm:pt-16 pb-8 sm:pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <StarkLogo logoText={settings.logoText} />
        </div>
      </section>

      {/* Main Content */}
      <div className={`max-w-3xl mx-auto px-4 sm:px-6 ${isMobile ? 'pb-32' : 'pb-24'}`}>
        {/* Stats Cards Pro Max */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8 sm:mb-12">
          {[
            { label: t.all, value: stats.total, color: 'blue', delay: 0.1 },
            { label: t.active, value: stats.active, color: 'orange', delay: 0.2 },
            { label: t.completed, value: stats.completed, color: 'emerald', delay: 0.3 },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
              className="glass-card p-4 sm:p-6 rounded-3xl hover-lift ring-1 ring-inset ring-white/50 dark:ring-white/5"
            >
              <div className="text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 opacity-60">
                {stat.label}
              </div>
              <div className="text-2xl sm:text-4xl font-black tabular-nums tracking-tighter">
                {stat.value}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Add Task Card Pro Max */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-2 rounded-[2rem] mb-10 sm:mb-12 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
        >
          <form onSubmit={addTodo} className="flex gap-2 p-1">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.addTaskPlaceholder}
              className="flex-1 bg-transparent border-none rounded-2xl px-5 py-4 text-base sm:text-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 transition-all"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 sm:px-8 py-4 rounded-[1.5rem] font-bold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-95 hover:shadow-xl"
            >
              <Plus size={22} strokeWidth={3} />
              <span className="hidden sm:inline text-sm uppercase tracking-wider">{t.addTask}</span>
            </button>
          </form>
        </motion.div>

        {/* Desktop Tabs Pro Max */}
        {!isMobile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2 mb-8 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl w-fit mx-auto backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 shadow-inner"
          >
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                  filter === f 
                    ? 'text-slate-900 dark:text-white' 
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {filter === f && (
                  <motion.div
                    layoutId="desktop-filter"
                    className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-md ring-1 ring-black/5"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 capitalize">{t[f as keyof typeof t] || f}</span>
              </button>
            ))}
          </motion.div>
        )}

        {/* Tasks List Pro Max */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader className="animate-spin text-blue-500" size={40} />
            <p className="text-slate-400 font-medium animate-pulse uppercase tracking-widest text-xs">{t.syncingTasks}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {filteredTodos.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="glass-card py-20 rounded-[2.5rem] text-center border-dashed border-2 opacity-60"
                >
                  <div className="text-slate-400 dark:text-slate-500 text-sm font-bold uppercase tracking-widest px-4">
                    {filter === 'all' 
                      ? t.noTasks 
                      : filter === 'active' 
                        ? t.noActiveTasks 
                        : t.noCompletedTasks}
                  </div>
                </motion.div>
              ) : (
                filteredTodos
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((todo) => (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className={`glass-card p-5 sm:p-6 rounded-[1.75rem] hover-lift group ${
                        todo.completed ? 'opacity-60 grayscale-[0.5]' : ''
                      }`}
                    >
                      <div className="flex items-center gap-4 sm:gap-6">
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => toggleTodo(todo.id, todo.completed)}
                          className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 cursor-pointer ${
                            todo.completed 
                              ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20' 
                              : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400'
                          }`}
                        >
                          {todo.completed && <CheckCheck className="text-white" size={18} strokeWidth={3} />}
                        </motion.button>

                        <div className="flex-1 min-w-0">
                          {editingId === todo.id ? (
                            // 编辑模式
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') saveEdit(todo.id);
                                  if (e.key === 'Escape') cancelEdit();
                                }}
                                autoFocus
                                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-4 py-2 text-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              />
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => saveEdit(todo.id)}
                                className="p-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                              >
                                <Check size={18} strokeWidth={3} />
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={cancelEdit}
                                className="p-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors cursor-pointer"
                              >
                                <X size={18} strokeWidth={3} />
                              </motion.button>
                            </div>
                          ) : (
                            // 显示模式
                            <div onClick={() => toggleTodo(todo.id, todo.completed)}>
                              <p
                                className={`text-lg sm:text-xl font-semibold mb-1 transition-all duration-500 break-words ${
                                  todo.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500 italic'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {todo.text}
                              </p>
                              <div className="flex items-center gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                                <span className="flex items-center gap-1.5">
                                  <Calendar size={12} strokeWidth={2.5} />
                                  {formatDate(todo.createdAt)}
                                </span>
                                {todo.completedAt && (
                                  <span className="flex items-center gap-1.5 text-emerald-500">
                                    <CheckCircle2 size={12} strokeWidth={2.5} />
                                    {formatDate(todo.completedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        {editingId !== todo.id && (
                          <div className="flex items-center gap-1">
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                startEdit(todo.id, todo.text);
                              }}
                              className="p-3 rounded-2xl text-slate-300 hover:text-blue-500 dark:text-slate-600 dark:hover:text-blue-400 transition-all duration-300 cursor-pointer"
                            >
                              <Pencil size={18} strokeWidth={2.5} />
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTodo(todo.id);
                              }}
                              className="p-3 rounded-2xl text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all duration-300 cursor-pointer"
                            >
                              <Trash2 size={20} strokeWidth={2.5} />
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* GitHub Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className={`text-center ${isMobile ? 'pb-28' : 'pb-8'} pt-12`}
      >
        <a
          href="https://github.com/uniStark/To-Do-List"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30 backdrop-blur-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer group"
        >
          <Github size={18} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Open Source on GitHub</span>
          <Heart size={14} strokeWidth={2.5} className="text-red-400 group-hover:text-red-500 group-hover:scale-125 transition-all" />
        </a>
        <p className="mt-4 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Made with <span className="text-red-400">♥</span> by STARK
        </p>
      </motion.footer>

      {/* Fixed Bottom Nav Pro Max (Mobile Only) */}
      {isMobile && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 left-4 right-4 z-50 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl ring-1 ring-black/5"
        >
          <div className="flex justify-between items-center px-2">
            {(['all', 'active', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`relative flex-1 flex flex-col items-center gap-1 py-3 px-6 rounded-2xl transition-all duration-300 cursor-pointer ${
                  filter === f ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {filter === f && (
                  <motion.div
                    layoutId="mobile-filter"
                    className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-2xl -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                {f === 'all' && <List size={20} strokeWidth={3} />}
                {f === 'active' && <Circle size={20} strokeWidth={3} />}
                {f === 'completed' && <CheckCheck size={20} strokeWidth={3} />}
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  {t[f as keyof typeof t] || f}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </main>
  );
}
