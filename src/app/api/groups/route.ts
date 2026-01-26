import { NextResponse } from 'next/server';
import { getGroups, saveGroups, Group, getTodos, saveTodos } from '@/lib/storage';

const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'stark123';

function verifyApiKey(request: Request): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return apiKey === AUTH_PASSWORD;
}

function unauthorizedResponse() {
  return NextResponse.json(
    { 
      error: 'Unauthorized', 
      message: 'Valid API key required.' 
    }, 
    { status: 401 }
  );
}

export async function GET() {
  try {
    const groups = getGroups();
    return NextResponse.json(groups);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch groups' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!verifyApiKey(request)) return unauthorizedResponse();

    const { name } = await request.json();
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });

    const groups = getGroups();
    const newGroup: Group = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
    };

    groups.push(newGroup);
    saveGroups(groups);
    
    return NextResponse.json(newGroup, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!verifyApiKey(request)) return unauthorizedResponse();

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || id === 'default') {
      return NextResponse.json({ error: 'Valid ID is required' }, { status: 400 });
    }

    const groups = getGroups();
    const filteredGroups = groups.filter((g) => g.id !== id);
    saveGroups(filteredGroups);

    // 迁移该分组下的任务到默认分组
    const todos = getTodos();
    const updatedTodos = todos.map(todo => {
      if (todo.groupId === id) {
        return { ...todo, groupId: 'default' };
      }
      return todo;
    });
    saveTodos(updatedTodos);
    
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}
