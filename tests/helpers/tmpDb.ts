import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 在 import 任何 db 模块「之前」设置一个独立临时 DATA_DIR。
// db/index.ts 在模块顶层读取 process.env.DATA_DIR 决定 DB_FILE 路径，且 getDb() 用单例 _db 缓存，
// 因此必须在首次 import db 之前调用本函数。每个测试文件在独立 fork 进程内运行，互不污染。
//
// 返回临时目录路径，便于测试结束清理。
export function setupTmpDataDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'todos-test-'));
  process.env.DATA_DIR = dir;
  return dir;
}

export function cleanupTmpDataDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    // 忽略清理失败（WAL 文件可能仍被句柄占用，进程退出后会被系统回收）
  }
}
