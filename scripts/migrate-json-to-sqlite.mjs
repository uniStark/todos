#!/usr/bin/env node
// 一次性迁移脚本：把旧的 JSON 存储（todos.json / groups.json / chat-history.json）
// 导入 SQLite，并创建首个用户账户（bootstrap）。所有旧数据归属到该账户。
//
// 用法：
//   DATA_DIR=/app/data node scripts/migrate-json-to-sqlite.mjs <username> <password>
//   或通过环境变量 MIGRATE_USERNAME / MIGRATE_PASSWORD
//
// 注意：建表语句与 src/lib/db/index.ts 保持一致；密码哈希格式与 src/lib/auth/password.ts 一致。
// 幂等性：用户已存在时拒绝重复迁移，避免数据重复导入。

import Database from 'better-sqlite3';
import { scrypt as _scrypt, randomBytes, randomUUID } from 'crypto';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const scrypt = promisify(_scrypt);

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_FILE = path.join(DATA_DIR, 'todos.db');
const TODOS_JSON = path.join(DATA_DIR, 'todos.json');
const GROUPS_JSON = path.join(DATA_DIR, 'groups.json');
const CHAT_JSON = path.join(DATA_DIR, 'chat-history.json');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT UNIQUE NOT NULL, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL, last_seen_at INTEGER
);
CREATE TABLE IF NOT EXISTS groups (
  id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL, created_at INTEGER NOT NULL, PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS todos (
  id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL, completed INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
  completed_at INTEGER, deleted INTEGER NOT NULL DEFAULT 0, deleted_at INTEGER,
  group_id TEXT, priority TEXT, due_date TEXT, PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS chat_sessions (
  id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT NOT NULL, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL,
  timestamp INTEGER NOT NULL, execution_result TEXT, PRIMARY KEY (user_id, id)
);
`;

async function hashPassword(plain) {
  const N = 16384, R = 8, P = 1, KEYLEN = 64;
  const salt = randomBytes(16);
  const derived = await scrypt(plain, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch (e) {
    console.error(`[migrate] 无法解析 ${file}: ${e.message}`);
    process.exit(1);
  }
}

async function main() {
  const username = (process.argv[2] || process.env.MIGRATE_USERNAME || '').trim().toLowerCase();
  const password = process.argv[3] || process.env.MIGRATE_PASSWORD || '';

  if (!/^[a-z0-9_]{3,32}$/.test(username)) {
    console.error('用法: DATA_DIR=<dir> node scripts/migrate-json-to-sqlite.mjs <username> <password>');
    console.error('  username: 3-32 位字母/数字/下划线');
    process.exit(1);
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
    console.error('密码长度需为 6-128 位');
    process.exit(1);
  }

  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);

  const existing = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existing) {
    console.error(`用户 "${username}" 已存在，拒绝重复迁移。如需重新导入请先清空数据库。`);
    process.exit(1);
  }

  const userId = randomUUID();
  const now = Date.now();
  const passwordHash = await hashPassword(password);

  const todos = readJson(TODOS_JSON, []);
  const groups = readJson(GROUPS_JSON, []);
  const chat = readJson(CHAT_JSON, null);

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)').run(
      userId, username, passwordHash, now
    );

    // 默认分组
    const hasDefault = Array.isArray(groups) && groups.some((g) => g.id === 'default');
    if (!hasDefault) {
      db.prepare('INSERT INTO groups (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run(
        'default', userId, 'Default', now
      );
    }

    const insGroup = db.prepare('INSERT OR IGNORE INTO groups (id, user_id, name, created_at) VALUES (?, ?, ?, ?)');
    let gCount = 0;
    if (Array.isArray(groups)) {
      for (const g of groups) {
        if (!g || !g.id) continue;
        insGroup.run(g.id, userId, g.name ?? g.id, g.createdAt ?? now);
        gCount++;
      }
    }

    const insTodo = db.prepare(
      `INSERT INTO todos (id, user_id, text, completed, created_at, completed_at, deleted, deleted_at, group_id, priority, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    let tCount = 0;
    if (Array.isArray(todos)) {
      for (const t of todos) {
        if (!t || !t.id) continue;
        insTodo.run(
          t.id, userId, t.text ?? '', t.completed ? 1 : 0, t.createdAt ?? now,
          t.completedAt ?? null, t.deleted ? 1 : 0, t.deletedAt ?? null,
          t.groupId ?? 'default', t.priority ?? null, t.dueDate ?? null
        );
        tCount++;
      }
    }

    // 聊天历史（旧结构为单个 ChatSession）
    let mCount = 0;
    if (chat && Array.isArray(chat.messages)) {
      const sessionId = chat.id || randomUUID();
      db.prepare('INSERT INTO chat_sessions (id, user_id, created_at, updated_at) VALUES (?, ?, ?, ?)').run(
        sessionId, userId, chat.createdAt ?? now, chat.updatedAt ?? now
      );
      const insMsg = db.prepare(
        `INSERT INTO chat_messages (id, user_id, session_id, role, content, timestamp, execution_result)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      );
      for (const m of chat.messages) {
        if (!m || !m.id) continue;
        insMsg.run(
          m.id, userId, sessionId, m.role ?? 'assistant', m.content ?? '',
          m.timestamp ?? now, m.executionResult ? JSON.stringify(m.executionResult) : null
        );
        mCount++;
      }
    }

    return { gCount, tCount, mCount };
  });

  const { gCount, tCount, mCount } = tx();

  console.log(`迁移完成：用户 "${username}" (id=${userId})`);
  console.log(`  分组: ${gCount}  任务: ${tCount}  聊天消息: ${mCount}`);
  console.log(`  数据库: ${DB_FILE}`);
  db.close();
}

main().catch((e) => {
  console.error('迁移失败:', e);
  process.exit(1);
});
