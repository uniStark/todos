import { NextResponse } from 'next/server';
import { getUserByUsername } from '@/lib/db/userRepo';
import { verifyPassword } from '@/lib/auth/password';
import { deleteExpiredSessions } from '@/lib/db/sessionRepo';
import {
  createSession,
  sessionCookieOptions,
  SESSION_COOKIE_NAME,
  isSameOrigin,
  forbidden,
} from '@/lib/auth/session';
import { normalizeUsername, isValidPassword } from '@/lib/auth/validate';
import { getClientIp, hitRateLimit, resetRateLimit } from '@/lib/rateLimit';

// 用真实 scrypt 同参数（N=16384,r=8,p=1,keylen=64）预生成的固定占位 hash。
// 用于「用户不存在」分支也跑一次 verifyPassword，使其与「用户存在但密码错误」的时延恒定，
// 消除通过响应耗时区分用户名是否存在的计时侧信道。
const DUMMY_HASH =
  'scrypt$16384$8$1$b41768d4c6e7728ef117258761a20a43$8c95b5be3b7fb3355e492c13fe3ef259c4fba0bbeaed34135738f853a48e81c2a13a78c7cadeda28f71ca7c4cfb6066fa1f1a2250fc70b60239d7e32aae46d01';

// 登录失败限流：同 IP 或 同用户名 在 15 分钟内最多 5 次失败。
const LOGIN_LIMIT = 5;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

// 统一的鉴权失败响应：用户不存在与密码错误走完全相同的文案/状态码/失败计数，不可区分。
function authFailed(): NextResponse {
  return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();

  const ip = getClientIp(request);

  const body = await request.json().catch(() => null);
  const username = normalizeUsername(body?.username);
  const password = body?.password;

  // 限流：以 IP 和（若有）用户名两个维度分别计数，任一超限即拒绝。
  const ipKey = `login:ip:${ip}`;
  const ipHit = hitRateLimit(ipKey, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  let userHit: { limited: boolean; retryAfterSec: number } | null = null;
  if (username) {
    userHit = hitRateLimit(`login:user:${username}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);
  }
  const limited = ipHit.limited || (userHit?.limited ?? false);
  if (limited) {
    const retryAfter = Math.max(ipHit.retryAfterSec, userHit?.retryAfterSec ?? 0);
    return NextResponse.json(
      { error: '尝试次数过多，请稍后再试' },
      { status: 429, headers: { 'Retry-After': String(retryAfter) } }
    );
  }

  if (!username || !isValidPassword(password)) {
    // 输入非法也跑一次相同成本的哈希，保持恒定时延。
    await verifyPassword(typeof password === 'string' ? password : '', DUMMY_HASH);
    return authFailed();
  }

  const user = getUserByUsername(username);
  if (!user) {
    // 用户不存在：仍跑一次 verifyPassword（用 DUMMY_HASH），与「用户存在但密码错」时延一致。
    await verifyPassword(password, DUMMY_HASH);
    return authFailed();
  }

  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    return authFailed();
  }

  // 登录成功：清掉该 IP / 用户名 的失败计数。
  resetRateLimit(ipKey);
  resetRateLimit(`login:user:${username}`);

  // 顺带轻量触发一次过期会话清理（很快，作为外置维护脚本之外的即时补充）。
  try {
    deleteExpiredSessions(Date.now());
  } catch {
    // 清理失败不应影响登录主流程
  }

  const { token, expiresAt } = createSession(user.id);
  const res = NextResponse.json({ username: user.username });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions(expiresAt));
  return res;
}
