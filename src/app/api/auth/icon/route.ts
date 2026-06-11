import { NextResponse } from 'next/server';
import { getUserById, updateUserIcon } from '@/lib/db/userRepo';
import { requireUser, isSameOrigin, unauthorized, forbidden } from '@/lib/auth/session';

// 允许的图片 data URL 前缀（base64）。不收 SVG：避免内嵌脚本/外链请求面，favicon 用 SVG 收益也很小。
const ICON_DATA_URL_RE =
  /^data:image\/(png|jpeg|jpg|webp|x-icon);base64,[A-Za-z0-9+/=]+$/;

// 大小上限：256KB（按原始字节估算）。favicon 通常仅几 KB，限小可减小 /api/auth/me 响应体与 DB 行宽。
const MAX_BYTES = 256 * 1024;

// 设置当前登录用户的浏览器标签页 favicon：需登录 + 同源（CSRF）。
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  const user = getUserById(auth.userId);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const icon = body?.icon;

  // null 表示恢复默认
  if (icon === null) {
    updateUserIcon(user.id, null);
    return NextResponse.json({ ok: true });
  }

  if (typeof icon !== 'string' || !ICON_DATA_URL_RE.test(icon)) {
    return NextResponse.json(
      { error: '图标格式无效，仅支持 PNG/JPEG/WebP/ICO 的 base64 data URL' },
      { status: 400 }
    );
  }

  // base64 体积估算：每 4 个 base64 字符约对应 3 字节原始数据
  const base64 = icon.slice(icon.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const sizeBytes = Math.floor((base64.length * 3) / 4) - padding;
  if (sizeBytes > MAX_BYTES) {
    return NextResponse.json({ error: '图标过大，请控制在 256KB 以内' }, { status: 413 });
  }

  updateUserIcon(user.id, icon);
  return NextResponse.json({ ok: true });
}
