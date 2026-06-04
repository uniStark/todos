#!/usr/bin/env node
// 从备份恢复 SQLite 数据库。
//
// 重要：恢复会覆盖现有 todos.db，必须在「服务已停止」的前提下执行
//       （否则正在写入的 Next 进程会与恢复操作冲突，导致数据损坏）。
//       Docker 部署下请先 `docker compose stop`（或 stop 对应容器）再运行本脚本。
//
// 用法：
//   DATA_DIR=/app/data node scripts/restore-sqlite.mjs <backup-file>
//   # <backup-file> 可以是绝对路径，或 DATA_DIR/backups/ 下的文件名
//
// 行为：
//   1. 校验备份文件存在且为合法 SQLite 库（能打开并读到 sqlite_master）。
//   2. 把当前 todos.db（及其 -wal/-shm）改名为 todos.db.bak-<ts> 作为安全副本。
//   3. 复制备份文件到 todos.db。
//
// 退出码：0 成功；非 0 失败（错误写 stderr）。

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || process.cwd();
const DB_FILE = path.join(DATA_DIR, 'todos.db');
const BACKUP_DIR = path.join(DATA_DIR, 'backups');

function usageAndExit(msg) {
  if (msg) console.error(`[restore] ${msg}`);
  console.error('Usage: DATA_DIR=<dir> node scripts/restore-sqlite.mjs <backup-file>');
  console.error('Stop the app/container BEFORE running this script.');
  process.exit(1);
}

function resolveBackupPath(arg) {
  if (!arg) return null;
  if (fs.existsSync(arg)) return arg; // 绝对/相对路径直接命中
  const inBackupDir = path.join(BACKUP_DIR, arg);
  if (fs.existsSync(inBackupDir)) return inBackupDir;
  return null;
}

function assertValidSqlite(file) {
  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    db.prepare('SELECT count(*) FROM sqlite_master').get();
  } finally {
    db.close();
  }
}

function main() {
  const arg = process.argv[2];
  if (!arg) usageAndExit('Missing <backup-file> argument.');

  const backupPath = resolveBackupPath(arg);
  if (!backupPath) usageAndExit(`Backup file not found: ${arg}`);

  try {
    assertValidSqlite(backupPath);
  } catch (err) {
    usageAndExit(`Not a valid SQLite database: ${backupPath} (${err instanceof Error ? err.message : err})`);
  }

  const ts = new Date().toISOString().replace(/[:.]/g, '-');

  // 把现有 db 及 WAL/SHM 旁路保存，避免残留 WAL 覆盖恢复结果
  for (const suffix of ['', '-wal', '-shm']) {
    const f = DB_FILE + suffix;
    if (fs.existsSync(f)) {
      const dest = `${f}.bak-${ts}`;
      fs.renameSync(f, dest);
      console.log(`[restore] Moved existing ${path.basename(f)} -> ${path.basename(dest)}`);
    }
  }

  fs.copyFileSync(backupPath, DB_FILE);
  console.log(`[restore] Restored ${backupPath} -> ${DB_FILE}`);
  console.log('[restore] Done. You can now restart the app/container.');
}

main();
