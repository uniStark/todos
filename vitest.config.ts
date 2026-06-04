import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // 复刻 tsconfig 的 @/* -> ./src/* 路径别名
      '@': path.resolve(__dirname, './src'),
      // A 的 rateLimit.ts 顶部 import 'server-only'，该包在 node 测试环境下会抛错，
      // 用空模块 stub 掉，使纯函数可在 vitest node 环境直接被测。
      'server-only': path.resolve(__dirname, './tests/stubs/server-only.ts'),
    },
  },
  test: {
    // better-sqlite3 是原生模块，必须用 node 环境（非 jsdom）
    environment: 'node',
    globals: true,
    include: ['tests/**/*.test.ts', 'src/**/__tests__/**/*.test.ts'],
    // 不并行跨文件共享单例 DB：每个测试文件用独立临时 DATA_DIR，
    // 但单例 _db 缓存基于进程，故让每个测试文件跑在独立进程（fork）中互不污染。
    pool: 'forks',
  },
});
