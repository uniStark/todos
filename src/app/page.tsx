'use client';

import { useState, useEffect } from 'react';
import StarkLogo from '@/components/StarkLogo';
import { Todo } from '@/lib/storage';
import { Trash2, Plus, CheckCircle, Circle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(true);

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

  return (
    <main className="min-h-screen bg-white dark:bg-black text-black dark:text-white transition-colors duration-500">
      <div className="max-w-2xl mx-auto px-6 py-12 flex flex-col items-center">
        {/* Particle Logo Section */}
        <div className="w-full mb-12">
          <StarkLogo />
        </div>

        {/* Todo Section */}
        <div className="w-full max-w-md">
          <form onSubmit={addTodo} className="flex gap-2 mb-8 group">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="添加新任务..."
              className="todo-input flex-1"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-300 disabled:opacity-30"
            >
              <Plus size={24} />
            </button>
          </form>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse text-gray-400">加载中...</div>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {todos.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center py-10 text-gray-400 font-light"
                  >
                    暂无任务，开始记录你的灵感吧。
                  </motion.div>
                ) : (
                  todos
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((todo) => (
                      <motion.div
                        key={todo.id}
                        layout
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, x: -20, scale: 0.95 }}
                        transition={{ duration: 0.2, type: 'spring', stiffness: 300, damping: 25 }}
                        className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-500 group shadow-sm hover:shadow-md ${
                          todo.completed
                            ? 'border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-900/10'
                            : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-zinc-950'
                        }`}
                      >
                        <div
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => toggleTodo(todo.id, todo.completed)}
                        >
                          <motion.div
                            initial={false}
                            animate={{ scale: todo.completed ? [1, 1.2, 1] : 1 }}
                            transition={{ duration: 0.2 }}
                          >
                            {todo.completed ? (
                              <CheckCircle className="text-emerald-500 dark:text-emerald-400" size={20} />
                            ) : (
                              <Circle className="text-gray-300 dark:text-gray-600 group-hover:text-gray-400" size={20} />
                            )}
                          </motion.div>
                          <div className="flex flex-col">
                            <motion.span
                              layout
                              className={`transition-all duration-300 ${
                                todo.completed
                                  ? 'line-through text-emerald-900/40 dark:text-emerald-100/30'
                                  : 'text-black dark:text-gray-200 font-medium'
                              }`}
                            >
                              {todo.text}
                            </motion.span>
                            <span className={`text-[10px] font-light mt-1 ${
                              todo.completed ? 'text-emerald-600/40' : 'text-gray-400'
                            }`}>
                              创建: {formatDate(todo.createdAt)}
                              {todo.completedAt && ` • 完成: ${formatDate(todo.completedAt)}`}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => deleteTodo(todo.id)}
                          className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 transition-all duration-300"
                        >
                          <Trash2 size={18} />
                        </button>
                      </motion.div>
                    ))
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

