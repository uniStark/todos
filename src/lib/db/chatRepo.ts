import 'server-only';
import { getDb } from './index';
import { ChatSession, ChatMessage, AIExecutionResult } from '../types';
import { randomUUID } from 'crypto';

interface SessionRow {
  id: string;
  created_at: number;
  updated_at: number;
}

interface MessageRow {
  id: string;
  role: string;
  content: string;
  timestamp: number;
  execution_result: string | null;
}

function rowToMessage(r: MessageRow): ChatMessage {
  const msg: ChatMessage = {
    id: r.id,
    role: r.role as ChatMessage['role'],
    content: r.content,
    timestamp: r.timestamp,
  };
  if (r.execution_result) {
    try {
      msg.executionResult = JSON.parse(r.execution_result) as AIExecutionResult;
    } catch {
      // 损坏的执行结果忽略，不影响消息正文展示
    }
  }
  return msg;
}

function loadMessages(userId: string, sessionId: string): ChatMessage[] {
  const rows = getDb()
    .prepare(
      'SELECT id, role, content, timestamp, execution_result FROM chat_messages WHERE user_id = ? AND session_id = ? ORDER BY timestamp ASC'
    )
    .all(userId, sessionId) as MessageRow[];
  return rows.map(rowToMessage);
}

// 当前会话 = 该用户 updated_at 最新的会话；不存在则新建。对齐旧的“单当前会话”模型。
export function getOrCreateCurrentSession(userId: string, now: number): ChatSession {
  const db = getDb();
  const row = db
    .prepare('SELECT id, created_at, updated_at FROM chat_sessions WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1')
    .get(userId) as SessionRow | undefined;

  if (row) {
    return {
      id: row.id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      messages: loadMessages(userId, row.id),
    };
  }

  const session: ChatSession = { id: randomUUID(), messages: [], createdAt: now, updatedAt: now };
  db.prepare('INSERT INTO chat_sessions (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
    session.id,
    userId,
    now,
    now
  );
  return session;
}

export function addChatMessage(userId: string, sessionId: string, message: ChatMessage, now: number): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO chat_messages (id, user_id, session_id, role, content, timestamp, execution_result)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      message.id,
      userId,
      sessionId,
      message.role,
      message.content,
      message.timestamp,
      message.executionResult ? JSON.stringify(message.executionResult) : null
    );
    db.prepare('UPDATE chat_sessions SET updated_at = ? WHERE user_id = ? AND id = ?').run(now, userId, sessionId);
  });
  tx();
}

// 清空当前会话：删除该用户全部会话与消息，新建一个空会话返回
export function clearCurrentSession(userId: string, now: number): ChatSession {
  const db = getDb();
  const session: ChatSession = { id: randomUUID(), messages: [], createdAt: now, updatedAt: now };
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM chat_messages WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM chat_sessions WHERE user_id = ?').run(userId);
    db.prepare('INSERT INTO chat_sessions (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
      session.id,
      userId,
      now,
      now
    );
  });
  tx();
  return session;
}
