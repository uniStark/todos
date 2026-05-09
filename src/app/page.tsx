'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Todo, Group, Priority, DEFAULT_GROUP_ID } from '@/lib/types';
import { Trash2, Plus, Calendar, Clock, List, Loader, CheckCheck, Settings as SettingsIcon, BarChart3, ShieldCheck, ShieldOff, Pencil, Check, X, Github, Heart, Code2, FolderPlus, Flag, ChevronDown, MoreVertical } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { translations } from '@/lib/translations';
import { isMobileApp } from '@/lib/platform';
import { getMobileTodos, saveMobileTodos, getMobileGroups } from '@/lib/mobileStorage';

// 动态导入 Logo 组件（非关键路径）
const StarkLogo = dynamic(() => import('@/components/StarkLogo'), {
  loading: () => <div className="h-32 flex items-center justify-center" />,
  ssr: true,
});

// 动态导入 AI Chat 组件 (Web 端)
const AIChat = dynamic(() => import('@/components/AIChat'), {
  loading: () => null,
  ssr: false,
});

// 动态导入语音按钮组件 (移动端)
const VoiceButton = dynamic(() => import('@/components/VoiceButton'), {
  loading: () => null,
  ssr: false,
});

async function readJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Keep the original status-based error below when the body is empty or malformed.
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null && 'message' in data
      ? String((data as { message?: unknown }).message)
      : typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error?: unknown }).error)
        : fallbackMessage;
    throw new Error(`${message} (${response.status})`);
  }

  return data as T;
}

async function ensureOk(response: Response, fallbackMessage: string): Promise<void> {
  await readJsonOrThrow<unknown>(response, fallbackMessage);
}

export default function Home() {
  const router = useRouter();
  const { settings } = useSettings();
  const { isAuthenticated, requestAuth, logout, getAuthHeaders } = useAuth();
  const t = translations[settings.language];
  const [todos, setTodos] = useState<Todo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>(DEFAULT_GROUP_ID);
  const [selectedPriority, setSelectedPriority] = useState<Priority>('P2');
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isMobile, setIsMobile] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [activeGroupId, setActiveGroupId] = useState<string | 'all'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'past' | 'today' | 'future'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);

  // 触感反馈助手
  const hapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      if (type === 'light') navigator.vibrate(10);
      else if (type === 'medium') navigator.vibrate(20);
      else if (type === 'heavy') navigator.vibrate([10, 5, 10]);
    }
  }, []);
  useEffect(() => {
    setIsNativeApp(isMobileApp());
  }, []);

  const fetchTodos = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isMobileApp()) {
        // 移动端使用本地存储
        const data = await getMobileTodos();
        setTodos(data.filter(t => !t.deleted));
      } else {
        // Web 端使用 API
        const response = await fetch('/api/todos');
        const data = await readJsonOrThrow<Todo[]>(response, 'Failed to fetch todos');
        setTodos(data);
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchGroups = useCallback(async () => {
    try {
      if (isMobileApp()) {
        // 移动端使用本地存储
        const data = await getMobileGroups();
        setGroups(data);
      } else {
        // Web 端使用 API
        const response = await fetch('/api/groups');
        const data = await readJsonOrThrow<Group[]>(response, 'Failed to fetch groups');
        setGroups(data);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
    fetchGroups();

    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, [fetchGroups, fetchTodos]);

  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !isAuthenticated) return;

    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({ name: newGroupName.trim() }),
      });
      const newGroup = await readJsonOrThrow<Group>(response, 'Failed to add group');
      setGroups([...groups, newGroup]);
      setNewGroupName('');
      setIsGroupModalOpen(false);
      hapticFeedback('medium');
    } catch (error) {
      console.error('Failed to add group:', error);
    }
  };

  const deleteGroup = async (id: string) => {
    if (id === DEFAULT_GROUP_ID || !isAuthenticated) return;

    try {
      const response = await fetch(`/api/groups?id=${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      await ensureOk(response, 'Failed to delete group');
      setGroups(groups.filter(g => g.id !== id));
      if (selectedGroupId === id) setSelectedGroupId(DEFAULT_GROUP_ID);
      if (activeGroupId === id) setActiveGroupId('all');
      hapticFeedback('heavy');
      fetchTodos(); // 重新加载任务，因为它们的分组可能已经改变
    } catch (error) {
      console.error('Failed to delete group:', error);
    }
  };

  const addTodo = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // 检查权限（移动端跳过）
    if (!isNativeApp && !isAuthenticated) {
      requestAuth();
      return;
    }

    try {
      if (isNativeApp) {
        // 移动端使用本地存储
        const currentTodos = await getMobileTodos();
        const newTodo: Todo = {
          id: crypto.randomUUID(),
          text: inputValue.trim(),
          completed: false,
          createdAt: Date.now(),
          groupId: settings.enableGroups ? selectedGroupId : 'default',
          priority: settings.enablePriority ? selectedPriority : 'P2',
        };
        currentTodos.push(newTodo);
        await saveMobileTodos(currentTodos);
        setTodos([...todos.filter(t => !t.deleted), newTodo]);
      } else {
        // Web 端使用 API
        const requestBody: Record<string, unknown> = { 
          text: inputValue,
        };
        
        if (settings.enableGroups) {
          requestBody.groupId = selectedGroupId;
        }
        
        if (settings.enablePriority) {
          requestBody.priority = selectedPriority;
        }

        const response = await fetch('/api/todos', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(requestBody),
        });
        const newTodo = await readJsonOrThrow<Todo>(response, 'Failed to add todo');
        setTodos([...todos, newTodo]);
      }
      setInputValue('');
      setIsAddSheetOpen(false);
      hapticFeedback('medium');
    } catch (error) {
      console.error('Failed to add todo:', error);
    }
  }, [inputValue, todos, isAuthenticated, requestAuth, selectedGroupId, selectedPriority, getAuthHeaders, settings.enableGroups, settings.enablePriority, isNativeApp, hapticFeedback]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    // 检查权限（移动端跳过）
    if (!isNativeApp && !isAuthenticated) {
      requestAuth();
      return;
    }

    try {
      if (isNativeApp) {
        // 移动端使用本地存储
        const currentTodos = await getMobileTodos();
        const index = currentTodos.findIndex(t => t.id === id);
        if (index !== -1) {
          currentTodos[index].completed = !completed;
          if (!completed) {
            currentTodos[index].completedAt = Date.now();
          } else {
            delete currentTodos[index].completedAt;
          }
          await saveMobileTodos(currentTodos);
          setTodos(currentTodos.filter(t => !t.deleted));
        }
      } else {
        // Web 端使用 API
        const response = await fetch('/api/todos', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({ id, completed: !completed }),
        });
        const updatedTodo = await readJsonOrThrow<Todo>(response, 'Failed to toggle todo');
        setTodos(todos.map((t) => (t.id === id ? updatedTodo : t)));
      }
      hapticFeedback('light');
    } catch (error) {
      console.error('Failed to toggle todo:', error);
    }
  }, [todos, isAuthenticated, requestAuth, getAuthHeaders, isNativeApp, hapticFeedback]);

  const deleteTodo = useCallback(async (id: string) => {
    // 检查权限（移动端跳过）
    if (!isNativeApp && !isAuthenticated) {
      requestAuth();
      return;
    }

    try {
      if (isNativeApp) {
        // 移动端使用本地存储（软删除）
        const currentTodos = await getMobileTodos();
        const index = currentTodos.findIndex(t => t.id === id);
        if (index !== -1) {
          currentTodos[index].deleted = true;
          currentTodos[index].deletedAt = Date.now();
          await saveMobileTodos(currentTodos);
          setTodos(currentTodos.filter(t => !t.deleted));
        }
      } else {
        // Web 端使用 API
        const response = await fetch(`/api/todos?id=${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        await ensureOk(response, 'Failed to delete todo');
        setTodos(todos.filter((t) => t.id !== id));
      }
      hapticFeedback('heavy');
    } catch (error) {
      console.error('Failed to delete todo:', error);
    }
  }, [todos, isAuthenticated, requestAuth, getAuthHeaders, isNativeApp, hapticFeedback]);

  // 开始编辑
  const startEdit = useCallback((id: string, text: string) => {
    // 检查权限（移动端跳过）
    if (!isNativeApp && !isAuthenticated) {
      requestAuth();
      return;
    }
    setEditingId(id);
    setEditText(text);
  }, [isAuthenticated, requestAuth, isNativeApp]);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  // 保存编辑
  const saveEdit = useCallback(async (id: string, updates: Partial<Todo> = {}) => {
    // 检查权限（移动端跳过）
    if (!isNativeApp && !isAuthenticated) {
      requestAuth();
      return;
    }
    
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    const finalUpdates = {
      id,
      text: updates.text || (id === editingId ? editText.trim() : todo.text),
      ...updates
    };

    if (id === editingId && !editText.trim() && !updates.text) {
      cancelEdit();
      return;
    }

    try {
      if (isNativeApp) {
        // 移动端使用本地存储
        const currentTodos = await getMobileTodos();
        const index = currentTodos.findIndex(t => t.id === id);
        if (index !== -1) {
          currentTodos[index] = { ...currentTodos[index], ...finalUpdates };
          await saveMobileTodos(currentTodos);
          setTodos(currentTodos.filter(t => !t.deleted));
        }
      } else {
        // Web 端使用 API
        const response = await fetch('/api/todos', {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(finalUpdates),
        });
        const updatedTodo = await readJsonOrThrow<Todo>(response, 'Failed to update todo');
        setTodos(todos.map((t) => (t.id === id ? updatedTodo : t)));
      }
      if (id === editingId) cancelEdit();
      hapticFeedback('medium');
    } catch (error) {
      console.error('Failed to update todo:', error);
    }
  }, [editText, todos, cancelEdit, editingId, getAuthHeaders, isAuthenticated, requestAuth, isNativeApp, hapticFeedback]);

  const updateTodoPriority = useCallback((id: string, priority: Priority) => {
    saveEdit(id, { priority });
  }, [saveEdit]);

  const updateTodoGroup = useCallback((id: string, groupId: string) => {
    saveEdit(id, { groupId });
  }, [saveEdit]);

  // AI 操作后刷新待办事项列表
  const refreshTodosFromAI = useCallback(async () => {
    try {
      if (isNativeApp) {
        // 移动端使用本地存储
        const todosData = await getMobileTodos();
        setTodos(todosData.filter((t: Todo) => !t.deleted));

        const groupsData = await getMobileGroups();
        setGroups(groupsData);
      } else {
        // Web 端使用 API
        const todosResponse = await fetch('/api/todos');
        const todosData = await readJsonOrThrow<Todo[]>(todosResponse, 'Failed to refresh todos');
        setTodos(todosData.filter((t: Todo) => !t.deleted));

        const groupsResponse = await fetch('/api/groups');
        const groupsData = await readJsonOrThrow<Group[]>(groupsResponse, 'Failed to refresh groups');
        setGroups(groupsData);
      }

      console.log('[AI] Refreshed todos and groups');
    } catch (error) {
      console.error('Failed to refresh from AI:', error);
    }
  }, [isNativeApp]);

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

  // 格式化截止日期（支持时间）
  const formatDueDate = (dueDate: string): string => {
    // 检查是否包含时间 (YYYY-MM-DDTHH:mm)
    if (dueDate.includes('T')) {
      const [datePart, timePart] = dueDate.split('T');
      const [, month, day] = datePart.split('-');
      return settings.language === 'zh' 
        ? `${parseInt(month)}月${parseInt(day)}日 ${timePart}`
        : `${month}/${day} ${timePart}`;
    }
    // 只有日期 (YYYY-MM-DD)
    const [, month, day] = dueDate.split('-');
    return settings.language === 'zh' 
      ? `${parseInt(month)}月${parseInt(day)}日`
      : `${month}/${day}`;
  };

  // 使用 useMemo 优化计算
  const filteredTodos = useMemo(() => {
    return todos
      .filter((todo) => {
        // 状态过滤（全部/进行中/已完成）
        const matchesFilter = 
          filter === 'active' ? !todo.completed :
          filter === 'completed' ? todo.completed : true;
        
        // 时间过滤（过去/今天/未来）
        let matchesTime = true;
        const todayStr = new Date().toISOString().split('T')[0];
        
        if (timeFilter === 'past') {
          // 过去的任务（今天之前）
          if (todo.dueDate) {
            const dueDateStr = todo.dueDate.split('T')[0];
            matchesTime = dueDateStr < todayStr;
          } else {
            matchesTime = false;
          }
        } else if (timeFilter === 'today') {
          // 今天的任务
          matchesTime = todo.dueDate?.startsWith(todayStr) || false;
        } else if (timeFilter === 'future') {
          // 未来的任务（明天之后）
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split('T')[0];
          if (todo.dueDate) {
            const dueDateStr = todo.dueDate.split('T')[0];
            matchesTime = dueDateStr >= tomorrowStr;
          } else {
            matchesTime = false;
          }
        }
        
        // 用户分组过滤
        const matchesGroup = 
          activeGroupId === 'all' ? true : todo.groupId === activeGroupId;

        return matchesFilter && matchesTime && matchesGroup;
      })
      .sort((a, b) => {
        // 1. 未完成任务排在前面
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        
        // 2. 已完成任务只按时间排序（完成时间降序）
        if (a.completed && b.completed) {
          const aTime = a.completedAt || a.createdAt;
          const bTime = b.completedAt || b.createdAt;
          return bTime - aTime;
        }
        
        // 3. 未完成任务按优先级排序 (P0 > P1 > P2)
        const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
        const aPrio = a.priority || 'P2';
        const bPrio = b.priority || 'P2';
        
        if (priorityOrder[aPrio] !== priorityOrder[bPrio]) {
          return priorityOrder[aPrio] - priorityOrder[bPrio];
        }
        
        // 4. 同优先级按创建时间降序排序
        return b.createdAt - a.createdAt;
      });
  }, [todos, filter, timeFilter, activeGroupId]);

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
        {/* API Docs - 仅在 Web 端显示 */}
        {!isNativeApp && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push('/api-docs')}
            className="p-3 bg-purple-600 dark:bg-purple-500 text-white backdrop-blur-xl rounded-2xl shadow-xl hover:shadow-2xl hover:bg-purple-700 dark:hover:bg-purple-400 transition-all duration-300 cursor-pointer"
            title="API Docs"
          >
            <Code2 size={22} strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      {/* Hero Section with Logo */}
      <section className="w-full pt-12 sm:pt-16 pb-8 sm:pb-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <StarkLogo logoText={settings.logoText} />
        </div>
      </section>

      {/* Main Content */}
      <div className={`max-w-3xl mx-auto px-4 sm:px-6 ${isMobile ? 'pb-32' : 'pb-24'}`}>
        {/* Stats Cards Pro Max - 可点击筛选 */}
        <div className="grid grid-cols-3 gap-3 sm:gap-6 mb-8 sm:mb-12">
          {[
            { label: t.all, value: stats.total, filterValue: 'all' as const, color: 'slate', delay: 0.1 },
            { label: t.active, value: stats.active, filterValue: 'active' as const, color: 'amber', delay: 0.2 },
            { label: t.completed, value: stats.completed, filterValue: 'completed' as const, color: 'emerald', delay: 0.3 },
          ].map((stat) => (
            <motion.button
              key={stat.label}
              onClick={() => setFilter(stat.filterValue)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: stat.delay }}
              className={`p-4 sm:p-6 rounded-3xl hover-lift ring-1 ring-inset transition-all cursor-pointer text-left ${
                filter === stat.filterValue
                  ? stat.color === 'slate'
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 ring-transparent shadow-xl'
                    : stat.color === 'amber'
                    ? 'bg-amber-500 text-white ring-transparent shadow-xl shadow-amber-500/30'
                    : 'bg-emerald-500 text-white ring-transparent shadow-xl shadow-emerald-500/30'
                  : 'glass-card ring-white/50 dark:ring-white/5'
              }`}
            >
              <div className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest mb-2 ${
                filter === stat.filterValue ? 'opacity-80' : 'opacity-60'
              }`}>
                {stat.label}
              </div>
              <div className="text-2xl sm:text-4xl font-black tabular-nums tracking-tighter">
                {stat.value}
              </div>
            </motion.button>
          ))}
        </div>

        {/* Add Task Card Pro Max - Desktop Only */}
        {!isMobile && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-2 rounded-[2rem] mb-10 sm:mb-12 shadow-2xl ring-1 ring-black/5 dark:ring-white/10"
          >
            <form onSubmit={addTodo} className="space-y-2">
              <div className="flex gap-2 p-1">
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
              </div>
              
              <div className="flex flex-wrap items-center gap-3 px-4 pb-3">
                {/* Group Selector - 仅在启用分组功能时显示 */}
                {settings.enableGroups && (
                  <div className="relative group/select">
                    <select
                      value={selectedGroupId}
                      onChange={(e) => setSelectedGroupId(e.target.value)}
                      className="appearance-none bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold uppercase tracking-widest pl-8 pr-8 py-2 rounded-xl cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none ring-1 ring-slate-200 dark:ring-slate-700"
                    >
                      {groups.map((g, idx) => (
                        <option key={`${g.id}-${idx}`} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                    <List className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  </div>
                )}

                {/* Priority Selector - 仅在启用优先级功能时显示 */}
                {settings.enablePriority && (
                  <div className="flex gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl ring-1 ring-slate-200 dark:ring-slate-700">
                    {(['P0', 'P1', 'P2'] as Priority[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => {
                          setSelectedPriority(p);
                          hapticFeedback('light');
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                          selectedPriority === p
                            ? p === 'P0' ? 'bg-red-500 text-white shadow-lg' :
                              p === 'P1' ? 'bg-amber-500 text-white shadow-lg' :
                              'bg-blue-500 text-white shadow-lg'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}

                {/* Manage Groups Trigger - 仅在启用分组功能时显示 */}
                {settings.enableGroups && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsGroupModalOpen(true);
                      hapticFeedback('light');
                    }}
                    className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    title={t.manageGroups}
                  >
                    <FolderPlus size={18} />
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        )}

        {/* User Group Tabs - 仅显示用户自定义分组 */}
        {settings.enableGroups && groups.length > 0 && (
          <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2 no-scrollbar">
            <button
              onClick={() => setActiveGroupId('all')}
              className={`whitespace-nowrap px-5 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
                activeGroupId === 'all'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              {t.all}
            </button>
            {groups.map((g, idx) => (
              <button
                key={`${g.id}-${idx}`}
                onClick={() => setActiveGroupId(g.id)}
                className={`whitespace-nowrap px-5 py-2 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  activeGroupId === g.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

        {/* Time Filter Tabs - 过去/今天/未来 */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-2 mb-8 bg-slate-100/50 dark:bg-slate-900/50 p-1.5 rounded-2xl w-fit mx-auto backdrop-blur-sm border border-slate-200/50 dark:border-slate-800/50 shadow-inner"
        >
          {([
            { value: 'all' as const, label: settings.language === 'zh' ? '全部' : 'All', color: 'slate' },
            { value: 'past' as const, label: settings.language === 'zh' ? '过去' : 'Past', color: 'red' },
            { value: 'today' as const, label: settings.language === 'zh' ? '今天' : 'Today', color: 'amber' },
            { value: 'future' as const, label: settings.language === 'zh' ? '未来' : 'Future', color: 'emerald' },
          ]).map((item) => (
            <button
              key={item.value}
              onClick={() => setTimeFilter(item.value)}
              className={`relative px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 cursor-pointer ${
                timeFilter === item.value 
                  ? 'text-white' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {timeFilter === item.value && (
                <motion.div
                  layoutId="time-filter"
                  className={`absolute inset-0 rounded-xl shadow-md ${
                    item.color === 'slate' ? 'bg-slate-800 dark:bg-slate-700' :
                    item.color === 'red' ? 'bg-red-500' :
                    item.color === 'amber' ? 'bg-amber-500' :
                    'bg-emerald-500'
                  }`}
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </button>
          ))}
        </motion.div>

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
                filteredTodos.map((todo) => (
                    <motion.div
                      key={todo.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                      className={`glass-card p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[1.75rem] hover-lift group relative overflow-hidden ${
                        todo.completed ? 'opacity-60 grayscale-[0.5]' : ''
                      }`}
                    >
                      {/* Priority left border indicator for mobile */}
                      {isMobile && todo.priority && (
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                          todo.priority === 'P0' ? 'bg-red-500' :
                          todo.priority === 'P1' ? 'bg-amber-500' :
                          'bg-blue-500'
                        }`} />
                      )}

                      <div className="flex items-center gap-3 sm:gap-6">
                        <motion.button
                          whileTap={{ scale: 0.8 }}
                          onClick={() => {
                            toggleTodo(todo.id, todo.completed);
                            hapticFeedback('light');
                          }}
                          className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 flex items-center justify-center transition-all duration-500 cursor-pointer ${
                            todo.completed 
                              ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-500/20' 
                              : 'border-slate-300 dark:border-slate-600 hover:border-blue-500 dark:hover:border-blue-400'
                          }`}
                        >
                          {todo.completed && <CheckCheck className="text-white" size={isMobile ? 14 : 18} strokeWidth={3} />}
                        </motion.button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5 sm:mb-1">
                            {/* Priority Indicator - Desktop Only (Mobile uses left bar) */}
                            {!isMobile && settings.enablePriority && todo.priority && (
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                todo.priority === 'P0' ? 'bg-red-500 text-white shadow-sm' :
                                todo.priority === 'P1' ? 'bg-amber-500 text-white shadow-sm' :
                                'bg-blue-500 text-white shadow-sm'
                              }`}>
                                {todo.priority}
                              </span>
                            )}
                            {/* Group Tag */}
                            {settings.enableGroups && todo.groupId && todo.groupId !== DEFAULT_GROUP_ID && (
                              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full text-[8px] sm:text-[9px] font-bold uppercase tracking-widest ring-1 ring-slate-200 dark:ring-slate-700">
                                {groups.find(g => g.id === todo.groupId)?.name || '...'}
                              </span>
                            )}
                          </div>

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
                                className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-xl px-3 py-1.5 text-base sm:text-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                              />
                              <motion.button
                                whileTap={{ scale: 0.9 }}
                                onClick={() => saveEdit(todo.id)}
                                className="p-1.5 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors cursor-pointer"
                              >
                                <Check size={16} strokeWidth={3} />
                              </motion.button>
                            </div>
                          ) : (
                            // 显示模式
                            <div onClick={() => toggleTodo(todo.id, todo.completed)}>
                              <p
                                className={`text-base sm:text-xl font-semibold mb-0.5 transition-all duration-500 break-words ${
                                  todo.completed
                                    ? 'line-through text-slate-400 dark:text-slate-500 italic'
                                    : 'text-slate-900 dark:text-white'
                                }`}
                              >
                                {todo.text}
                              </p>
                              <div className="flex items-center gap-3 text-[8px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Calendar size={isMobile ? 10 : 12} strokeWidth={2.5} />
                                  {formatDate(todo.createdAt)}
                                </span>
                                {todo.dueDate && (
                                  <span className="flex items-center gap-1 text-orange-500">
                                    <Clock size={isMobile ? 10 : 12} strokeWidth={2.5} />
                                    {formatDueDate(todo.dueDate)}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* 操作按钮 */}
                        {editingId !== todo.id && (
                          <div className="flex items-center gap-0.5 sm:gap-1">
                            {/* Mobile menu button */}
                            <motion.button
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                hapticFeedback('light');
                                if (openMenuId === todo.id) {
                                  setOpenMenuId(null);
                                  setMenuPosition(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setMenuPosition({
                                    top: rect.bottom + 8,
                                    right: window.innerWidth - rect.right
                                  });
                                  setOpenMenuId(todo.id);
                                }
                              }}
                              className="p-2 sm:p-3 rounded-2xl text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 transition-all duration-300 cursor-pointer"
                            >
                              <MoreVertical size={isMobile ? 16 : 18} strokeWidth={2.5} />
                            </motion.button>

                            {/* Desktop only Pencil */}
                            {!isMobile && (
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
                            )}
                            
                            <motion.button
                              whileHover={{ scale: 1.1, backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
                              whileTap={{ scale: 0.9 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTodo(todo.id);
                              }}
                              className="p-2 sm:p-3 rounded-2xl text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400 transition-all duration-300 cursor-pointer"
                            >
                              <Trash2 size={isMobile ? 18 : 20} strokeWidth={2.5} />
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

      {/* Fixed Bottom Nav - 移动端原生 App 使用语音按钮，Web 移动端使用时间筛选 */}
      {isMobile && isNativeApp && (
        <VoiceButton onRefreshTodos={refreshTodosFromAI} />
      )}
      
      {isMobile && !isNativeApp && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-6 left-4 right-4 z-50 p-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-2xl ring-1 ring-black/5 safe-bottom"
        >
          <div className="flex justify-between items-center px-2">
            {([
              { value: 'past' as const, label: settings.language === 'zh' ? '过去' : 'Past', icon: Clock, color: 'red' },
              { value: 'today' as const, label: settings.language === 'zh' ? '今天' : 'Today', icon: Calendar, color: 'amber' },
              { value: 'future' as const, label: settings.language === 'zh' ? '未来' : 'Future', icon: Flag, color: 'emerald' },
            ]).map((item) => (
              <button
                key={item.value}
                onClick={() => setTimeFilter(timeFilter === item.value ? 'all' : item.value)}
                className={`relative flex-1 flex flex-col items-center gap-1 py-3 px-4 rounded-2xl transition-all duration-300 cursor-pointer ${
                  timeFilter === item.value 
                    ? item.color === 'red' ? 'text-red-500' :
                      item.color === 'amber' ? 'text-amber-500' : 'text-emerald-500'
                    : 'text-slate-400 dark:text-slate-600'
                }`}
              >
                {timeFilter === item.value && (
                  <motion.div
                    layoutId="mobile-time-filter"
                    className={`absolute inset-0 rounded-2xl -z-10 ${
                      item.color === 'red' ? 'bg-red-50 dark:bg-red-900/20' :
                      item.color === 'amber' ? 'bg-amber-50 dark:bg-amber-900/20' :
                      'bg-emerald-50 dark:bg-emerald-900/20'
                    }`}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon size={20} strokeWidth={2.5} />
                <span className="text-[10px] font-black uppercase tracking-tighter">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Group Management Modal/Sheet Pro Max */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xl bg-slate-900/40"
            onClick={() => {
              setIsGroupModalOpen(false);
              hapticFeedback('light');
            }}
          >
            <motion.div
              initial={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0, y: 20 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={isMobile ? { y: '100%' } : { scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-card w-full max-w-md p-8 rounded-t-[3rem] sm:rounded-[3rem] shadow-2xl relative overflow-hidden mb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              {/* iOS Style Handle for Bottom Sheet */}
              {isMobile && (
                <div className="flex justify-center mb-6 -mt-2">
                  <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full opacity-50" />
                </div>
              )}

              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                    {t.manageGroups}
                  </h3>
                  <div className="h-1 w-8 bg-blue-500 rounded-full mt-1" />
                </div>
                <button 
                  onClick={() => {
                    setIsGroupModalOpen(false);
                    hapticFeedback('light');
                  }}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Add New Group */}
              <form onSubmit={addGroup} className="flex gap-2 mb-8">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder={t.newGroupName}
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-5 py-3 text-sm font-bold focus:outline-none ring-1 ring-inset ring-slate-200 dark:ring-slate-700 focus:ring-blue-500/50"
                />
                <button
                  type="submit"
                  disabled={!newGroupName.trim() || !isAuthenticated}
                  className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-20 cursor-pointer"
                >
                  <Plus size={20} strokeWidth={3} />
                </button>
              </form>

              {/* Groups List */}
              <div className="space-y-3 max-h-[50vh] sm:max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                {groups.map((g, idx) => (
                  <div 
                    key={`${g.id}-${idx}`} 
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border border-slate-100 dark:border-slate-700/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{g.name}</span>
                    </div>
                    {g.id !== DEFAULT_GROUP_ID && (
                      <button
                        onClick={() => deleteGroup(g.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                      >
                        <Trash2 size={16} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Task Sheet Pro Max (Mobile Only) */}
      <AnimatePresence>
        {isAddSheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center backdrop-blur-xl bg-slate-900/40"
            onClick={() => setIsAddSheetOpen(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="glass-card w-full p-8 rounded-t-[3rem] shadow-2xl relative overflow-hidden mb-safe"
              onClick={(e) => e.stopPropagation()}
            >
              {/* iOS Style Handle */}
              <div className="flex justify-center mb-6 -mt-2">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full opacity-50" />
              </div>

              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">
                  {t.addTask}
                </h3>
                <button 
                  onClick={() => setIsAddSheetOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={addTodo} className="space-y-6">
                <div className="relative">
                  <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={t.addTaskPlaceholder}
                    autoFocus
                    className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-6 py-5 text-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ring-1 ring-inset ring-slate-200 dark:ring-slate-700 transition-all"
                  />
                </div>

                <div className="flex flex-col gap-4">
                  {/* Group Selection */}
                  {settings.enableGroups && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">{t.groups}</p>
                      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                        {groups.map((g, idx) => (
                          <button
                            key={`${g.id}-${idx}`}
                            type="button"
                            onClick={() => {
                              setSelectedGroupId(g.id);
                              hapticFeedback('light');
                            }}
                            className={`whitespace-nowrap px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                              selectedGroupId === g.id
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Priority Selection */}
                  {settings.enablePriority && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2">{t.priority}</p>
                      <div className="grid grid-cols-3 gap-3">
                        {(['P0', 'P1', 'P2'] as Priority[]).map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setSelectedPriority(p);
                              hapticFeedback('light');
                            }}
                            className={`py-3 rounded-xl text-xs font-black transition-all ${
                              selectedPriority === p
                                ? p === 'P0' ? 'bg-red-500 text-white shadow-lg' :
                                  p === 'P1' ? 'bg-amber-500 text-white shadow-lg' :
                                  'bg-blue-500 text-white shadow-lg'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!inputValue.trim()}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-20"
                >
                  {t.addTask}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Add Button (Mobile Only) */}
      {isMobile && !isAddSheetOpen && (
        <motion.button
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            setIsAddSheetOpen(true);
            hapticFeedback('medium');
          }}
          className="fixed bottom-24 right-6 z-[60] w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:bg-blue-700 active:bg-blue-800 ring-4 ring-white dark:ring-slate-900"
        >
          <Plus size={32} strokeWidth={3} />
        </motion.button>
      )}

      {/* Fixed Position Menu Portal */}
      <AnimatePresence>
        {openMenuId && menuPosition && (
          <>
            {/* 点击外部关闭菜单的遮罩层 */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100]" 
              onClick={() => {
                setOpenMenuId(null);
                setMenuPosition(null);
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.15 }}
              className="fixed z-[101] min-w-[180px]"
              style={{
                top: menuPosition.top,
                right: menuPosition.right
              }}
            >
              {(() => {
                const selectedTodo = todos.find(t => t.id === openMenuId);
                if (!selectedTodo) return null;
                return (
                  <div className="glass-card p-3 rounded-2xl shadow-2xl ring-1 ring-black/5 dark:ring-white/10 flex flex-col gap-2 backdrop-blur-xl bg-white/90 dark:bg-slate-900/90">
                    {/* Priority Section - 仅在启用时显示 */}
                    {settings.enablePriority && (
                      <>
                        <p className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                          {t.priority}
                        </p>
                        <div className="grid grid-cols-3 gap-1.5 mb-1">
                          {(['P0', 'P1', 'P2'] as Priority[]).map((p, idx) => (
                            <button
                              key={`${p}-${idx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTodoPriority(selectedTodo.id, p);
                                setOpenMenuId(null);
                                setMenuPosition(null);
                              }}
                              className={`py-2 rounded-xl text-[10px] font-black transition-all cursor-pointer ${
                                selectedTodo.priority === p 
                                  ? p === 'P0' ? 'bg-red-500 text-white shadow-lg' :
                                    p === 'P1' ? 'bg-amber-500 text-white shadow-lg' :
                                    'bg-blue-500 text-white shadow-lg'
                                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* Groups Section - 仅在启用时显示 */}
                    {settings.enableGroups && (
                      <>
                        <p className="px-2 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2">
                          {t.groups}
                        </p>
                        <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col gap-1">
                          {groups.map((g, idx) => (
                            <button
                              key={`${g.id}-${idx}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                updateTodoGroup(selectedTodo.id, g.id);
                                setOpenMenuId(null);
                                setMenuPosition(null);
                              }}
                              className={`px-3 py-2.5 rounded-xl text-[11px] font-bold text-left transition-all cursor-pointer ${
                                selectedTodo.groupId === g.id 
                                  ? 'bg-blue-500 text-white shadow-lg' 
                                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500'
                              }`}
                            >
                              {g.name}
                            </button>
                          ))}
                        </div>
                      </>
                    )}

                    {/* 如果两个功能都关闭，显示提示 */}
                    {!settings.enablePriority && !settings.enableGroups && (
                      <p className="px-3 py-2 text-[11px] text-slate-400">
                        {settings.language === 'zh' ? '请在设置中启用优先级或分组功能' : 'Enable priority or groups in settings'}
                      </p>
                    )}
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* AI Chat 助手 - 仅 Web 端显示 */}
      {!isNativeApp && <AIChat onRefreshTodos={refreshTodosFromAI} />}
    </main>
  );
}
