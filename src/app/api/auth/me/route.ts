import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/session';
import { countUsers, getUserById } from '@/lib/db/userRepo';

// 前端启动时探测登录态；同时返回是否开放注册，用于决定是否展示注册入口。
export async function GET(request: Request) {
  const auth = requireUser(request);
  const inviteCode = process.env.INVITE_CODE?.trim();
  const requireInvite = !!inviteCode;
  // 设了邀请码即视为开放注册（凭码注册）；否则回退 ALLOW_REGISTRATION / 首用户放行
  const allowRegistration =
    requireInvite || process.env.ALLOW_REGISTRATION === 'true' || countUsers() === 0;

  if (!auth) {
    return NextResponse.json({ authenticated: false, allowRegistration, requireInvite, customIcon: null });
  }
  const customIcon = getUserById(auth.userId)?.custom_icon ?? null;
  return NextResponse.json({ authenticated: true, username: auth.username, allowRegistration, requireInvite, customIcon });
}
