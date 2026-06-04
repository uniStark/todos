import { NextResponse } from 'next/server';
import {
  destroySession,
  clearCookieOptions,
  SESSION_COOKIE_NAME,
  isSameOrigin,
  forbidden,
} from '@/lib/auth/session';

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();

  destroySession(request);
  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, '', clearCookieOptions());
  return res;
}
