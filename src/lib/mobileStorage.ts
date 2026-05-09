'use client';

import { Preferences } from '@capacitor/preferences';
import { Todo, Group, ChatSession, ChatMessage } from './types';
import { isCapacitor } from './platform';

// 存储键
const KEYS = {
  TODOS: 'stark_todos',
  GROUPS: 'stark_groups',
  CHAT_SESSION: 'stark_chat_session',
};

async function readJsonOrThrow<T>(response: Response, fallbackMessage: string): Promise<T> {
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    // Preserve status error when the response body is empty.
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

// ==================== Todos ====================

export async function getMobileTodos(): Promise<Todo[]> {
  try {
    const { value } = await Preferences.get({ key: KEYS.TODOS });
    if (value) {
      return JSON.parse(value);
    }
    return [];
  } catch (error) {
    console.error('[MobileStorage] Error getting todos:', error);
    return [];
  }
}

export async function saveMobileTodos(todos: Todo[]): Promise<void> {
  try {
    await Preferences.set({
      key: KEYS.TODOS,
      value: JSON.stringify(todos),
    });
  } catch (error) {
    console.error('[MobileStorage] Error saving todos:', error);
    throw error;
  }
}

// ==================== Groups ====================

export async function getMobileGroups(): Promise<Group[]> {
  try {
    const { value } = await Preferences.get({ key: KEYS.GROUPS });
    if (value) {
      return JSON.parse(value);
    }
    // 默认分组
    return [{ id: 'default', name: 'Default', createdAt: Date.now() }];
  } catch (error) {
    console.error('[MobileStorage] Error getting groups:', error);
    return [{ id: 'default', name: 'Default', createdAt: Date.now() }];
  }
}

export async function saveMobileGroups(groups: Group[]): Promise<void> {
  try {
    await Preferences.set({
      key: KEYS.GROUPS,
      value: JSON.stringify(groups),
    });
  } catch (error) {
    console.error('[MobileStorage] Error saving groups:', error);
    throw error;
  }
}

// ==================== Chat Session ====================

export async function getMobileChatSession(): Promise<ChatSession> {
  try {
    const { value } = await Preferences.get({ key: KEYS.CHAT_SESSION });
    if (value) {
      return JSON.parse(value);
    }
    // 创建新的会话
    return {
      id: crypto.randomUUID(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  } catch (error) {
    console.error('[MobileStorage] Error getting chat session:', error);
    return {
      id: crypto.randomUUID(),
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}

export async function saveMobileChatSession(session: ChatSession): Promise<void> {
  try {
    await Preferences.set({
      key: KEYS.CHAT_SESSION,
      value: JSON.stringify(session),
    });
  } catch (error) {
    console.error('[MobileStorage] Error saving chat session:', error);
    throw error;
  }
}

export async function addMobileChatMessage(message: ChatMessage): Promise<ChatSession> {
  const session = await getMobileChatSession();
  session.messages.push(message);
  session.updatedAt = Date.now();
  await saveMobileChatSession(session);
  return session;
}

export async function clearMobileChatSession(): Promise<ChatSession> {
  const newSession: ChatSession = {
    id: crypto.randomUUID(),
    messages: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveMobileChatSession(newSession);
  return newSession;
}

// ==================== 统一 API ====================

// 根据平台选择存储方式
export function useStorage() {
  const isMobile = isCapacitor();
  
  return {
    isMobile,
    
    // Todos
    getTodos: isMobile 
      ? getMobileTodos 
      : async () => readJsonOrThrow<Todo[]>(await fetch('/api/todos'), 'Failed to fetch todos'),
    
    saveTodo: isMobile
      ? async (todo: Partial<Todo> & { text: string }) => {
          const todos = await getMobileTodos();
          const newTodo: Todo = {
            id: crypto.randomUUID(),
            text: todo.text,
            completed: false,
            createdAt: Date.now(),
            groupId: todo.groupId || 'default',
            priority: todo.priority || 'P2',
            dueDate: todo.dueDate,
          };
          todos.push(newTodo);
          await saveMobileTodos(todos);
          return newTodo;
        }
      : async (todo: Partial<Todo> & { text: string }) => {
          const response = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(todo),
          });
          return readJsonOrThrow<Todo>(response, 'Failed to save todo');
        },
    
    updateTodo: isMobile
      ? async (id: string, updates: Partial<Todo>) => {
          const todos = await getMobileTodos();
          const index = todos.findIndex(t => t.id === id);
          if (index !== -1) {
            todos[index] = { ...todos[index], ...updates };
            await saveMobileTodos(todos);
            return todos[index];
          }
          return null;
        }
      : async (id: string, updates: Partial<Todo>) => {
          const response = await fetch('/api/todos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, ...updates }),
          });
          return readJsonOrThrow<Todo>(response, 'Failed to update todo');
        },
    
    deleteTodo: isMobile
      ? async (id: string) => {
          const todos = await getMobileTodos();
          const index = todos.findIndex(t => t.id === id);
          if (index !== -1) {
            todos[index].deleted = true;
            todos[index].deletedAt = Date.now();
            await saveMobileTodos(todos);
          }
        }
      : async (id: string) => {
          await ensureOk(await fetch(`/api/todos?id=${id}`, { method: 'DELETE' }), 'Failed to delete todo');
        },
    
    // Groups
    getGroups: isMobile
      ? getMobileGroups
      : async () => readJsonOrThrow<Group[]>(await fetch('/api/groups'), 'Failed to fetch groups'),
    
    saveGroup: isMobile
      ? async (name: string) => {
          const groups = await getMobileGroups();
          const newGroup: Group = {
            id: crypto.randomUUID(),
            name,
            createdAt: Date.now(),
          };
          groups.push(newGroup);
          await saveMobileGroups(groups);
          return newGroup;
        }
      : async (name: string) => {
          const response = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name }),
          });
          return readJsonOrThrow<Group>(response, 'Failed to save group');
        },
    
    deleteGroup: isMobile
      ? async (id: string) => {
          const groups = await getMobileGroups();
          const filteredGroups = groups.filter(g => g.id !== id);
          await saveMobileGroups(filteredGroups);
          // 将该分组下的任务移到默认分组
          const todos = await getMobileTodos();
          const updatedTodos = todos.map(t => 
            t.groupId === id ? { ...t, groupId: 'default' } : t
          );
          await saveMobileTodos(updatedTodos);
        }
      : async (id: string) => {
          await ensureOk(await fetch(`/api/groups?id=${id}`, { method: 'DELETE' }), 'Failed to delete group');
        },
  };
}
