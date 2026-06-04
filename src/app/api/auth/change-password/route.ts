import { NextResponse } from 'next/server';
import { getUserById, updatePassword } from '@/lib/db/userRepo';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { requireUser, isSameOrigin, unauthorized, forbidden } from '@/lib/auth/session';
import { isValidPassword } from '@/lib/auth/validate';

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
  // 注：保留当前会话有效；如需“改密后登出其它设备”可在此清理该用户的其它 sessions（后续可加）。
  return NextResponse.json({ success: true });
}
