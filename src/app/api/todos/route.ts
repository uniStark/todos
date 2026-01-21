import { NextResponse } from 'next/server';
import { getTodos, saveTodos, Todo } from '@/lib/storage';

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

export async function POST(request: Request) {
  try {
    const { text } = await request.json();
    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const todos = getTodos();
    const newTodo: Todo = {
      id: crypto.randomUUID(),
      text,
      completed: false,
      createdAt: Date.now(),
    };

    todos.push(newTodo);
    saveTodos(todos);
    
    console.log(`[API POST] Created todo: ${newTodo.id} - "${text}"`);
    return NextResponse.json(newTodo);
  } catch (error) {
    console.error('[API POST] Error:', error);
    return NextResponse.json({ error: 'Failed to create todo' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, completed, text } = await request.json();
    const todos = getTodos();
    const index = todos.findIndex((t) => t.id === id);

    if (index === -1) {
      console.warn(`[API PUT] Todo not found: ${id}`);
      return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
    }

    if (completed !== undefined) {
      todos[index].completed = completed;
      if (completed) {
        todos[index].completedAt = Date.now();
      } else {
        delete todos[index].completedAt;
      }
    }
    if (text !== undefined) todos[index].text = text;

    saveTodos(todos);
    
    console.log(`[API PUT] Updated todo: ${id}, completed: ${completed}`);
    return NextResponse.json(todos[index]);
  } catch (error) {
    console.error('[API PUT] Error:', error);
    return NextResponse.json({ error: 'Failed to update todo' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API DELETE] Error:', error);
    return NextResponse.json({ error: 'Failed to delete todo' }, { status: 500 });
  }
}

