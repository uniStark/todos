'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { isMobileApp } from '@/lib/platform';

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  allowRegistration: boolean;
  requireInvite: boolean;
  isChecking: boolean;
  login: (username: string, password: string) => Promise<AuthResult>;
  register: (username: string, password: string, inviteCode?: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<AuthResult>;
  // 向后兼容：旧调用点仍可能引用，但 cookie 同源自动携带，无需任何头部。
  getAuthHeaders: () => Record<string, string>;
}

// 默认值，用于 SSR
const defaultContextValue: AuthContextType = {
  isAuthenticated: false,
  username: null,
  allowRegistration: false,
  requireInvite: false,
  isChecking: true,
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  logout: async () => {},
  refresh: async () => {},
  changePassword: async () => ({ ok: false }),
  getAuthHeaders: () => ({}),
};

const AuthContext = createContext<AuthContextType>(defaultContextValue);

async function extractError(response: Response, fallback: string): Promise<string> {
  try {
    const data = await response.json();
    if (data && typeof data.error === 'string') return data.error;
  } catch {
    // ignore malformed body
  }
  return fallback;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [allowRegistration, setAllowRegistration] = useState(false);
  const [requireInvite, setRequireInvite] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // 启动探测：仅 Web 端调用 /api/auth/me；移动端为本地模式，直接视为已登录。
  const refresh = useCallback(async () => {
    if (isMobileApp()) {
      setIsAuthenticated(true);
      setUsername(null);
      setAllowRegistration(false);
      setRequireInvite(false);
      setIsChecking(false);
      return;
    }

    try {
      const response = await fetch('/api/auth/me');
      const data = await response.json();
      setIsAuthenticated(Boolean(data?.authenticated));
      setUsername(typeof data?.username === 'string' ? data.username : null);
      setAllowRegistration(Boolean(data?.allowRegistration));
      setRequireInvite(Boolean(data?.requireInvite));
    } catch (error) {
      console.error('[Auth] Failed to check session:', error);
      setIsAuthenticated(false);
      setUsername(null);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (user: string, password: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password }),
      });

      if (!response.ok) {
        return { ok: false, error: await extractError(response, 'Login failed') };
      }

      const data = await response.json();
      setIsAuthenticated(true);
      setUsername(typeof data?.username === 'string' ? data.username : user);
      return { ok: true };
    } catch (error) {
      console.error('[Auth] Login request failed:', error);
      return { ok: false, error: 'Network error' };
    }
  }, []);

  const register = useCallback(async (user: string, password: string, inviteCode?: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password, inviteCode }),
      });

      if (!response.ok) {
        return { ok: false, error: await extractError(response, 'Registration failed') };
      }

      const data = await response.json();
      setIsAuthenticated(true);
      setUsername(typeof data?.username === 'string' ? data.username : user);
      return { ok: true };
    } catch (error) {
      console.error('[Auth] Register request failed:', error);
      return { ok: false, error: 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.error('[Auth] Logout request failed:', error);
    } finally {
      setIsAuthenticated(false);
      setUsername(null);
    }
  }, []);

  const changePassword = useCallback(async (oldPassword: string, newPassword: string): Promise<AuthResult> => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      if (!response.ok) {
        return { ok: false, error: await extractError(response, 'Change password failed') };
      }
      return { ok: true };
    } catch (error) {
      console.error('[Auth] Change password request failed:', error);
      return { ok: false, error: 'Network error' };
    }
  }, []);

  // cookie 同源自动携带，保留空实现以兼容历史调用点。
  const getAuthHeaders = useCallback((): Record<string, string> => ({}), []);

  const contextValue: AuthContextType = {
    isAuthenticated,
    username,
    allowRegistration,
    requireInvite,
    isChecking,
    login,
    register,
    logout,
    refresh,
    changePassword,
    getAuthHeaders,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
