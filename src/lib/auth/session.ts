import { randomBytes, randomUUID, createHash } from 'crypto';
import { NextResponse } from 'next/server';
import {
  createSessionRow,
  getSessionByTokenHash,
  deleteSessionByTokenHash,
  touchSession,
} from '../db/sessionRepo';
import { getUserById } from '../db/userRepo';

export const SESSION_COOKIE_NAME = 'todo_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // last_seen 至多每小时刷新一次，避免每请求写库

export interface AuthedUser {
  userId: string;
  username: string;
}

function hashToken(token: string): string {
  // token 本身是 32 字节高熵随机值，不可枚举，故用快速 sha256 即可（无需慢哈希）
  return createHash('sha256').update(token).digest('hex');
}

function getTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get('cookie');
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    if (key === SESSION_COOKIE_NAME) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

// 新建会话：生成随机 token，仅把 token 的哈希入库，明文 token 通过 HttpOnly cookie 下发
export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;
  createSessionRow({ id: randomUUID(), userId, tokenHash: hashToken(token), expiresAt, createdAt: now });
  return { token, expiresAt };
}

// 校验请求会话，返回登录用户或 null。顺带清理过期会话、限频刷新 last_seen。
export function requireUser(request: Request): AuthedUser | null {
  const token = getTokenFromRequest(request);
  if (!token) return null;

  const tokenHash = hashToken(token);
  const session = getSessionByTokenHash(tokenHash);
  if (!session) return null;

  const now = Date.now();
  if (session.expires_at < now) {
    deleteSessionByTokenHash(tokenHash);
    return null;
  }

  const user = getUserById(session.user_id);
  if (!user) {
    deleteSessionByTokenHash(tokenHash);
    return null;
  }

  if (!session.last_seen_at || now - session.last_seen_at > TOUCH_INTERVAL_MS) {
    touchSession(tokenHash, now);
  }

  return { userId: user.id, username: user.username };
}

export function destroySession(request: Request): void {
  const token = getTokenFromRequest(request);
  if (token) {
    deleteSessionByTokenHash(hashToken(token));
  }
}

// CSRF 防护：cookie 会话会被浏览器自动附带，故写操作必须校验 Origin（回退 Referer）与 Host 同源。
export function isSameOrigin(request: Request): boolean {
  const host = request.headers.get('host');
  if (!host) return false;

  const origin = request.headers.get('origin');
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // 部分浏览器在同源请求中可能不带 Origin，回退到 Referer
  const referer = request.headers.get('referer');
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // 写操作既无 Origin 也无 Referer：保守拒绝
  return false;
}

export function sessionCookieOptions(expiresAt: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    expires: new Date(expiresAt),
  };
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 0,
  };
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized', message: '请先登录' }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: 'Forbidden', message: '跨站请求被拒绝' }, { status: 403 });
}
