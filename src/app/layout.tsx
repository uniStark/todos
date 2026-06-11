import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/contexts/SettingsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import StatsTracker from "@/components/StatsTracker";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "STARK Todo - 极简任务管理",
  description: "现代化、高效的待办事项管理工具",
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'android-chrome',
        url: '/android-chrome-192x192.png',
      },
      {
        rel: 'android-chrome',
        url: '/android-chrome-512x512.png',
      },
    ],
  },
  manifest: '/manifest.webmanifest',
};

// 主题 FOUC 防护：在 React 接管前同步读 localStorage('stark-settings')，
// 按 dark/light/system 给 <html> 加/去 'dark' class。逻辑必须与 SettingsContext.applyTheme 一致。
// 默认主题（无存储或解析失败）对齐 SettingsContext 的 defaultSettings.theme = 'dark'。
const themeInitScript = `
(function(){
  try {
    var theme = 'dark';
    var raw = localStorage.getItem('stark-settings');
    if (raw) {
      var parsed = JSON.parse(raw);
      if (parsed && (parsed.theme === 'light' || parsed.theme === 'dark' || parsed.theme === 'system')) {
        theme = parsed.theme;
      }
    }
    var dark = theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    var root = document.documentElement;
    if (dark) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
  } catch (e) {}
})();
`;

// Next 15 规范：viewport 单独用 viewport export 生成唯一一个 <meta>，
// 避免手写 <meta viewport> 与框架默认注入的那个并存（会让 viewport-fit/maximum-scale 行为不确定）。
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover", // 关键：激活 iOS 安全区（灵动岛 / home indicator）
  themeColor: "#3b82f6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 阻塞式内联脚本：在首帧渲染前应用主题，消除 dark 用户刷新闪白屏（FOUC） */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} antialiased`} suppressHydrationWarning>
        <SettingsProvider>
          <AuthProvider>
            <ToastProvider>
              <StatsTracker />
              <ErrorBoundary>{children}</ErrorBoundary>
            </ToastProvider>
          </AuthProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
