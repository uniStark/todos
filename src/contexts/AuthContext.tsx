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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'stark-todo-auth';

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

  if (!isClient) {
    return <>{children}</>;
  }

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        showAuthModal,
        authenticate,
        logout,
        requestAuth,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
