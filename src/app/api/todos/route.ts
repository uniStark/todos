import { NextResponse } from 'next/server';
import { getTodos, saveTodos, Todo } from '@/lib/storage';

// API 密码验证
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'stark123';

function verifyApiKey(request: Request): boolean {
  const apiKey = request.headers.get('X-API-Key') || request.headers.get('Authorization')?.replace('Bearer ', '');
  return apiKey === AUTH_PASSWORD;
}

function unauthorizedResponse() {
  return NextResponse.json(
    { 
      error: 'Unauthorized', 
      message: 'Valid API key required. Use header: X-API-Key: <password> or Authorization: Bearer <password>' 
    }, 
    { status: 401 }
  );
}

// GET - 获取所有任务（无需认证）
export async function GET() {
  try {
    const todos = getTodos();
    // 只返回未删除的任务
    const activeTodos = todos.filter(t => !t.deleted);
    console.log(`[API GET] Returning ${activeTodos.length} active todos`);
    return NextResponse.json(activeTodos);
  } catch (error) {
    console.error('[API GET] Error:', error);
    return NextResponse.json({ error: 'Failed to fetch todos' }, { status: 500 });
  }
}

// POST - 创建新任务（需要认证）
export async function POST(request: Request) {
  try {
    // 验证 API Key
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { text, createdAt } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const todos = getTodos();
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: createdAt || Date.now(), // 支持自定义创建时间
    };

    todos.push(newTodo);
    saveTodos(todos);
    
    console.log(`[API POST] Created todo: ${newTodo.id} - "${text}"`);
    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error('[API POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

// PUT - 更新任务（需要认证）
export async function PUT(request: Request) {
  try {
    // 验证 API Key
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { id, completed, text, createdAt, completedAt } = await request.json();
    
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const todos = getTodos();
    const index = todos.findIndex((t) => t.id === id);

    if (index === -1) {
      console.warn(`[API PUT] Todo not found: ${id}`);
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // 更新文本
    if (text !== undefined) {
      todos[index].text = text;
    }

    // 更新创建时间（可选）
    if (createdAt !== undefined) {
      todos[index].createdAt = createdAt;
    }

    // 更新完成状态
    if (completed !== undefined) {
      todos[index].completed = completed;
      if (completed) {
        // 支持自定义完成时间，否则使用当前时间
        todos[index].completedAt = completedAt || Date.now();
      } else {
        delete todos[index].completedAt;
      }
    } else if (completedAt !== undefined && todos[index].completed) {
      // 仅更新完成时间
      todos[index].completedAt = completedAt;
    }

    saveTodos(todos);
    
    console.log(`[API PUT] Updated todo: ${id}`);
    return NextResponse.json(todos[index]);
  } catch (error) {
    console.error('[API PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

// DELETE - 删除任务（需要认证）
export async function DELETE(request: Request) {
  try {
    // 验证 API Key
    if (!verifyApiKey(request)) {
      return unauthorizedResponse();
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const todos = getTodos();
    const index = todos.findIndex((t) => t.id === id);

    if (index === -1) {
      console.warn(`[API DELETE] Todo not found: ${id}`);
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    // 执行逻辑删除
    todos[index].deleted = true;
    todos[index].deletedAt = Date.now();

    saveTodos(todos);
    
    console.log(`[API DELETE] Deleted todo: ${id}`);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('[API DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}
