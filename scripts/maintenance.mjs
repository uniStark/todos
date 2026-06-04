#!/usr/bin/env node
// 外置维护脚本（幂等，不依赖 Next runtime，直接用 better-sqlite3 打开 DATA_DIR/todos.db）。
//
// 做三件事：
//   1. 清理过期 session：DELETE FROM sessions WHERE expires_at < now
//   2. 物理删除软删超过 30 天的 todos：deleted=1 AND deleted_at < now-30d
//   3. 备份：wal_checkpoint(TRUNCATE) -> VACUUM INTO backups/todos-<timestamp>.db
//
// 用法（建议 cron 调用，例如每日一次）：
//   DATA_DIR=/app/data node scripts/maintenance.mjs
//   DATA_DIR=/app/data node scripts/maintenance.mjs <timestamp>   # 可选：自定义备份文件名时间戳
//
// 退出码：0 成功；非 0 表示失败（错误写 stderr）。

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_FILE = path.join(DATA_DIR, 'todos.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 天
const BACKUP_KEEP = 7; // 保留最近 7 份备份
const MIN_FREE_BYTES = 100 * 1024 * 1024; // 备份前要求至少 100MB 剩余空间

// 备份文件名时间戳：命令行参数优先，否则用当前时间生成（普通 node 脚本可直接用 Date）。
function backupTimestamp() {
  const arg = process.argv[2];
  if (arg && arg.trim()) return arg.trim();
  return new Date().toISOString().replace(/[:.]/g, '-');
}

// 检查目标目录所在磁盘的剩余空间（字节）。优先 fs.statfsSync，回退 df。
function getFreeBytes(dir) {
  try {
    if (typeof fs.statfsSync === 'function') {
      const st = fs.statfsSync(dir);
      return Number(st.bavail) * Number(st.bsize);
    }
  } catch {
    // 落到 df 回退
  }
  try {
    // df -k 输出 KB；取 Available 列
    const out = execSync(`df -k ${JSON.stringify(dir)}`, { encoding: 'utf-8' });
    const lines = out.trim().split('\n');
    const cols = lines[lines.length - 1].trim().split(/\s+/);
    // 典型：Filesystem 1K-blocks Used Available Capacity Mounted
    const availKb = Number(cols[3]);
    if (Number.isFinite(availKb)) return availKb * 1024;
  } catch {
    // ignore
  }
  return null; // 无法判定
}

function cleanupExpiredSessions(db, now) {
  const info = db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
  console.log(`[maintenance] Deleted ${info.changes} expired session(s).`);
}

function purgeSoftDeletedTodos(db, now) {
  const cutoff = now - SOFT_DELETE_RETENTION_MS;
  const info = db
    .prepare('DELETE FROM todos WHERE deleted = 1 AND deleted_at IS NOT NULL AND deleted_at < ?')
    .run(cutoff);
  console.log(`[maintenance] Purged ${info.changes} soft-deleted todo(s) older than 30 days.`);
}

function backup(db, timestamp) {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  // 磁盘空间检查
  const free = getFreeBytes(BACKUP_DIR);
  if (free !== null && free < MIN_FREE_BYTES) {
    throw new Error(
      `Insufficient disk space for backup: ${free} bytes free, need at least ${MIN_FREE_BYTES}. Skipping backup.`
    );
  }

  const target = path.join(BACKUP_DIR, `todos-${timestamp}.db`);
  if (fs.existsSync(target)) {
    throw new Error(`Backup target already exists: ${target}`);
  }

  // 先把 WAL 落盘并截断，保证 VACUUM INTO 出来的是完整一致的库
  db.pragma('wal_checkpoint(TRUNCATE)');
  // VACUUM INTO 生成紧凑的一致性快照
  db.prepare(`VACUUM INTO ?`).run(target);
  console.log(`[maintenance] Backup written to ${target}`);

  // 保留最近 BACKUP_KEEP 份，按文件名排序删旧（文件名含时间戳，字典序≈时间序）
  const backups = fs
    .readdirSync(BACKUP_DIR)
    .filter((f) => /^todos-.*\.db$/.test(f))
    .sort();
  const excess = backups.length - BACKUP_KEEP;
  if (excess > 0) {
    for (const f of backups.slice(0, excess)) {
      fs.unlinkSync(path.join(BACKUP_DIR, f));
      console.log(`[maintenance] Removed old backup ${f}`);
    }
  }
}

function main() {
  if (!fs.existsSync(DB_FILE)) {
    console.error(`[maintenance] Database not found at ${DB_FILE}`);
    process.exit(1);
  }

  const timestamp = backupTimestamp();
  const now = Date.now();
  const db = new Database(DB_FILE);

  try {
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    db.pragma('busy_timeout = 5000');

    cleanupExpiredSessions(db, now);
    purgeSoftDeletedTodos(db, now);
    backup(db, timestamp);

    console.log('[maintenance] Done.');
  } catch (err) {
    console.error('[maintenance] Failed:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
  } finally {
    db.close();
  }
}

main();
