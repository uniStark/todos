'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Todo, Group, Priority, DEFAULT_GROUP_ID } from '@/lib/types';
import { Trash2, Plus, Calendar, Clock, List, Loader, Settings as SettingsIcon, BarChart3, LogOut, X, Github, Heart, Code2, FolderPlus, Flag, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '@/contexts/SettingsContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { translations } from '@/lib/translations';
import { isMobileApp } from '@/lib/platform';
import { getMobileTodos, saveMobileTodos, getMobileGroups } from '@/lib/mobileStorage';
import AuthModal from '@/components/AuthModal';
import TodoItem from '@/components/TodoItem';

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

// 全量刷新（setTodos(serverData)）时，把本地仍处于乐观新增状态、且服务端尚未返回的临时项（temp-）
// 追加回结果末尾，避免并发刷新抹掉未落库的新任务（随后 POST 成功的 tempId 校正会找不到目标而静默丢失）。
function mergeWithPendingTemps(prev: Todo[], serverData: Todo[]): Todo[] {
  const serverIds = new Set(serverData.map((t) => t.id));
  const survivingTemps = prev.filter(
    (t) => t.id.startsWith('temp-') && !serverIds.has(t.id)
  );
  return survivingTemps.length === 0 ? serverData : [...serverData, ...survivingTemps];
}

function resizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) return;

  textarea.style.height = 'auto';
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export default function Home() {
  const router = useRouter();
  const { settings } = useSettings();
  const { isAuthenticated, isChecking, logout } = useAuth();
  const toast = useToast();
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
  // 进行中的操作 id 集合：用于按钮 loading 态 + 去重（防重复点击）。
  // 用 ''(空串) 代表"新增任务"这种没有具体 todo id 的操作。
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  // 用 ref 镜像频繁变化的值（pendingIds/todos/editText/editingId），让操作回调可以读到最新值
  // 而不必把这些放进 useCallback 依赖——否则它们每次变化都会重建回调、破坏 TodoItem 的 memo。
  const pendingIdsRef = useRef(pendingIds);
  pendingIdsRef.current = pendingIds;
  const todosRef = useRef(todos);
  todosRef.current = todos;
  const editTextRef = useRef(editText);
  editTextRef.current = editText;
  const editingIdRef = useRef(editingId);
  editingIdRef.current = editingId;

  const markPending = useCallback((id: string) => {
    setPendingIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const clearPending = useCallback((id: string) => {
    setPendingIds((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  // 菜单开关：稳定回调，供 memo 化的 TodoItem 使用。打开时记录触发按钮位置（fixed 定位）。
  const openMenu = useCallback((id: string, rect: DOMRect) => {
    setMenuPosition({ top: rect.bottom + 8, right: window.innerWidth - rect.right });
    setOpenMenuId(id);
  }, []);

  const closeMenu = useCallback(() => {
    setOpenMenuId(null);
    setMenuPosition(null);
  }, []);

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

  useEffect(() => {
    const textarea = document.querySelector<HTMLTextAreaElement>(`textarea[data-edit-id="${editingId ?? ''}"]`);
    resizeTextarea(textarea);
  }, [editingId, editText]);

  useEffect(() => {
    document
      .querySelectorAll<HTMLTextAreaElement>('textarea[data-auto-resize="todo-input"]')
      .forEach(resizeTextarea);
  }, [inputValue]);

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
        // 保留本地仍处于乐观新增（temp-）状态的项，避免并发刷新（如 deleteGroup 触发）
        // 把尚未落库的临时任务抹掉，导致随后 POST 成功的校正找不到 tempId 静默丢失。
        setTodos((prev) => mergeWithPendingTemps(prev, data));
      }
    } catch (error) {
      console.error('Failed to fetch todos:', error);
      toast.error(t.networkError);
    } finally {
      setIsLoading(false);
    }
  }, [toast, t]);

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
      toast.error(t.networkError);
    }
  }, [toast, t]);

  useEffect(() => {
    // Web 端依赖 cookie session，仅在已登录后加载，避免 401；移动端为本地模式，恒可加载。
    if (isMobileApp() || isAuthenticated) {
      fetchTodos();
      fetchGroups();
    }
  }, [fetchGroups, fetchTodos, isAuthenticated]);

  useEffect(() => {
    // 防御：Web 端登出后（isAuthenticated=false）清空内存中的数据，避免下一个用户登录前残留上一用户的任务/分组。
    // 移动端为本地模式、无登录概念，不参与。
    if (!isMobileApp() && !isAuthenticated) {
      setTodos([]);
      setGroups([]);
      setOpenMenuId(null);
      setMenuPosition(null);
      setEditingId(null);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    // 菜单用 getBoundingClientRect 存的是 fixed 定位，滚动/resize 后会漂移到错误位置——直接关闭。
    if (!openMenuId) return;
    const close = () => closeMenu();
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [openMenuId, closeMenu]);

  useEffect(() => {
    // Detect mobile device
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // md breakpoint
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const addGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newGroupName.trim();
    // 去重：已有新增分组请求进行中时忽略重复提交。
    if (!name || !isAuthenticated || pendingIds.has('add-group')) return;

    markPending('add-group');
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const newGroup = await readJsonOrThrow<Group>(response, 'Failed to add group');
      // 用服务端返回对象（含真实 id/createdAt）写入，避免本地猜测。
      setGroups((prev) => [...prev, newGroup]);
      setNewGroupName('');
      setIsGroupModalOpen(false);
      hapticFeedback('medium');
      toast.success(t.groupAddedToast);
    } catch (error) {
      console.error('Failed to add group:', error);
      toast.error(t.addGroupFailed);
    } finally {
      clearPending('add-group');
    }
  };

  const deleteGroup = async (id: string) => {
    if (id === DEFAULT_GROUP_ID || !isAuthenticated || pendingIds.has(`group-${id}`)) return;

    // 乐观更新：先在本地移除分组并快照，失败时回滚。
    const prevGroups = groups;
    const prevSelected = selectedGroupId;
    const prevActive = activeGroupId;

    markPending(`group-${id}`);
    setGroups((prev) => prev.filter((g) => g.id !== id));
    if (selectedGroupId === id) setSelectedGroupId(DEFAULT_GROUP_ID);
    if (activeGroupId === id) setActiveGroupId('all');

    try {
      const response = await fetch(`/api/groups?id=${id}`, {
        method: 'DELETE',
      });
      await ensureOk(response, 'Failed to delete group');
      hapticFeedback('heavy');
      toast.success(t.groupDeletedToast);
      // 删除分组会改变其下任务的归属，需要从服务端拉取最新任务列表。
      fetchTodos();
    } catch (error) {
      console.error('Failed to delete group:', error);
      // 回滚分组与选择态。
      setGroups(prevGroups);
      setSelectedGroupId(prevSelected);
      setActiveGroupId(prevActive);
      toast.error(t.deleteGroupFailed);
    } finally {
      clearPending(`group-${id}`);
    }
  };

  const addTodo = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const text = inputValue.trim();
    if (!text) return;

    // 冗余保护：Web 端已通过登录 gate 才能进入；移动端 isAuthenticated 恒 true，不会阻断。
    if (!isNativeApp && !isAuthenticated) {
      return;
    }

    if (isNativeApp) {
      // 移动端使用本地存储（保持原逻辑，不引入乐观更新/回滚）
      try {
        const currentTodos = await getMobileTodos();
        const newTodo: Todo = {
          id: crypto.randomUUID(),
          text,
          completed: false,
          createdAt: Date.now(),
          groupId: settings.enableGroups ? selectedGroupId : 'default',
          priority: settings.enablePriority ? selectedPriority : 'P2',
        };
        currentTodos.push(newTodo);
        await saveMobileTodos(currentTodos);
        setTodos(currentTodos.filter((t) => !t.deleted));
        setInputValue('');
        setIsAddSheetOpen(false);
        hapticFeedback('medium');
      } catch (error) {
        console.error('Failed to add todo:', error);
      }
      return;
    }

    // 去重：已有新增请求进行中时忽略重复提交。
    if (pendingIds.has('add-todo')) return;

    // Web 端乐观更新：先插入临时 todo，立刻清空输入；成功后用服务端对象校正。
    const tempId = `temp-${crypto.randomUUID()}`;
    const optimisticTodo: Todo = {
      id: tempId,
      text,
      completed: false,
      createdAt: Date.now(),
      groupId: settings.enableGroups ? selectedGroupId : DEFAULT_GROUP_ID,
      priority: settings.enablePriority ? selectedPriority : 'P2',
    };

    markPending('add-todo');
    setTodos((prev) => [...prev, optimisticTodo]);
    setInputValue('');
    setIsAddSheetOpen(false);
    hapticFeedback('medium');

    try {
      const requestBody: Record<string, unknown> = { text };
      if (settings.enableGroups) requestBody.groupId = selectedGroupId;
      if (settings.enablePriority) requestBody.priority = selectedPriority;

      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      const newTodo = await readJsonOrThrow<Todo>(response, 'Failed to add todo');
      // upsert：命中临时项则替换为服务端对象；若并发刷新已抹掉临时项（且未被 mergeWithPendingTemps 兜住），
      // 则按 newTodo.id 命中替换；都未命中则追加，确保新任务绝不丢失。
      setTodos((prev) => {
        if (prev.some((t) => t.id === tempId)) {
          return prev.map((t) => (t.id === tempId ? newTodo : t));
        }
        if (prev.some((t) => t.id === newTodo.id)) {
          return prev.map((t) => (t.id === newTodo.id ? newTodo : t));
        }
        return [...prev, newTodo];
      });
    } catch (error) {
      console.error('Failed to add todo:', error);
      // 回滚：移除临时 todo，并把输入还原方便重试。
      setTodos((prev) => prev.filter((t) => t.id !== tempId));
      setInputValue(text);
      toast.error(t.addTodoFailed);
    } finally {
      clearPending('add-todo');
    }
  }, [inputValue, isAuthenticated, selectedGroupId, selectedPriority, settings.enableGroups, settings.enablePriority, isNativeApp, hapticFeedback, pendingIds, markPending, clearPending, toast, t]);

  const toggleTodo = useCallback(async (id: string, completed: boolean) => {
    // 冗余保护：Web 端已通过登录 gate 才能进入；移动端 isAuthenticated 恒 true，不会阻断。
    if (!isNativeApp && !isAuthenticated) {
      return;
    }

    if (isNativeApp) {
      // 移动端使用本地存储（保持原逻辑）
      try {
        const currentTodos = await getMobileTodos();
        const index = currentTodos.findIndex((t) => t.id === id);
        if (index !== -1) {
          currentTodos[index].completed = !completed;
          if (!completed) {
            currentTodos[index].completedAt = Date.now();
          } else {
            delete currentTodos[index].completedAt;
          }
          await saveMobileTodos(currentTodos);
          setTodos(currentTodos.filter((t) => !t.deleted));
        }
        hapticFeedback('light');
      } catch (error) {
        console.error('Failed to toggle todo:', error);
      }
      return;
    }

    // 去重：同一 todo 正在切换时忽略重复点击。临时 todo（未落库）也不允许操作。
    if (pendingIdsRef.current.has(id) || id.startsWith('temp-')) return;

    // Web 端乐观更新：立即翻转完成态（含 completedAt），失败回滚。
    const newCompleted = !completed;
    markPending(id);
    // 在函数式更新里捕获操作前的整条 todo，失败时整体还原（含 completedAt，避免回滚丢字段）
    let prevTodo: Todo | undefined;
    setTodos((prev) => {
      prevTodo = prev.find((td) => td.id === id);
      return prev.map((t) =>
        t.id === id
          ? {
              ...t,
              completed: newCompleted,
              ...(newCompleted ? { completedAt: Date.now() } : { completedAt: undefined }),
            }
          : t
      );
    });
    hapticFeedback('light');

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, completed: newCompleted }),
      });
      const updatedTodo = await readJsonOrThrow<Todo>(response, 'Failed to toggle todo');
      // 用服务端规范化数据校正（如真实 completedAt）。
      setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
      // 仅在“未完成→完成”且请求成功后轻提示；“取消完成”不打扰。
      if (newCompleted) {
        toast.success(t.todoCompletedToast);
      }
    } catch (error) {
      console.error('Failed to toggle todo:', error);
      // 整体还原操作前的快照（含 completedAt 等字段），函数式更新避免覆盖并发操作。
      setTodos((prev) => prev.map((td) => (td.id === id && prevTodo ? prevTodo : td)));
      toast.error(t.toggleTodoFailed);
    } finally {
      clearPending(id);
    }
  }, [isAuthenticated, isNativeApp, hapticFeedback, markPending, clearPending, toast, t]);

  const deleteTodo = useCallback(async (id: string) => {
    // 冗余保护：Web 端已通过登录 gate 才能进入；移动端 isAuthenticated 恒 true，不会阻断。
    if (!isNativeApp && !isAuthenticated) {
      return;
    }

    if (isNativeApp) {
      // 移动端使用本地存储（软删除，保持原逻辑）
      try {
        const currentTodos = await getMobileTodos();
        const index = currentTodos.findIndex((t) => t.id === id);
        if (index !== -1) {
          currentTodos[index].deleted = true;
          currentTodos[index].deletedAt = Date.now();
          await saveMobileTodos(currentTodos);
          setTodos(currentTodos.filter((t) => !t.deleted));
        }
        hapticFeedback('heavy');
      } catch (error) {
        console.error('Failed to delete todo:', error);
      }
      return;
    }

    // 去重：同一 todo 删除进行中时忽略重复点击；临时 todo 不允许删除。
    if (pendingIdsRef.current.has(id) || id.startsWith('temp-')) return;

    // Web 端乐观更新：记录被删项及其位置，先本地移除，失败时按原位置还原。
    let removedTodo: Todo | undefined;
    let removedIndex = -1;
    markPending(id);
    setTodos((prev) => {
      removedIndex = prev.findIndex((t) => t.id === id);
      if (removedIndex === -1) return prev;
      removedTodo = prev[removedIndex];
      return prev.filter((t) => t.id !== id);
    });
    hapticFeedback('heavy');

    try {
      const response = await fetch(`/api/todos?id=${id}`, {
        method: 'DELETE',
      });
      await ensureOk(response, 'Failed to delete todo');
      toast.success(t.todoDeletedToast);
    } catch (error) {
      console.error('Failed to delete todo:', error);
      // 回滚：把被删 todo 插回原位置（函数式，避免覆盖并发操作）。
      if (removedTodo) {
        const restored = removedTodo;
        const at = removedIndex;
        setTodos((prev) => {
          if (prev.some((t) => t.id === restored.id)) return prev;
          const next = [...prev];
          next.splice(Math.min(at, next.length), 0, restored);
          return next;
        });
      }
      toast.error(t.deleteTodoFailed);
    } finally {
      clearPending(id);
    }
  }, [isAuthenticated, isNativeApp, hapticFeedback, markPending, clearPending, toast, t]);

  // 开始编辑
  const startEdit = useCallback((id: string, text: string) => {
    // 冗余保护：Web 端已通过登录 gate 才能进入；移动端 isAuthenticated 恒 true，不会阻断。
    if (!isNativeApp && !isAuthenticated) {
      return;
    }
    setEditingId(id);
    setEditText(text);
  }, [isAuthenticated, isNativeApp]);

  // 取消编辑
  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditText('');
  }, []);

  // 保存编辑
  const saveEdit = useCallback(async (id: string, updates: Partial<Todo> = {}) => {
    // 冗余保护：Web 端已通过登录 gate 才能进入；移动端 isAuthenticated 恒 true，不会阻断。
    if (!isNativeApp && !isAuthenticated) {
      return;
    }
    
    const todo = todosRef.current.find(t => t.id === id);
    if (!todo) return;

    const currentEditingId = editingIdRef.current;
    const currentEditText = editTextRef.current;
    const finalUpdates = {
      id,
      text: updates.text || (id === currentEditingId ? currentEditText.trim() : todo.text),
      ...updates
    };

    if (id === currentEditingId && !currentEditText.trim() && !updates.text) {
      cancelEdit();
      return;
    }

    if (isNativeApp) {
      // 移动端使用本地存储（保持原逻辑）
      try {
        const currentTodos = await getMobileTodos();
        const index = currentTodos.findIndex((t) => t.id === id);
        if (index !== -1) {
          currentTodos[index] = { ...currentTodos[index], ...finalUpdates };
          await saveMobileTodos(currentTodos);
          setTodos(currentTodos.filter((t) => !t.deleted));
        }
        if (id === currentEditingId) cancelEdit();
        hapticFeedback('medium');
      } catch (error) {
        console.error('Failed to update todo:', error);
      }
      return;
    }

    // 去重：同一 todo 更新进行中时忽略；临时 todo（未落库）不允许更新。
    if (pendingIdsRef.current.has(id) || id.startsWith('temp-')) return;

    // Web 端乐观更新：先本地合并（含 text/priority/groupId 等跨组移动），快照原值供回滚。
    const prevTodo = todo;
    markPending(id);
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...finalUpdates } : t))
    );
    if (id === currentEditingId) cancelEdit();
    hapticFeedback('medium');

    try {
      const response = await fetch('/api/todos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalUpdates),
      });
      const updatedTodo = await readJsonOrThrow<Todo>(response, 'Failed to update todo');
      // 用服务端规范化数据校正。
      setTodos((prev) => prev.map((t) => (t.id === id ? updatedTodo : t)));
    } catch (error) {
      console.error('Failed to update todo:', error);
      // 回滚到操作前的完整快照（含 groupId/priority/text）。
      setTodos((prev) => prev.map((t) => (t.id === id ? prevTodo : t)));
      toast.error(t.updateTodoFailed);
    } finally {
      clearPending(id);
    }
  }, [cancelEdit, isAuthenticated, isNativeApp, hapticFeedback, markPending, clearPending, toast, t]);

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
        // 同 fetchTodos：保留本地仍 pending 的乐观新增项，避免被整表覆盖抹掉。
        const fresh = todosData.filter((t: Todo) => !t.deleted);
        setTodos((prev) => mergeWithPendingTemps(prev, fresh));

        const groupsResponse = await fetch('/api/groups');
        const groupsData = await readJsonOrThrow<Group[]>(groupsResponse, 'Failed to refresh groups');
        setGroups(groupsData);
      }

      console.log('[AI] Refreshed todos and groups');
    } catch (error) {
      console.error('Failed to refresh from AI:', error);
      toast.error(t.refreshFailed);
    }
  }, [isNativeApp, toast, t]);

  const formatDate = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      return settings.language === 'zh' ? '时间未知' : 'Unknown time';
    }

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
  }, [settings.language, settings.timezone]);

  // 格式化截止日期（支持时间）
  const formatDueDate = useCallback((dueDate: string): string => {
    const datePattern = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?$/;
    if (!datePattern.test(dueDate)) {
      const parsedDate = new Date(dueDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return dueDate;
      }

      try {
        return parsedDate.toLocaleString(settings.language === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          timeZone: settings.timezone,
        });
      } catch {
        return parsedDate.toLocaleString(settings.language === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'numeric',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    }

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
  }, [settings.language, settings.timezone]);

  // 使用 useMemo 优化计算
  const filteredTodos = useMemo(() => {
    // 用用户时区计算"今天/明天"的本地日期（YYYY-MM-DD），避免用 UTC 的 toISOString 在东八区凌晨错判。
    // en-CA 的 toLocaleDateString 输出即为 YYYY-MM-DD。
    const localDate = (d: Date) => {
      try {
        return d.toLocaleDateString('en-CA', { timeZone: settings.timezone });
      } catch {
        return d.toLocaleDateString('en-CA');
      }
    };
    const todayStr = localDate(new Date());
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = localDate(tomorrow);

    return todos
      .filter((todo) => {
        // 状态过滤（全部/进行中/已完成）
        const matchesFilter = 
          filter === 'active' ? !todo.completed :
          filter === 'completed' ? todo.completed : true;
        
        // 时间过滤（过去/今天/未来）
        let matchesTime = true;

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
  }, [todos, filter, timeFilter, activeGroupId, settings.timezone]);

  // 分组 id→名称映射：供 TodoItem 取标签名。传字符串而非整个 groups 数组，避免破坏 memo。
  const groupNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of groups) m.set(g.id, g.name);
    return m;
  }, [groups]);

  const stats = useMemo(() => ({
    total: todos.length,
    active: todos.filter((t) => !t.completed).length,
    completed: todos.filter((t) => t.completed).length,
  }), [todos]);

  // 登录 gate（仅 Web 端）：探测中显示加载态，未登录展示登录/注册界面，不加载任何数据。
  // 用 isMobileApp() 直接判断，避免移动端首帧（isNativeApp 状态尚未由 effect 置位）误入 gate。
  if (!isMobileApp()) {
    if (isChecking) {
      return (
        <main className="min-h-[100dvh] bg-light-primary flex items-center justify-center transition-colors duration-500">
          <Loader className="animate-spin text-blue-500" size={40} />
        </main>
      );
    }
    if (!isAuthenticated) {
      return <AuthModal />;
    }
  }

  return (
    <main className="min-h-[100dvh] bg-light-primary transition-colors duration-500 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      {/* Settings & Analytics Buttons (Fixed Top Right) — 顶部避开灵动岛、右侧避开圆角安全区 */}
      <div className="fixed top-[max(1rem,env(safe-area-inset-top))] right-[max(1rem,env(safe-area-inset-right))] sm:top-[max(1.5rem,env(safe-area-inset-top))] sm:right-[max(1.5rem,env(safe-area-inset-right))] z-40 flex flex-col gap-3">
        {/* Logout（仅 Web 端；移动端为本地模式，无登录概念） */}
        {!isNativeApp && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => logout()}
            className="p-3 backdrop-blur-xl rounded-2xl border shadow-xl hover:shadow-2xl transition-all duration-300 cursor-pointer bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-300 dark:border-emerald-700"
            title={t.logout}
          >
            <LogOut size={22} className="text-emerald-600 dark:text-emerald-400" />
          </motion.button>
        )}
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
        {/* API Docs - 仅在 Web 端 + 设置开启时显示 */}
        {!isNativeApp && settings.showApiDocs && (
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
                <textarea
                  data-auto-resize="todo-input"
                  value={inputValue}
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    resizeTextarea(e.currentTarget);
                  }}
                  placeholder={t.addTaskPlaceholder}
                  onKeyDown={(e) => {
                    // ⌘/Ctrl + Enter 提交；普通 Enter 仍为换行
                    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                  rows={1}
                  className="flex-1 min-h-[56px] max-h-40 resize-none overflow-hidden bg-transparent border-none rounded-2xl px-5 py-4 text-base sm:text-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-0 transition-all"
                />
                <div className="relative group/addbtn">
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || (!isNativeApp && pendingIds.has('add-todo'))}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 sm:px-8 py-4 rounded-[1.5rem] font-bold flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer shadow-lg active:scale-95 hover:shadow-xl"
                  >
                    {!isNativeApp && pendingIds.has('add-todo') ? (
                      <Loader size={22} strokeWidth={3} className="animate-spin" />
                    ) : (
                      <Plus size={22} strokeWidth={3} />
                    )}
                    <span className="hidden sm:inline text-sm uppercase tracking-wider">{t.addTask}</span>
                  </button>
                  {/* 悬浮提示快捷键（仅桌面有鼠标时有意义）*/}
                  <span className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 z-20 hidden md:block whitespace-nowrap rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-semibold px-2.5 py-1.5 opacity-0 group-hover/addbtn:opacity-100 transition-opacity duration-200 shadow-xl">
                    ⌘ + Enter
                    <span className="absolute top-full left-1/2 -mt-1 -translate-x-1/2 w-2 h-2 rotate-45 bg-slate-900 dark:bg-white" />
                  </span>
                </div>
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
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    isMobile={isMobile}
                    isNativeApp={isNativeApp}
                    isPending={pendingIds.has(todo.id)}
                    isEditing={editingId === todo.id}
                    isMenuOpen={openMenuId === todo.id}
                    editText={editingId === todo.id ? editText : ''}
                    groupName={todo.groupId ? groupNameById.get(todo.groupId) ?? null : null}
                    language={settings.language}
                    enablePriority={settings.enablePriority}
                    enableGroups={settings.enableGroups}
                    onToggle={toggleTodo}
                    onDelete={deleteTodo}
                    onStartEdit={startEdit}
                    onSaveEdit={saveEdit}
                    onCancelEdit={cancelEdit}
                    onEditTextChange={setEditText}
                    onOpenMenu={openMenu}
                    onCloseMenu={closeMenu}
                    hapticFeedback={hapticFeedback}
                    formatDate={formatDate}
                    formatDueDate={formatDueDate}
                    resizeTextarea={resizeTextarea}
                  />
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
          href="https://github.com/uniStark/todos"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-slate-100/50 dark:bg-slate-800/30 border border-slate-200/50 dark:border-slate-700/30 backdrop-blur-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 cursor-pointer group"
        >
          <Github size={18} strokeWidth={2} className="group-hover:scale-110 transition-transform" />
          <span className="text-xs font-bold uppercase tracking-widest">Open Source on GitHub</span>
          <Heart size={14} strokeWidth={2.5} className="text-red-400 group-hover:text-red-500 group-hover:scale-125 transition-all" />
        </a>
        <p className="mt-4 text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          Made with <span className="text-red-400">♥</span> by Adrian Stark
        </p>
        <p className="mt-2 text-[10px] font-medium text-slate-400 dark:text-slate-500 tracking-widest">
          © 2026 STARK. Fueled by coffee.
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
                  disabled={!newGroupName.trim() || !isAuthenticated || pendingIds.has('add-group')}
                  className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all disabled:opacity-20 cursor-pointer"
                >
                  {pendingIds.has('add-group') ? (
                    <Loader size={20} strokeWidth={3} className="animate-spin" />
                  ) : (
                    <Plus size={20} strokeWidth={3} />
                  )}
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
                  <textarea
                    data-auto-resize="todo-input"
                    value={inputValue}
                    onChange={(e) => {
                      setInputValue(e.target.value);
                      resizeTextarea(e.currentTarget);
                    }}
                    placeholder={t.addTaskPlaceholder}
                    onKeyDown={(e) => {
                      // ⌘/Ctrl + Enter 提交；普通 Enter 仍为换行
                      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                        e.preventDefault();
                        e.currentTarget.form?.requestSubmit();
                      }
                    }}
                    autoFocus
                    rows={1}
                    className="w-full min-h-[64px] max-h-48 resize-none overflow-hidden bg-slate-100 dark:bg-slate-800 border-none rounded-2xl px-6 py-5 text-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ring-1 ring-inset ring-slate-200 dark:ring-slate-700 transition-all"
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
                  disabled={!inputValue.trim() || (!isNativeApp && pendingIds.has('add-todo'))}
                  className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-5 rounded-2xl font-black text-lg uppercase tracking-widest transition-all shadow-xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-2"
                >
                  {!isNativeApp && pendingIds.has('add-todo') && (
                    <Loader size={20} strokeWidth={3} className="animate-spin" />
                  )}
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
          className="fixed bottom-24 right-[max(1.5rem,env(safe-area-inset-right))] z-[60] w-16 h-16 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center transition-all hover:bg-blue-700 active:bg-blue-800 ring-4 ring-white dark:ring-slate-900"
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
