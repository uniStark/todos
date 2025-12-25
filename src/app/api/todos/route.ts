import { NextResponse } from 'next/server';
import { getTodos, saveTodos, Todo } from '@/lib/storage';

export async function GET() {
  const todos = getTodos();
  // 只返回未删除的任务
  const activeTodos = todos.filter(t => !t.deleted);
  return NextResponse.json(activeTodos);
}

export async function POST(request: Request) {
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

  return NextResponse.json(newTodo);
}

export async function PUT(request: Request) {
  const { id, completed, text } = await request.json();
  const todos = getTodos();
  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
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
  return NextResponse.json(todos[index]);
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'ID is required' }, { status: 400 });
  }

  const todos = getTodos();
  const index = todos.findIndex((t) => t.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Todo not found' }, { status: 404 });
  }

  // 执行逻辑删除
  todos[index].deleted = true;
  todos[index].deletedAt = Date.now();

  saveTodos(todos);
  return NextResponse.json({ success: true });
}

