import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTmpDataDir, cleanupTmpDataDir } from './helpers/tmpDb';

const tmpDir = setupTmpDataDir();

type SessionMod = typeof import('@/lib/auth/session');
type UserRepo = typeof import('@/lib/db/userRepo');

let session: SessionMod;
let userRepo: UserRepo;

const USER_ID = 'sess-user-1';

beforeAll(async () => {
  session = await import('@/lib/auth/session');
  userRepo = await import('@/lib/db/userRepo');
  userRepo.createUser({ id: USER_ID, username: 'carol', passwordHash: 'x', createdAt: Date.now() });
});

afterAll(() => cleanupTmpDataDir(tmpDir));

function reqWithToken(token: string): Request {
  return new Request('http://localhost:3000/api/todos', {
    method: 'GET',
    headers: { Cookie: `${session.SESSION_COOKIE_NAME}=${token}` },
  });
}

describe('auth/session', () => {
  it('createSession 生成 token，requireUser 能据此还原用户', () => {
    const { token, expiresAt } = session.createSession(USER_ID);
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(32);
    expect(expiresAt).toBeGreaterThan(Date.now());

    const authed = session.requireUser(reqWithToken(token));
    expect(authed).not.toBeNull();
    expect(authed?.userId).toBe(USER_ID);
    expect(authed?.username).toBe('carol');
  });

  it('无 cookie 的请求 requireUser 返回 null', () => {
    const req = new Request('http://localhost:3000/api/todos', { method: 'GET' });
    expect(session.requireUser(req)).toBeNull();
  });

  it('伪造/不存在的 token requireUser 返回 null', () => {
    expect(session.requireUser(reqWithToken('deadbeef'.repeat(8)))).toBeNull();
  });

  it('destroySession 后该 token 失效', () => {
    const { token } = session.createSession(USER_ID);
    expect(session.requireUser(reqWithToken(token))?.userId).toBe(USER_ID);
    session.destroySession(reqWithToken(token));
    expect(session.requireUser(reqWithToken(token))).toBeNull();
  });

  describe('isSameOrigin (CSRF)', () => {
    function req(headers: Record<string, string>): Request {
      return new Request('http://localhost:3000/api/todos', { method: 'POST', headers });
    }
    it('同源 Origin 通过', () => {
      expect(session.isSameOrigin(req({ Host: 'localhost:3000', Origin: 'http://localhost:3000' }))).toBe(true);
    });
    it('跨站 Origin 拒绝', () => {
      expect(session.isSameOrigin(req({ Host: 'localhost:3000', Origin: 'http://evil.com' }))).toBe(false);
    });
    it('无 Origin 无 Referer 拒绝', () => {
      expect(session.isSameOrigin(req({ Host: 'localhost:3000' }))).toBe(false);
    });
    it('同源 Referer 回退通过', () => {
      expect(session.isSameOrigin(req({ Host: 'localhost:3000', Referer: 'http://localhost:3000/app' }))).toBe(true);
    });
  });
});
