#!/bin/bash

# STARK Todo List - Docker 启动脚本
# 默认端口: 4000 (可在 docker-compose.yml 中修改)

# 初始化脚本：确保 todos.json 文件存在
if [ ! -f "todos.json" ]; then
    echo "[]" > todos.json
    echo "✓ 已创建 todos.json 文件"
fi

# 启动 Docker Compose
echo "🚀 正在启动 STARK Todo List (Docker)..."
docker compose up -d --build

echo ""
echo "✅ 应用已启动成功！"
echo "📍 访问地址: http://localhost:4000"
echo ""
echo "📋 正在显示后端日志 (Ctrl+C 退出日志查看)..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# 自动显示日志
# docker compose logs -f
