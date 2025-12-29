# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml* ./

# 配置 npm 镜像源（解决网络超时问题）
RUN npm config set registry https://registry.npmmirror.com && \
    npm config set network-timeout 600000

RUN if [ -f pnpm-lock.yaml ]; then \
      corepack enable && \
      pnpm config set registry https://registry.npmmirror.com && \
      pnpm config set network-timeout 600000 && \
      pnpm i --frozen-lockfile; \
    else \
      npm i; \
    fi

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create a group and user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/src ./src

# Ensure we can write to todos.json in the container
RUN touch todos.json && chown nextjs:nodejs todos.json

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["npm", "start"]

