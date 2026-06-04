import { describe, it, expect, beforeEach } from 'vitest';
import { getClientIp, hitRateLimit, resetRateLimit } from '@/lib/rateLimit';

// 按子代理 A 的契约编写。'server-only' import 由 vitest alias stub。
describe('rateLimit', () => {
  describe('hitRateLimit', () => {
    const KEY = 'test-key';
    beforeEach(() => resetRateLimit(KEY));

    it('窗口内累计超过 limit 后返回 limited:true', () => {
      const limit = 3;
      const win = 60_000;
      for (let i = 0; i < limit; i++) {
        expect(hitRateLimit(KEY, limit, win).limited).toBe(false);
      }
      const over = hitRateLimit(KEY, limit, win);
      expect(over.limited).toBe(true);
      expect(over.retryAfterSec).toBeGreaterThanOrEqual(1);
    });

    it('resetRateLimit 后计数恢复，可重新累计', () => {
      const limit = 2;
      hitRateLimit(KEY, limit, 60_000);
      hitRateLimit(KEY, limit, 60_000);
      expect(hitRateLimit(KEY, limit, 60_000).limited).toBe(true);
      resetRateLimit(KEY);
      expect(hitRateLimit(KEY, limit, 60_000).limited).toBe(false);
    });

    it('不同 key 计数互相独立', () => {
      hitRateLimit('k1', 1, 60_000);
      expect(hitRateLimit('k1', 1, 60_000).limited).toBe(true);
      expect(hitRateLimit('k2', 1, 60_000).limited).toBe(false);
      resetRateLimit('k1');
      resetRateLimit('k2');
    });
  });

  describe('getClientIp', () => {
    function req(headers: Record<string, string>): Request {
      return new Request('http://localhost/api', { headers });
    }

    it('优先解析 X-Real-IP', () => {
      expect(getClientIp(req({ 'X-Real-IP': '203.0.113.7' }))).toBe('203.0.113.7');
    });

    it('回退 X-Forwarded-For 取第一个', () => {
      expect(getClientIp(req({ 'X-Forwarded-For': '198.51.100.4, 10.0.0.1' }))).toBe('198.51.100.4');
    });

    it('X-Real-IP 优先于 X-Forwarded-For', () => {
      expect(
        getClientIp(req({ 'X-Real-IP': '1.1.1.1', 'X-Forwarded-For': '2.2.2.2' }))
      ).toBe('1.1.1.1');
    });

    it('IPv6 归一化为小写并去掉 zone id', () => {
      expect(getClientIp(req({ 'X-Real-IP': 'FE80::1%eth0' }))).toBe('fe80::1');
    });

    it('无相关头时回退 unknown', () => {
      expect(getClientIp(req({}))).toBe('unknown');
    });
  });
});
