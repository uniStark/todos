# ===================================
# Stage 1: 依赖安装
# ===================================
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# 配置镜像源加速
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set fetch-timeout 600000

COPY package.json pnpm-lock.yaml* ./

# 只安装生产依赖
RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && \
      pnpm config set registry https://registry.npmmirror.com && \
      pnpm config set fetch-timeout 600000 && \
      pnpm i --frozen-lockfile; \
    else \
      npm ci; \
    fi

# ===================================
# Stage 2: 构建阶段
# ===================================
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 创建必要的目录
RUN mkdir -p public

# 禁用遥测
ENV NEXT_TELEMETRY_DISABLED=1

# 构建应用（会生成 .next/standalone 目录）
RUN npm run build

# ===================================
# Stage 3: 生产运行（极致轻量）
# ===================================
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 创建非特权用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 只复制必要的文件（standalone 模式）
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# 创建数据目录并设置权限
RUN mkdir -p /app/data && \
    touch /app/data/todos.json && \
    echo "[]" > /app/data/todos.json && \
    touch /app/data/stats.json && \
    echo "{\"pv\": 0, \"uv\": 0, \"visitors\": []}" > /app/data/stats.json && \
    chown -R nextjs:nodejs /app/data && \
    chmod -R 755 /app/data

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 使用 node 直接启动，不需要 npm（更轻量）
CMD ["node", "server.js"]
