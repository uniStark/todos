import { NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db/userRepo';
import { verifyPassword } from '@/lib/auth/password';
import {
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  isSameOrigin,
  forbidden,
} from '@/lib/auth/session';
import { normalizeUsername, isValidPassword } from '@/lib/auth/validate';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();

  const body = await request.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  const password = body?.password;

  if (!username || !isValidPassword(password)) {
    // 统一错误，避免区分“用户不存在 / 密码错误”导致用户名枚举
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const user = getUserByUsername(username);
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
  }

  const { token, expiresAt } = createSession(user.id);
  const res = NextResponse.json({ username: user.username });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
  return res;
}
