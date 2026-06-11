import { NextResponse } from 'next/server';
import { randomUUID, timingSafeEqual } from 'crypto';
import { countUsers, createUser, getUserByUsername } from '@/lib/db/userRepo';
import { ensureDefaultGroup } from '@/lib/db/groupsRepo';
import { getDb } from '@/lib/db/index';
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

// 邀请码恒定时间比较：先校验类型与长度（长度不等直接 false，否则 timingSafeEqual 会抛错），
// 再用 crypto.timingSafeEqual 做恒定时间字节比较，避免按字符短路造成的时序侧信道。
function inviteCodeMatches(provided: unknown, expected: string): boolean {
  if (typeof provided !== 'string') return false;
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
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
    if (!inviteCodeMatches(body?.inviteCode, inviteCode)) {
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
  const passwordHash = await hashPassword(password);
  try {
    // 原子化：createUser + ensureDefaultGroup 同事务，避免建了用户却没默认分组的半成品状态。
    getDb().transaction(() => {
      createUser({ id, username, passwordHash, createdAt: now });
      ensureDefaultGroup(id, now);
    })();
  } catch {
    // UNIQUE 约束兜底并发注册（事务整体回滚）
    return NextResponse.json({ error: '用户名已存在' }, { status: 409 });
  }

  const { token, expiresAt } = createSession(id);
  const res = NextResponse.json({ username });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
  return res;
}
