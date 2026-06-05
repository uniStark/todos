# syntax=docker/dockerfile:1
# ===================================
# Stage 1: 依赖安装
# ===================================
# 使用 Debian slim（glibc）而非 alpine：better-sqlite3 等原生模块在 glibc 下兼容性最佳。
FROM node:22-bookworm-slim AS deps
WORKDIR /app

# 原生模块（better-sqlite3）在 prebuilt 不可用时需要 node-gyp 编译工具链。
# 换用国内 Debian 镜像源加速 apt（兼容 deb822 .sources 与传统 sources.list 两种格式）。
RUN { [ -f /etc/apt/sources.list.d/debian.sources ] && sed -i 's|deb.debian.org|mirrors.ustc.edu.cn|g; s|security.debian.org|mirrors.ustc.edu.cn|g' /etc/apt/sources.list.d/debian.sources; } ; \
    { [ -f /etc/apt/sources.list ] && sed -i 's|deb.debian.org|mirrors.ustc.edu.cn|g; s|security.debian.org|mirrors.ustc.edu.cn|g' /etc/apt/sources.list; } ; \
    apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# 配置镜像源加速
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 600000

COPY package.json pnpm-lock.yaml* ./

# 安装依赖（pnpm 通过 package.json 的 onlyBuiltDependencies 允许 better-sqlite3 执行构建脚本）
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && \
      corepack prepare pnpm@10.33.0 --activate && \
      pnpm config set registry https://registry.npmmirror.com && \
      pnpm config set fetch-timeout 600000 && \
      pnpm i --frozen-lockfile; \
    else \
      npm ci; \
    fi

# ===================================
# Stage 2: 构建阶段
# ===================================
FROM node:22-bookworm-slim AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN mkdir -p public

ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用（生成 .next/standalone 目录）
# .next/cache 挂 BuildKit cache mount：持久化 Next 的 SWC/webpack 增量编译缓存，跨 build 复用。
# 改少量源码时增量编译，build 从全量 ~60s 降到十几秒；构建产物（.next/standalone、.next/static）
# 不在 .next/cache 内，不受影响、照常 COPY 到 runner。
RUN --mount=type=cache,id=todos-next-cache,target=/app/.next/cache npm run build

# 裁剪为生产依赖（保留 better-sqlite3 原生模块及其传递依赖），供 runner 复用
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate && pnpm prune --prod

# ===================================
# Stage 3: 生产运行
# ===================================
FROM node:22-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非特权用户（Debian 使用 groupadd/useradd）
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# standalone 输出（含按需 trace 的 node_modules）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# standalone 不会自动包含原生外部依赖（better-sqlite3）。
# 复用 builder 裁剪后的生产 node_modules（含 better-sqlite3 原生绑定及传递依赖），补全 standalone 的空 node_modules。
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules

# 维护脚本（供 maintenance sidecar 容器调用；app 容器不使用，一并打包便于复用同一镜像）
COPY --from=builder --chown=nextjs:nodejs /app/scripts ./scripts

# 数据目录（SQLite 数据库与旧 JSON 都存于此）
RUN mkdir -p /app/data && \
    chown -R nextjs:nodejs /app/data && \
    chmod -R 755 /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 容器无 curl，用 node 内置 fetch 探活 /api/health（Next 监听 3000）。
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
