import 'server-only';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';

// 数据目录：与旧 JSON 存储保持一致（Docker 下为 /app/data）
const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_FILE = path.join(DATA_DIR, 'todos.db');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// 建表语句：多用户隔离。所有业务表都带 user_id 外键。
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  custom_icon   TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  id           TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash   TEXT UNIQUE NOT NULL,
  expires_at   INTEGER NOT NULL,
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER
);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);

CREATE TABLE IF NOT EXISTS groups (
  id         TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_groups_user ON groups(user_id);

CREATE TABLE IF NOT EXISTS todos (
  id           TEXT NOT NULL,
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text         TEXT NOT NULL,
  completed    INTEGER NOT NULL DEFAULT 0,
  created_at   INTEGER NOT NULL,
  completed_at INTEGER,
  deleted      INTEGER NOT NULL DEFAULT 0,
  deleted_at   INTEGER,
  group_id     TEXT,
  priority     TEXT,
  due_date     TEXT,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_todos_user ON todos(user_id);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id         TEXT NOT NULL,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id               TEXT NOT NULL,
  user_id          TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id       TEXT NOT NULL,
  role             TEXT NOT NULL,
  content          TEXT NOT NULL,
  timestamp        INTEGER NOT NULL,
  execution_result TEXT,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session ON chat_messages(user_id, session_id);

-- 站点统计：单行表（id 恒为 1），原子自增避免 read-modify-write 竞态。
CREATE TABLE IF NOT EXISTS app_stats (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  pv INTEGER NOT NULL DEFAULT 0,
  uv INTEGER NOT NULL DEFAULT 0
);
`;

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  ensureDataDir();
  const db = new Database(DB_FILE);
  // 并发与完整性：WAL 提升读写并发，外键保证用户隔离的级联删除，busy_timeout 避免瞬时锁冲突直接报错。
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
  db.exec(SCHEMA);
  // 初始化统计单行（幂等：已存在则忽略）。
  db.prepare('INSERT OR IGNORE INTO app_stats (id, pv, uv) VALUES (1, 0, 0)').run();
  ensureGroupsUniqueIndex(db);
  runMigrations(db);

  _db = db;
  return db;
}

// 分组唯一约束：同一用户下分组名不可重复。
// 老库可能已有重复 (user_id, name) 数据导致建索引失败 —— 容错处理，失败仅 log，不让 getDb 崩。
function ensureGroupsUniqueIndex(db: Database.Database) {
  try {
    db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_groups_user_name ON groups(user_id, name)');
  } catch (error) {
    console.error('[DB] Failed to create unique index idx_groups_user_name (existing duplicate group names?):', error);
  }
}

// 幂等迁移：CREATE TABLE IF NOT EXISTS 不会为已存在的表补列，故对老库逐项检查后 ALTER。
function runMigrations(db: Database.Database) {
  const userCols = db.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  if (!userCols.some((c) => c.name === 'custom_icon')) {
    try {
      db.exec('ALTER TABLE users ADD COLUMN custom_icon TEXT');
    } catch (error) {
      // 多进程冷启动并发：另一进程可能已先加列，"duplicate column name" 可安全忽略，不致命。
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate column name/i.test(message)) {
        throw error;
      }
      console.warn('[DB] custom_icon column already added by a concurrent startup; ignoring.');
    }
  }
}
