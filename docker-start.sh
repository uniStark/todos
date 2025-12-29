#!/bin/bash

# 初始化脚本：确保 todos.json 文件存在
if [ ! -f "todos.json" ]; then
    echo "[]" > todos.json
    echo "✓ 已创建 todos.json 文件"
fi

# 启动 Docker Compose
docker compose up -d --build

echo "✓ 应用已启动，访问: http://localhost:3000"

