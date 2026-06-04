import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Group } from '@/lib/types';
import { listGroups, insertGroup, deleteGroupAndReassign } from '@/lib/db/groupsRepo';
import { requireUser, isSameOrigin, unauthorized, forbidden } from '@/lib/auth/session';

export async function GET(request: Request) {
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  try {
    return NextResponse.json(listGroups(auth.userId));
  } catch {
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  try {
    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const newGroup: Group = { id: randomUUID(), name, createdAt: Date.now() };
    insertGroup(auth.userId, newGroup);
    return NextResponse.json(newGroup, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || id === 'default') {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    // 删除分组并把其下任务迁回默认分组（同事务）
    deleteGroupAndReassign(auth.userId, id);
    return NextResponse.json({ success: true, id });
  } catch {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
