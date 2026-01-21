'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Settings {
  language: 'zh' | 'en';
  logoText: string;
  timezone: string;
  theme: 'light' | 'dark' | 'system';
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  language: 'zh',
  logoText: 'STARK',
  timezone: 'Asia/Shanghai',
  theme: 'system',
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('stark-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        // Apply theme immediately after loading
        requestAnimationFrame(() => {
          applyTheme(parsed.theme);
        });
      } catch (error) {
        console.error('Failed to parse settings:', error);
        applyTheme(defaultSettings.theme);
      }
    } else {
      applyTheme(defaultSettings.theme);
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    
    // Save settings to localStorage
    localStorage.setItem('stark-settings', JSON.stringify(settings));
    
    // Apply theme
    applyTheme(settings.theme);
  }, [settings, isClient]);

  useEffect(() => {
    if (!isClient) return;
    
    // Listen to system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      if (settings.theme === 'system') {
        applyTheme('system');
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [settings.theme, isClient]);

  const applyTheme = (theme: 'light' | 'dark' | 'system') => {
    if (typeof window === 'undefined') return;
    
    const root = document.documentElement;
    
    // 强制移除过渡效果，确保立即切换
    root.style.setProperty('transition', 'none');
    
    if (theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // 强制重绘，确保立即生效
    void root.offsetHeight;
    
    // 恢复过渡效果
    requestAnimationFrame(() => {
      root.style.removeProperty('transition');
    });
    
    console.log(`[Theme] Applied theme: ${theme}, dark class: ${root.classList.contains('dark')}`);
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...newSettings };
      
      // 如果更新了主题，立即应用
      if (newSettings.theme !== undefined) {
        requestAnimationFrame(() => {
          applyTheme(newSettings.theme!);
        });
      }
      
      return updated;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }
  return context;
}
