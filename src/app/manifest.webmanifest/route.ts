import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { getUserById } from '@/lib/db/userRepo';

// 动态 PWA manifest：基于请求 cookie 中的 session 决定 icons。
// - 已登录且设置了 custom_icon：用该自定义图标作为 PWA 图标。
// - 否则回退 public/manifest.json 的默认图标（android-chrome 192/512、apple-touch-icon）。
// name/short_name/display/theme_color 等保持与静态 manifest 一致。
// 不缓存（按用户而异，且依赖 cookie），避免被代理共享缓存串号。

const DEFAULT_ICONS = [
  {
    src: '/android-chrome-512x512.png',
    sizes: '512x512',
    type: 'image/png',
    purpose: 'any maskable',
  },
  {
    src: '/android-chrome-192x192.png',
    sizes: '192x192',
    type: 'image/png',
    purpose: 'any',
  },
  {
    src: '/apple-touch-icon.png',
    sizes: '180x180',
    type: 'image/png',
    purpose: 'any',
  },
];

// 从 data URL 推断 MIME 类型，回退 image/png。
function mimeFromDataUrl(dataUrl: string): string {
  const m = /^data:([^;,]+)[;,]/.exec(dataUrl);
  return m?.[1] ?? 'image/png';
}

export async function GET(request: Request) {
  let icons = DEFAULT_ICONS;

  const auth = requireUser(request);
  if (auth) {
    const customIcon = getUserById(auth.userId)?.custom_icon;
    if (customIcon) {
      const type = mimeFromDataUrl(customIcon);
      icons = [
        { src: customIcon, sizes: '192x192', type, purpose: 'any' },
        { src: customIcon, sizes: '512x512', type, purpose: 'any maskable' },
      ];
    }
  }

  const manifest = {
    name: 'STARK Todo List',
    short_name: 'STARK Todo',
    description: '极简任务管理 - 高效生活方式',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#3b82f6',
    orientation: 'portrait-primary',
    icons,
    categories: ['productivity', 'utilities'],
    lang: 'zh-CN',
    dir: 'ltr',
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'no-store',
    },
  });
}
