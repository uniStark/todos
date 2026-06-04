import 'server-only';
import { scrypt, randomBytes, timingSafeEqual, type ScryptOptions } from 'crypto';

// 手写 Promise 包装：直接命中带 options 的 scrypt 重载，避免 promisify 推断为 3 参重载导致的类型错误
function scryptAsync(password: string, salt: Buffer, keylen: number, options: ScryptOptions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

// scrypt 参数：N=16384 (2^14) 为 Node 默认成本，r=8/p=1 标准取值；keylen=64。
const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 64;
const SALT_BYTES = 16;

// 存储格式：scrypt$N$r$p$saltHex$hashHex —— 单字段自描述，便于将来调参兼容旧值。
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = await scryptAsync(plain, salt, KEYLEN, { N, r: R, p: P });
  return `scrypt$${N}$${R}$${P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'scrypt') {
    return false;
  }
  const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
  const n = parseInt(nStr, 10);
  const r = parseInt(rStr, 10);
  const p = parseInt(pStr, 10);
  if (!n || !r || !p || !saltHex || !hashHex) {
    return false;
  }

  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  let derived: Buffer;
  try {
    derived = await scryptAsync(plain, salt, expected.length, { N: n, r, p });
  } catch {
    return false;
  }
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
