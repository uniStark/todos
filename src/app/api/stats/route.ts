import { NextResponse } from 'next/server';
import { getStats, recordHit } from '@/lib/db/statsRepo';
import { isSameOrigin } from '@/lib/auth/session';
import { getClientIp, hitRateLimit } from '@/lib/rateLimit';

// POST 限流：每 IP 每分钟最多 30 次写入，防匿名刷量。
const STATS_RATE_LIMIT = 30;
const STATS_RATE_WINDOW_MS = 60_000;

export async function GET() {
  try {
    const stats = getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API Stats GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // 同源校验：拒绝跨站/直接脚本刷量。
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 按 IP 限流。
  const ip = getClientIp(request);
  const { limited, retryAfterSec } = hitRateLimit(`stats:${ip}`, STATS_RATE_LIMIT, STATS_RATE_WINDOW_MS);
  if (limited) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
    );
  }

  try {
    const bodyText = await request.text();
    const body = bodyText.trim() ? JSON.parse(bodyText) : {};
    const isNewVisitor = typeof body?.isNewVisitor === 'boolean' ? body.isNewVisitor : false;
    const stats = recordHit(!!isNewVisitor);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API Stats POST] Error:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
