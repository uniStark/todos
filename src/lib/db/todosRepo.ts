import 'server-only';
import { getDb } from './index';
import { Todo } from '../types';

interface TodoRow {
  id: string;
  text: string;
  completed: number;
  created_at: number;
  completed_at: number | null;
  deleted: number;
  deleted_at: number | null;
  group_id: string | null;
  priority: string | null;
  due_date: string | null;
}

function rowToTodo(r: TodoRow): Todo {
  const t: Todo = {
    id: r.id,
    text: r.text,
    completed: !!r.completed,
    createdAt: r.created_at,
  };
  if (r.completed_at != null) t.completedAt = r.completed_at;
  if (r.deleted) t.deleted = true;
  if (r.deleted_at != null) t.deletedAt = r.deleted_at;
  if (r.group_id != null) t.groupId = r.group_id;
  if (r.priority != null) t.priority = r.priority as Todo['priority'];
  if (r.due_date != null) t.dueDate = r.due_date;
  return t;
}

// 返回该用户全部任务（含已删除），对齐旧 getTodos()，由调用方决定是否过滤 deleted
export function listTodos(userId: string): Todo[] {
  const rows = getDb()
    .prepare('SELECT * FROM todos WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId) as TodoRow[];
  return rows.map(rowToTodo);
}

export function getTodo(userId: string, id: string): Todo | undefined {
  const row = getDb()
    .prepare('SELECT * FROM todos WHERE user_id = ? AND id = ?')
    .get(userId, id) as TodoRow | undefined;
  return row ? rowToTodo(row) : undefined;
}

export function insertTodo(userId: string, todo: Todo): void {
  getDb()
    .prepare(
      `INSERT INTO todos (id, user_id, text, completed, created_at, completed_at, deleted, deleted_at, group_id, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      todo.id,
      userId,
      todo.text,
      todo.completed ? 1 : 0,
      todo.createdAt,
      todo.completedAt ?? null,
      todo.deleted ? 1 : 0,
      todo.deletedAt ?? null,
      todo.groupId ?? null,
      todo.priority ?? null,
      todo.dueDate ?? null
    );
}

// 全字段覆盖更新（调用方先 getTodo 合并 patch，再传入完整对象，保证字段一致）
export function updateTodo(userId: string, todo: Todo): void {
  getDb()
    .prepare(
      `UPDATE todos
         SET text = ?, completed = ?, created_at = ?, completed_at = ?, deleted = ?, deleted_at = ?, group_id = ?, priority = ?, due_date = ?
       WHERE user_id = ? AND id = ?`
    )
    .run(
      todo.text,
      todo.completed ? 1 : 0,
      todo.createdAt,
      todo.completedAt ?? null,
      todo.deleted ? 1 : 0,
      todo.deletedAt ?? null,
      todo.groupId ?? null,
      todo.priority ?? null,
      todo.dueDate ?? null,
      userId,
      todo.id
    );
}
