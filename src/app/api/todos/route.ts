import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { Todo } from '@/lib/types';
import { listTodos, getTodo, insertTodo, updateTodo } from '@/lib/db/todosRepo';
import { getGroup } from '@/lib/db/groupsRepo';
import { requireUser, isSameOrigin, unauthorized, forbidden } from '@/lib/auth/session';
import { validateTodoCreate, validateTodoUpdate } from '@/lib/validation';
import { DEFAULT_GROUP_ID } from '@/lib/types';

// 校验 groupId 归属：非 default 的 groupId 必须属于当前用户。
function groupIdValid(userId: string, groupId: string | undefined): boolean {
  if (!groupId || groupId === DEFAULT_GROUP_ID) return true;
  return getGroup(userId, groupId) !== undefined;
}

// GET - 获取当前用户的任务（仅未删除）
export async function GET(request: Request) {
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  try {
    const todos = listTodos(auth.userId).filter((t) => !t.deleted);
    return NextResponse.json(todos);
  } catch (error) {
    console.error('[API GET todos] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

// POST - 创建新任务
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  try {
    const body = await request.json().catch(() => null);
    const result = validateTodoCreate(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { text, createdAt, groupId, priority, dueDate, completed, completedAt } = result.value;

    if (!groupIdValid(auth.userId, groupId)) {
      return NextResponse.json({ error: '分组不存在或不属于当前用户' }, { status: 400 });
    }

    const newTodo: Todo = {
      id: randomUUID(),
      text,
      completed: completed || false,
      createdAt: createdAt || Date.now(),
      groupId: groupId || DEFAULT_GROUP_ID,
      priority: priority || 'P2',
      dueDate,
    };
    if (completed) {
      newTodo.completedAt = completedAt || Date.now();
    }

    insertTodo(auth.userId, newTodo);
    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error('[API POST todos] Error:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

// PUT - 更新任务
export async function PUT(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  try {
    const body = await request.json().catch(() => null);
    const result = validateTodoUpdate(body);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    const { id, completed, text, createdAt, completedAt, groupId, priority, dueDate } = result.value;

    if (!groupIdValid(auth.userId, groupId)) {
      return NextResponse.json({ error: '分组不存在或不属于当前用户' }, { status: 400 });
    }

    const existing = getTodo(auth.userId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const updated: Todo = { ...existing };
    if (text !== undefined) updated.text = text;
    if (createdAt !== undefined) updated.createdAt = createdAt;
    if (completed !== undefined) {
      updated.completed = completed;
      if (completed) {
        updated.completedAt = completedAt || Date.now();
      } else {
        updated.completedAt = undefined;
      }
    } else if (completedAt !== undefined && updated.completed) {
      updated.completedAt = completedAt;
    }
    if (groupId !== undefined) updated.groupId = groupId;
    if (priority !== undefined) updated.priority = priority;
    if (dueDate !== undefined) updated.dueDate = dueDate;

    updateTodo(auth.userId, updated);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[API PUT todos] Error:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

// DELETE - 逻辑删除任务
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  const auth = requireUser(request);
  if (!auth) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const existing = getTodo(auth.userId, id);
    if (!existing) {
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    const updated: Todo = { ...existing, deleted: true, deletedAt: Date.now() };
    updateTodo(auth.userId, updated);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[API DELETE todos] Error:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
