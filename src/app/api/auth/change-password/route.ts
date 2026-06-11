import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { getUserById, updatePassword } from '@/lib/db/userRepo';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import {
  requireUser,
  isSameOrigin,
  unauthorized,
  forbidden,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/session';
import { deleteOtherSessionsForUser } from '@/lib/db/sessionRepo';
import { isValidPassword } from '@/lib/auth/validate';

// 从请求 cookie 取出当前 session 明文 token，并按入库口径（sha256 hex）哈希，
// 用于改密后保留当前会话、踢掉同用户其它会话。
function currentTokenHash(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE_NAME) {
      const token = decodeURIComponent(part.slice(eq + 1).trim());
      return createHash('sha256').update(token).digest('hex');
    }
  }
  return null;
}

// 修改当前登录用户的密码：需登录 + 同源（CSRF）+ 验证当前密码。
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  const body = await request.json().catch(() => null);
  const oldPassword = body?.oldPassword;
  const newPassword = body?.newPassword;

  if (!isValidPassword(newPassword)) {
    return NextResponse.json({ error: '新密码长度需为 6-128 位' }, { status: 400 });
  }

  const user = getUserById(auth.userId);
  if (!user) return unauthorized();

  // 验证当前密码（错误返回 400，不区分细节）
  if (typeof oldPassword !== 'string' || !(await verifyPassword(oldPassword, user.password_hash))) {
    return NextResponse.json({ error: '当前密码错误' }, { status: 400 });
  }

  if (oldPassword === newPassword) {
    return NextResponse.json({ error: '新密码不能与当前密码相同' }, { status: 400 });
  }

  updatePassword(user.id, await hashPassword(newPassword));

  // 改密后踢掉该用户的其它所有会话（其它设备需重新登录），仅保留当前会话。
  const keepHash = currentTokenHash(request);
  if (keepHash) {
    deleteOtherSessionsForUser(user.id, keepHash);
  }

  return NextResponse.json({ success: true });
}
