import 'server-only';
import { getDb } from './index';
import { Group, DEFAULT_GROUP_ID } from '../types';

interface GroupRow {
  id: string;
  name: string;
  created_at: number;
}

function rowToGroup(r: GroupRow): Group {
  return { id: r.id, name: r.name, createdAt: r.created_at };
}

export function listGroups(userId: string): Group[] {
  const rows = getDb()
    .prepare('SELECT id, name, created_at FROM groups WHERE user_id = ? ORDER BY created_at ASC')
    .all(userId) as GroupRow[];
  return rows.map(rowToGroup);
}

export function getGroup(userId: string, id: string): Group | undefined {
  const row = getDb()
    .prepare('SELECT id, name, created_at FROM groups WHERE user_id = ? AND id = ?')
    .get(userId, id) as GroupRow | undefined;
  return row ? rowToGroup(row) : undefined;
}

export function findGroupByName(userId: string, name: string): Group | undefined {
  // 大小写不敏感匹配，对齐旧 AI 逻辑里的 groupName 复用
  const row = getDb()
    .prepare('SELECT id, name, created_at FROM groups WHERE user_id = ? AND lower(name) = lower(?)')
    .get(userId, name) as GroupRow | undefined;
  return row ? rowToGroup(row) : undefined;
}

export function insertGroup(userId: string, group: Group): void {
  getDb()
    .prepare('INSERT INTO groups (id, user_id, name, created_at) VALUES (?, ?, ?, ?)')
    .run(group.id, userId, group.name, group.createdAt);
}

// 确保用户有默认分组（注册/迁移时调用）
export function ensureDefaultGroup(userId: string, now: number): void {
  const existing = getGroup(userId, DEFAULT_GROUP_ID);
  if (!existing) {
    insertGroup(userId, { id: DEFAULT_GROUP_ID, name: 'Default', createdAt: now });
  }
}

// 删除分组：同事务内把该分组下的任务迁回默认分组，避免悬挂引用
export function deleteGroupAndReassign(userId: string, id: string): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM groups WHERE user_id = ? AND id = ?').run(userId, id);
    db.prepare('UPDATE todos SET group_id = ? WHERE user_id = ? AND group_id = ?').run(
      DEFAULT_GROUP_ID,
      userId,
      id
    );
  });
  tx();
}
