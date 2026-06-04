import { getDb } from './index';

export interface SessionRow {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  created_at: number;
  last_seen_at: number | null;
}

export function createSessionRow(input: {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
  createdAt: number;
}): void {
  getDb()
    .prepare(
      'INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)'
    )
    .run(input.id, input.userId, input.tokenHash, input.expiresAt, input.createdAt, input.createdAt);
}

export function getSessionByTokenHash(tokenHash: string): SessionRow | undefined {
  return getDb()
    .prepare('SELECT * FROM sessions WHERE token_hash = ?')
    .get(tokenHash) as SessionRow | undefined;
}

export function deleteSessionByTokenHash(tokenHash: string): void {
  getDb().prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
}

export function touchSession(tokenHash: string, lastSeenAt: number): void {
  getDb().prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(lastSeenAt, tokenHash);
}

export function deleteExpiredSessions(now: number): void {
  getDb().prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
}
