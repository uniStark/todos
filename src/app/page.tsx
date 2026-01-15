'use client';

import { useState, useEffect } from 'react';
import StarkLogo from '@/components/StarkLogo';
import { Todo } from '@/lib/storage';
import { Trash2, Plus, CheckCircle2, Circle, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchTodos();
  }, []);

  const fetchTodos = async () => {
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
  };

  const addTodo = async (e: React.FormEvent) => {
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
  };

  const toggleTodo = async (id: string, completed: boolean) => {
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
  };

  const deleteTodo = async (id: string) => {
    try {
      await fetch(`/api/todos?id=${id}`, { method: 'DELETE' });
      setTodos(todos.filter((t) => t.id !== id));
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const stats = {
    total: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">
      {/* Hero Section with Logo */}
      <section className="w-full pt-12 pb-8">
        <div className="max-w-4xl mx-auto px-6">
          <StarkLogo />
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 pb-20">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">全部任务</div>
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">进行中</div>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.active}</div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">已完成</div>
            <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.completed}</div>
          </motion.div>
        </div>

        {/* Add Task Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-lg mb-8"
        >
          <form onSubmit={addTodo} className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="添加新任务..."
              className="flex-1 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all duration-200"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-sm hover:shadow-md"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">添加</span>
            </button>
          </form>
        </motion.div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer ${
                filter === f
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                  : 'bg-white/60 dark:bg-slate-800/30 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50'
              }`}
            >
              {f === 'all' ? '全部' : f === 'active' ? '进行中' : '已完成'}
            </button>
          ))}
        </div>

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
                  className="text-center py-16 bg-white/60 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-700/50"
                >
                  <div className="text-slate-400 dark:text-slate-500 text-sm">
                    {filter === 'all' ? '暂无任务，开始记录你的灵感吧' : `暂无${filter === 'active' ? '进行中' : '已完成'}的任务`}
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
                      className={`group bg-white/80 dark:bg-slate-800/50 backdrop-blur-xl rounded-2xl p-5 border transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer ${
                        todo.completed
                          ? 'border-emerald-200 dark:border-emerald-900/30'
                          : 'border-slate-200 dark:border-slate-700/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleTodo(todo.id, todo.completed)}
                          className="mt-0.5 flex-shrink-0 cursor-pointer"
                        >
                          {todo.completed ? (
                            <CheckCircle2 className="text-emerald-600 dark:text-emerald-400" size={24} strokeWidth={2.5} />
                          ) : (
                            <Circle className="text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors duration-200" size={24} />
                          )}
                        </motion.button>

                        <div className="flex-1 min-w-0" onClick={() => toggleTodo(todo.id, todo.completed)}>
                          <p
                            className={`text-base mb-2 transition-all duration-200 ${
                              todo.completed
                                ? 'line-through text-slate-400 dark:text-slate-500'
                                : 'text-slate-900 dark:text-white font-medium'
                            }`}
                          >
                            {todo.text}
                          </p>
                          <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {formatDate(todo.createdAt)}
                            </span>
                            {todo.completedAt && (
                              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                <Clock size={12} />
                                完成于 {formatDate(todo.completedAt)}
                              </span>
                            )}
                          </div>
                        </div>

                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => deleteTodo(todo.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 cursor-pointer"
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
    </main>
  );
}
