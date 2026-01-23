'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  showAuthModal: boolean;
  authenticate: (password: string) => Promise<boolean>;
  logout: () => void;
  requestAuth: () => void;
  closeAuthModal: () => void;
}

const AUTH_STORAGE_KEY = 'stark-todo-auth';

// 默认值，用于 SSR
const defaultContextValue: AuthContextType = {
  isAuthenticated: false,
  showAuthModal: false,
  authenticate: async () => false,
  logout: () => {},
  requestAuth: () => {},
  closeAuthModal: () => {},
};

const AuthContext = createContext<AuthContextType>(defaultContextValue);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isClient, setIsClient] = useState(false);

  // 客户端初始化
  useEffect(() => {
    setIsClient(true);
    const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
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
        localStorage.setItem(AUTH_STORAGE_KEY, 'true');
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
    localStorage.removeItem(AUTH_STORAGE_KEY);
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

  // 始终提供 Context，确保子组件可以访问
  const contextValue: AuthContextType = isClient
    ? {
        isAuthenticated,
        showAuthModal,
        authenticate,
        logout,
        requestAuth,
        closeAuthModal,
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
