import { NextResponse } from 'next/server';
import { getStats, updateStats } from '@/lib/storage';

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
  try {
    const { isNewVisitor } = await request.json();
    const stats = updateStats(!!isNewVisitor);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('[API Stats POST] Error:', error);
    return NextResponse.json({ error: 'Failed to update stats' }, { status: 500 });
  }
}
