#!/bin/bash

# STARK Todo List - Docker 快速更新脚本
# 用于快速停止、重新构建并启动 Docker 容器

echo "🔄 正在更新 STARK Todo List (Docker)..."
echo ""

# 1. 停止并移除现有容器
echo "📦 停止现有容器..."
docker compose down

echo ""

# 2. 拉取最新代码
if [ -d ".git" ]; then
    echo "📥 正在获取远程最新代码..."
    # 获取当前分支名称
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo "📍 当前分支: $CURRENT_BRANCH"
    
    # 尝试拉取代码
    if git pull origin "$CURRENT_BRANCH"; then
        echo "✅ 代码拉取成功"
    else
        echo "❌ 代码拉取失败！可能是存在本地冲突。"
        echo "💡 提示: 如果您想强制覆盖本地更改，请运行 'git reset --hard origin/$CURRENT_BRANCH'"
        exit 1
    fi
    echo ""
fi

# 3. 重新构建并启动
echo "🏗️  开始构建最新镜像 (使用 --no-cache 确保完全重新安装依赖)..."
# 彻底清理旧镜像和容器，确保构建环境干净
docker compose down --rmi local --volumes --remove-orphans

if docker compose build --no-cache; then
    echo "✅ 镜像构建成功！"
else
    echo "❌ 镜像构建失败！请检查上方输出的错误信息。"
    exit 1
fi

echo ""
echo "🚀 启动新容器 (使用 --force-recreate 确保完全替换)..."
docker compose up -d --force-recreate

echo ""
echo "🧹 清理未使用的旧镜像..."
docker image prune -f

echo ""
echo "✅ 更新完成！"
echo "📍 访问地址: http://localhost:4000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 显示日志
# docker compose logs -f --tail 100
