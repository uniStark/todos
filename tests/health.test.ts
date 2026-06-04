import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { setupTmpDataDir, cleanupTmpDataDir } from './helpers/tmpDb';

const tmpDir = setupTmpDataDir();

type HealthRoute = typeof import('@/app/api/health/route');
let healthRoute: HealthRoute;

beforeAll(async () => {
  healthRoute = await import('@/app/api/health/route');
});

afterAll(() => cleanupTmpDataDir(tmpDir));

describe('/api/health', () => {
  it('DB 可用时返回 200 {status:"ok"}', async () => {
    const res = await healthRoute.GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });
});
