import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { countUsers, createUser, getUserByUsername } from '@/lib/db/userRepo';
import { ensureDefaultGroup } from '@/lib/db/groupsRepo';
import { hashPassword } from '@/lib/auth/password';
import {
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  isSameOrigin,
  forbidden,
} from '@/lib/auth/session';
import { normalizeUsername, isValidPassword } from '@/lib/auth/validate';
import { getClientIp, hitRateLimit } from '@/lib/rateLimit';

// 注册防刷：同 IP 1 小时内最多 20 次。
const REGISTER_LIMIT = 20;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

// 受控注册：公开注册由 ALLOW_REGISTRATION 控制；首个用户（库为空）始终放行作为引导账户。
function registrationAllowed(): boolean {
  return process.env.ALLOW_REGISTRATION === 'true' || countUsers() === 0;
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();

  const ip = getClientIp(request);
  const hit = hitRateLimit(`register:ip:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);
  if (hit.limited) {
    return NextResponse.json(
      { error: '注册请求过于频繁，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(hit.retryAfterSec) } }
    );
  }

  const body = await request.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  const password = body?.password;

  if (!username) {
    return NextResponse.json({ error: '用户名需为 3-32 位字母、数字或下划线' }, { status: 400 });
  }
  if (!isValidPassword(password)) {
    return NextResponse.json({ error: '密码长度需为 6-128 位' }, { status: 400 });
  }

  // 注册门控：设置了 INVITE_CODE 则走邀请码校验（开放注册但需正确邀请码）；
  // 否则回退 ALLOW_REGISTRATION / 首用户放行。
  const inviteCode = process.env.INVITE_CODE?.trim();
  if (inviteCode) {
    if (typeof body?.inviteCode !== 'string' || body.inviteCode !== inviteCode) {
      return NextResponse.json({ error: '邀请码无效' }, { status: 403 });
    }
  } else if (!registrationAllowed()) {
    return NextResponse.json({ error: '当前未开放注册' }, { status: 403 });
  }

  if (getUserByUsername(username)) {
    return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
  }

  const id = randomUUID();
  const now = Date.now();
  try {
    createUser({ id, username, passwordHash: await hashPassword(password), createdAt: now });
  } catch {
    // UNIQUE 约束兜底并发注册
    return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
  }
  ensureDefaultGroup(id, now);

  const { token, expiresAt } = createSession(id);
  const res = NextResponse.json({ username });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
  return res;
}
