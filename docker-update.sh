#!/bin/bash

# STARK Todo List - Docker 快速更新脚本
# 用于快速停止、重新构建并启动 Docker 容器

echo "🔄 正在更新 STARK Todo List (Docker)..."
echo ""

# 1. 停止并移除现有容器
echo "📦 停止现有容器..."
docker compose down

echo ""

# 2. 可选：拉取最新代码（如果是 Git 仓库）
if [ -d ".git" ]; then
    echo "📥 拉取最新代码..."
    git pull origin main
    echo ""
fi

# 3. 重新构建并启动
echo "🏗️  重新构建 Docker 镜像..."
docker compose build --no-cache

echo ""
echo "🚀 启动新容器..."
docker compose up -d

echo ""
echo "✅ 更新完成！"
echo "📍 访问地址: http://localhost:4000"
echo ""
echo "📋 正在显示后端日志 (Ctrl+C 退出日志查看)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 显示日志
docker compose logs -f
