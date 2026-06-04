import 'server-only';

// 纯内存限流模块（单实例临时防护）。
//
// 说明 / 局限：
// - 这是进程内 Map 实现，仅在「单实例」部署下有效，进程重启即清零。
// - 未来若横向扩展为「多实例」（多副本 / Serverless 多实例），必须迁移到
//   Redis 或 SQLite token-bucket 等共享存储，否则各实例计数互相独立、限流失效。
// - 每次写入时做惰性过期清理 + 周期性全量清理，避免长期运行下 Map 无限增长导致内存泄漏。

interface Bucket {
  // 窗口起始时间戳（ms）
  windowStart: number;
  // 当前窗口内命中次数
  count: number;
}

const buckets = new Map<string, Bucket>();

// 惰性清理：上次做全量清理的时间，避免每次命中都遍历整个 Map
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 5 * 60 * 1000; // 至多每 5 分钟做一次全量清理

// 全量清理过期条目（window 已结束的桶）。windowMs 不固定，故用「桶的 windowStart + 一个保守上限」判断。
// 这里用调用方传入的 windowMs 不可得，因此以「桶在 1 小时内无任何更新」作为兜底过期阈值，
// 真正的窗口判定在 hitRateLimit 内按各自 windowMs 精确处理。
const STALE_BUCKET_MS = 60 * 60 * 1000;

function sweep(now: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (now - bucket.windowStart > STALE_BUCKET_MS) {
      buckets.delete(key);
    }
  }
}

// 归一化 IPv6：小写、去掉 zone id（fe80::1%eth0 -> fe80::1）、去掉 IPv4 映射前缀的处理交给调用方按需。
function normalizeIp(raw: string): string {
  let ip = raw.trim();
  if (!ip) return 'unknown';
  // 去掉端口形式 [v6]:port 的方括号
  if (ip.startsWith('[')) {
    const end = ip.indexOf(']');
    if (end !== -1) ip = ip.slice(1, end);
  }
  // 去掉 IPv6 zone id
  const pct = ip.indexOf('%');
  if (pct !== -1) ip = ip.slice(0, pct);
  return ip.toLowerCase();
}

// 取客户端 IP：优先 X-Real-IP，再取 X-Forwarded-For 的第一个（最靠近客户端的那个），
// IPv6 归一化（小写、去 %zone）；都取不到回退 'unknown'。
export function getClientIp(request: Request): string {
  const realIp = request.headers.get('x-real-ip');
  if (realIp && realIp.trim()) {
    return normalizeIp(realIp);
  }

  const fwd = request.headers.get('x-forwarded-for');
  if (fwd && fwd.trim()) {
    const first = fwd.split(',')[0];
    const normalized = normalizeIp(first);
    if (normalized && normalized !== 'unknown') return normalized;
  }

  return 'unknown';
}

// 记一次命中。固定窗口计数：窗口内累计次数超过 limit 即 limited，并给出建议 Retry-After 秒。
// limit=5 表示窗口内允许 5 次，第 6 次起 limited:true。
export function hitRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);

  let bucket = buckets.get(key);

  // 窗口已结束 -> 重置为新窗口
  if (!bucket || now - bucket.windowStart >= windowMs) {
    bucket = { windowStart: now, count: 0 };
    buckets.set(key, bucket);
  }

  bucket.count += 1;

  const elapsed = now - bucket.windowStart;
  const remainingMs = Math.max(0, windowMs - elapsed);
  const retryAfterSec = Math.max(1, Math.ceil(remainingMs / 1000));

  if (bucket.count > limit) {
    return { limited: true, retryAfterSec };
  }

  return { limited: false, retryAfterSec: 0 };
}

// 只读检查某 key 是否已达上限（不计数）。用于「失败才计数」的限流语义：
// 入口先 isLimited 判断是否拒绝，验证失败时才 hitRateLimit 记一次失败，成功则 resetRateLimit。
export function isLimited(
  key: string,
  limit: number,
  windowMs: number
): { limited: boolean; retryAfterSec: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= windowMs) {
    return { limited: false, retryAfterSec: 0 };
  }
  const remainingMs = Math.max(0, windowMs - (now - bucket.windowStart));
  return { limited: bucket.count >= limit, retryAfterSec: Math.max(1, Math.ceil(remainingMs / 1000)) };
}

// 清除某 key 的计数（例如登录成功后清掉该 IP/用户名的失败计数）。
export function resetRateLimit(key: string): void {
  buckets.delete(key);
}
