import type { CapacitorConfig } from '@capacitor/cli';

// 检测是否是开发模式
const isDev = process.env.NODE_ENV === 'development';

const config: CapacitorConfig = {
  appId: 'com.stark.todos',
  appName: 'Todos',
  webDir: 'out',
  
  // iOS 配置
  ios: {
    // 允许在 iPad 和 Mac (Catalyst) 上运行
    allowsLinkPreview: true,
    scrollEnabled: true,
    // 安全区域适配
    contentInset: 'automatic',
    // 支持 Mac Catalyst
    preferredContentMode: 'mobile',
    // 视图控制器配置
    backgroundColor: '#0f172a',
  },
  
  // 服务器配置
  server: isDev ? {
    // 开发模式：连接到本地 Next.js 开发服务器
    url: 'http://localhost:3000',
    cleartext: true,
  } : {
    // 生产模式：使用本地静态文件
    androidScheme: 'https',
    iosScheme: 'capacitor',
  },
  
  // 插件配置
  plugins: {
    // 启动画面
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: '#0f172a',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    // 状态栏
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
    // 键盘
    Keyboard: {
      resize: 'body',
      style: 'DARK',
      resizeOnFullScreen: true,
    },
    // 触觉反馈
    Haptics: {
      // 默认启用触觉反馈
    },
  },
};

export default config;
