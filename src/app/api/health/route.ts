import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// 健康检查端点：极薄、只读、无副作用、不鉴权（探活端点应公开）。
// 仅做一次只读探活查询，验证 DB 可用即可。
// 注意：不要 import 任何会启动后台任务/备份/迁移的模块。
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    getDb().prepare('SELECT 1').get();
    return NextResponse.json({ status: 'ok' });
  } catch {
    return NextResponse.json({ status: 'error' }, { status: 503 });
  }
}
