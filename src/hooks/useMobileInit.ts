'use client';

import { useEffect, useState } from 'react';
import { isCapacitor } from '@/lib/platform';

// 移动端初始化 Hook
export function useMobileInit() {
  const [isReady, setIsReady] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const initMobile = async () => {
      const mobile = isCapacitor();
      setIsMobile(mobile);

      if (mobile) {
        try {
          // 动态导入 Capacitor 插件（避免服务端渲染错误）
          const [
            { SplashScreen },
            { StatusBar, Style },
            { Keyboard },
          ] = await Promise.all([
            import('@capacitor/splash-screen'),
            import('@capacitor/status-bar'),
            import('@capacitor/keyboard'),
          ]);

          // 隐藏启动画面
          await SplashScreen.hide();

          // 设置状态栏样式
          await StatusBar.setStyle({ style: Style.Dark });

          // 监听键盘事件
          Keyboard.addListener('keyboardWillShow', () => {
            document.body.classList.add('keyboard-open');
          });
          Keyboard.addListener('keyboardWillHide', () => {
            document.body.classList.remove('keyboard-open');
          });

          console.log('[Mobile] Initialized successfully');
        } catch (error) {
          console.error('[Mobile] Initialization error:', error);
        }
      }

      setIsReady(true);
    };

    initMobile();
  }, []);

  return { isReady, isMobile };
}

// 触觉反馈 Hook
export function useHaptics() {
  const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
    if (!isCapacitor()) return;

    try {
      const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics');

      switch (type) {
        case 'light':
          await Haptics.impact({ style: ImpactStyle.Light });
          break;
        case 'medium':
          await Haptics.impact({ style: ImpactStyle.Medium });
          break;
        case 'heavy':
          await Haptics.impact({ style: ImpactStyle.Heavy });
          break;
        case 'success':
          await Haptics.notification({ type: NotificationType.Success });
          break;
        case 'warning':
          await Haptics.notification({ type: NotificationType.Warning });
          break;
        case 'error':
          await Haptics.notification({ type: NotificationType.Error });
          break;
      }
    } catch (error) {
      console.error('[Haptics] Error:', error);
    }
  };

  return { triggerHaptic };
}
