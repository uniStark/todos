import { renameSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const appApiDir = join(process.cwd(), 'src', 'app', 'api');
const disabledApiDir = join(process.cwd(), 'src', 'app', '_api-routes-disabled-for-static-export');

let movedApiRoutes = false;

function restoreApiRoutes() {
  if (!movedApiRoutes) {
    return;
  }

  if (existsSync(appApiDir)) {
    rmSync(appApiDir, { recursive: true, force: true });
  }
  renameSync(disabledApiDir, appApiDir);
  movedApiRoutes = false;
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    restoreApiRoutes();
    process.kill(process.pid, signal);
  });
}

try {
  if (existsSync(disabledApiDir)) {
    throw new Error(`${disabledApiDir} already exists. Restore or remove it before building mobile.`);
  }

  if (existsSync(appApiDir)) {
    renameSync(appApiDir, disabledApiDir);
    movedApiRoutes = true;
  }

  const result = spawnSync('next', ['build'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NEXT_OUTPUT: 'export',
      NEXT_DIST_DIR: '.next-mobile',
    },
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
} catch (error) {
  console.error('[build:mobile] Failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  restoreApiRoutes();
}
