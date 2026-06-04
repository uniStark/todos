import 'server-only';
import { getDb } from './index';

export interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  created_at: number;
}

export function createUser(input: {
  id: string;
  username: string;
  passwordHash: string;
  createdAt: number;
}): void {
  getDb()
    .prepare(
      'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)'
    )
    .run(input.id, input.username, input.passwordHash, input.createdAt);
}

export function getUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(username) as UserRow | undefined;
}

export function getUserById(id: string): UserRow | undefined {
  return getDb()
    .prepare('SELECT * FROM users WHERE id = ?')
    .get(id) as UserRow | undefined;
}

export function countUsers(): number {
  const row = getDb().prepare('SELECT COUNT(*) AS n FROM users').get() as { n: number };
  return row.n;
}

export function updatePassword(id: string, passwordHash: string): void {
  getDb().prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(passwordHash, id);
}
