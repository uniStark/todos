import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '@/lib/auth/password';

// password.ts 是纯函数（仅依赖 crypto），无需 DB。
describe('auth/password', () => {
  it('round-trip：hashPassword 后 verifyPassword 返回 true', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(stored.startsWith('scrypt$')).toBe(true);
    await expect(verifyPassword('correct horse battery', stored)).resolves.toBe(true);
  });

  it('错误密码 verifyPassword 返回 false', async () => {
    const stored = await hashPassword('s3cret-pass');
    await expect(verifyPassword('wrong-pass', stored)).resolves.toBe(false);
  });

  it('每次 hash 的 salt 不同，故同明文产出不同存储串', async () => {
    const a = await hashPassword('same-input');
    const b = await hashPassword('same-input');
    expect(a).not.toBe(b);
    await expect(verifyPassword('same-input', a)).resolves.toBe(true);
    await expect(verifyPassword('same-input', b)).resolves.toBe(true);
  });

  it('畸形 stored 串 verifyPassword 返回 false', async () => {
    await expect(verifyPassword('x', '')).resolves.toBe(false);
    await expect(verifyPassword('x', 'not-a-valid-hash')).resolves.toBe(false);
    await expect(verifyPassword('x', 'bcrypt$1$2$3$4$5')).resolves.toBe(false);
    await expect(verifyPassword('x', 'scrypt$0$8$1$abcd$ef')).resolves.toBe(false);
    await expect(verifyPassword('x', 'scrypt$16384$8$1')).resolves.toBe(false);
  });
});
