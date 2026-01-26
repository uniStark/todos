'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  showAuthModal: boolean;
  authenticate: (password: string) => Promise<boolean>;
  logout: () => void;
  requestAuth: () => void;
  closeAuthModal: () => void;
  getAuthHeaders: () => Record<string, string>;
}

const AUTH_STORAGE_KEY = 'stark-todo-auth';
const AUTH_PASSWORD_KEY = 'stark-todo-pwd';

// 默认值，用于 SSR
const defaultContextValue: AuthContextType = {
  isAuthenticated: false,
  showAuthModal: false,
  authenticate: async () => false,
  logout: () => {},
  requestAuth: () => {},
  closeAuthModal: () => {},
  getAuthHeaders: () => ({}),
};

const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [storedPassword, setStoredPassword] = useState<string | null>(null);

  // 客户端初始化
  useEffect(() => {
    setIsClient(true);
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    const savedPwd = localStorage.getItem(AUTH_PASSWORD_KEY);
    if (savedAuth === 'true' && savedPwd) {
      setIsAuthenticated(true);
      setStoredPassword(savedPwd);
    }
  }, []);

  // 验证密码
  const authenticate = useCallback(async (password: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsAuthenticated(true);
        setStoredPassword(password);
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        localStorage.setItem(AUTH_PASSWORD_KEY, password);
        setShowAuthModal(false);
        return true;
      }
      return false;
    } catch (error) {
      console.error('[Auth] Verification failed:', error);
      return false;
    }
  }, []);

  // 登出
  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setStoredPassword(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(AUTH_PASSWORD_KEY);
  }, []);

  // 请求验证（显示弹窗）
  const requestAuth = useCallback(() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
    }
  }, [isAuthenticated]);

  // 关闭弹窗
  const closeAuthModal = useCallback(() => {
    setShowAuthModal(false);
  }, []);

  // 获取认证请求头
  const getAuthHeaders = useCallback((): Record<string, string> => {
    if (storedPassword) {
      return { 'X-API-Key': storedPassword };
    }
    return {};
  }, [storedPassword]);

  // 始终提供 Context，确保子组件可以访问
  const contextValue: AuthContextType = isClient
    ? {
        isAuthenticated,
        showAuthModal,
        authenticate,
        logout,
        requestAuth,
        closeAuthModal,
        getAuthHeaders,
      }
    : defaultContextValue;

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
