import 'server-only';
import { getDb } from './index';

export interface Stats {
  pv: number;
  uv: number;
}

// 原子读：单行表 id=1。app_stats 在 getDb() 中已被 INSERT OR IGNORE 初始化，理论上必存在；
// 兜底返回 {pv:0,uv:0} 以防极端情况。
export function getStats(): Stats {
  const row = getDb()
    .prepare('SELECT pv, uv FROM app_stats WHERE id = 1')
    .get() as { pv: number; uv: number } | undefined;
  return { pv: row?.pv ?? 0, uv: row?.uv ?? 0 };
}

// 原子自增：UPDATE ... SET pv = pv + 1（可选 uv + 1），避免 read-modify-write 竞态。
// 单条 SQL 在 SQLite 中是原子的，多并发请求不会丢更新。
export function recordHit(isNewVisitor: boolean): Stats {
  const db = getDb();
  if (isNewVisitor) {
    db.prepare('UPDATE app_stats SET pv = pv + 1, uv = uv + 1 WHERE id = 1').run();
  } else {
    db.prepare('UPDATE app_stats SET pv = pv + 1 WHERE id = 1').run();
  }
  return getStats();
}
