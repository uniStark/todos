'use client';

import { useState, useEffect, memo, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Todo } from '@/lib/storage';
import { Trash2, Plus, CheckCircle2, Circle, Calendar, Clock, List, Loader, CheckCheck, Settings as SettingsIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { translations } from '@/lib/translations';

// 动态导入 Logo 组件（非关键路径）
const StarkLogo = dynamic(() => import('@/components/StarkLogo'), {
  loading: () => <div className="h-32 flex items-center justify-center" />,
  ssr: true,
});

export default function Home() {
  const router = useRouter();
  const { settings } = useSettings();
  const t = translations[settings.language];
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetchTodos();
    
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
  }, [inputValue, todos]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
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
  }, [todos]);

  const deleteTodo = useCallback(async (id: string) => {
    try {
      await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      setTodos(todos.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  }, [todos]);

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
      {/* Settings Button (Fixed Top Right) */}
      <motion.button
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
        onClick={() => router.push('/settings')}
        className="fixed top-4 right-4 sm:top-6 sm:right-6 z-40 p-3 sm:p-3.5 bg-white dark:bg-slate-800 backdrop-blur-xl rounded-full border border-slate-200 dark:border-slate-700 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-110"
      >
        <SettingsIcon size={20} className="text-slate-900 dark:text-slate-300" />
      </motion.button>

      {/* Hero Section with Logo */}
      <section className="w-full pt-8 sm:pt-12 pb-6 sm:pb-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <StarkLogo logoText={settings.logoText} />
        </div>
      </section>

      {/* Main Content */}
      <div className={`max-w-4xl mx-auto px-4 sm:px-6 ${isMobile ? 'pb-28' : 'pb-20'}`}>
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-slate-800/50 dark:to-slate-800/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-blue-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="text-xs sm:text-sm font-medium text-blue-700 dark:text-slate-400 mb-1">{t.all}</div>
            <div className="text-xl sm:text-3xl font-bold text-blue-900 dark:text-white">{stats.total}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-slate-800/50 dark:to-slate-800/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-orange-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="text-xs sm:text-sm font-medium text-orange-700 dark:text-slate-400 mb-1">{t.active}</div>
            <div className="text-xl sm:text-3xl font-bold text-orange-900 dark:text-blue-400">{stats.active}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-slate-800/50 dark:to-slate-800/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-3 sm:p-6 border border-emerald-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200"
          >
            <div className="text-xs sm:text-sm font-medium text-emerald-700 dark:text-slate-400 mb-1">{t.completed}</div>
            <div className="text-xl sm:text-3xl font-bold text-emerald-900 dark:text-emerald-400">{stats.completed}</div>
          </motion.div>
        </div>

        {/* Add Task Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white dark:bg-slate-800/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700/50 shadow-lg mb-6 sm:mb-8"
        >
          <form onSubmit={addTodo} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={t.addTaskPlaceholder}
              className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3.5 sm:py-3 text-base sm:text-base text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3.5 sm:py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md min-h-[44px]"
            >
              <Plus size={20} />
              <span>{t.addTask}</span>
            </button>
          </form>
        </motion.div>

        {/* Desktop Filter Tabs (hidden on mobile) */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex gap-3 mb-6"
          >
            {[
              { key: 'all' as const, label: t.allTasks, icon: List, count: stats.total },
              { key: 'active' as const, label: t.active, icon: Loader, count: stats.active },
              { key: 'completed' as const, label: t.completed, icon: CheckCheck, count: stats.completed },
            ].map(({ key, label, icon: Icon, count }) => (
              <motion.button
                key={key}
                onClick={() => setFilter(key)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={`relative flex-1 flex items-center justify-center gap-2 py-3 px-5 rounded-xl font-medium transition-all duration-200 cursor-pointer shadow-sm ${
                  filter === key
                    ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                    : 'bg-white dark:bg-slate-800/50 text-slate-900 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/70 border border-slate-200 dark:border-slate-700'
                }`}
              >
                <Icon size={20} strokeWidth={2.5} />
                <span>{label}</span>
                <span className={`ml-auto text-sm font-bold ${
                  filter === key ? 'text-white' : 'text-slate-400 dark:text-slate-500'
                }`}>
                  {count}
                </span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {/* Tasks List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-3 border-slate-300 border-t-slate-900 dark:border-slate-600 dark:border-t-white"></div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredTodos.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center py-16 bg-white dark:bg-slate-800/30 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-700/50"
                >
                  <div className="text-slate-400 dark:text-slate-500 text-sm px-4">
                    {filter === 'all' ? t.noTasks : `${settings.language === 'zh' ? '暂无' : 'No '}${filter === 'active' ? t.active : t.completed}${settings.language === 'zh' ? '的任务' : ' tasks'}`}
                  </div>
                </motion.div>
              ) : (
                filteredTodos
                  .sort((a, b) => b.createdAt - a.createdAt)
                  .map((todo) => (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -20, scale: 0.95 }}
                      transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
                      className={`group bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-5 border transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${
                        todo.completed
                          ? 'border-emerald-200 dark:border-emerald-900/30'
                          : 'border-slate-200 dark:border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-start gap-3 sm:gap-4">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleTodo(todo.id, todo.completed)}
                          className="mt-0.5 flex-shrink-0 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center -ml-2 sm:ml-0"
                        >
                          {todo.completed ? (
                            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={24} strokeWidth={2.5} />
                          ) : (
                            <Circle className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors duration-200" size={24} />
                          )}
                        </motion.button>

                        <div className="flex-1 min-w-0" onClick={() => toggleTodo(todo.id, todo.completed)}>
                          <p
                            className={`text-base sm:text-base mb-2 transition-all duration-200 break-words ${
                              todo.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white font-medium'
                            }`}
                          >
                            {todo.text}
                          </p>
                          <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              <span className="whitespace-nowrap">{t.created}: {formatDate(todo.createdAt)}</span>
                            </span>
                            {todo.completedAt && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Clock size={12} />
                                <span className="whitespace-nowrap">{t.completedAt}: {formatDate(todo.completedAt)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteTodo(todo.id)}
                          className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 p-2 sm:p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 sm:mr-0"
                        >
                          <Trash2 size={18} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Fixed Bottom Navigation Bar (Mobile Only) */}
      {isMobile && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.4, type: 'spring', stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 shadow-lg"
        >
          <div className="max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-around py-2">
              {[
                { key: 'all' as const, label: t.all, icon: List },
                { key: 'active' as const, label: t.active, icon: Loader },
                { key: 'completed' as const, label: t.completed, icon: CheckCheck },
              ].map(({ key, label, icon: Icon }) => (
                <motion.button
                  key={key}
                  onClick={() => setFilter(key)}
                  whileTap={{ scale: 0.95 }}
                  className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-xl transition-all duration-200 cursor-pointer min-h-[60px] ${
                    filter === key
                      ? 'bg-blue-600 dark:bg-blue-500 text-white shadow-md'
                      : 'text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800'
                  }`}
                >
                  <motion.div
                    animate={filter === key ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Icon size={22} strokeWidth={2.5} />
                  </motion.div>
                  <span className="text-xs font-medium">{label}</span>
                  {key !== 'all' && (
                    <AnimatePresence>
                      {(key === 'active' ? stats.active : stats.completed) > 0 && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold shadow-sm"
                        >
                          {key === 'active' ? stats.active : stats.completed}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </motion.button>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </main>
  );
}
