// 用户名规范化：trim + 转小写，约束为 3-32 位字母/数字/下划线。返回 null 表示非法。
export function normalizeUsername(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toLowerCase();
  return /^[a-z0-9_]{3,32}$/.test(v) ? v : null;
}

export function isValidPassword(raw: unknown): raw is string {
  return typeof raw === 'string' && raw.length >= 6 && raw.length <= 128;
}
