#!/bin/bash

# STARK Todo List - Docker 快速更新脚本
# 用于快速停止、重新构建并启动 Docker 容器

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 默认配置
USE_CACHE=true
PULL_CODE=true
SHOW_LOGS=false

# 帮助信息
show_help() {
    echo -e "${CYAN}STARK Todo List - Docker 快速更新脚本${NC}"
    echo ""
    echo "用法: ./docker-update.sh [选项]"
    echo ""
    echo "选项:"
    echo "  -f, --full       完全重建（不使用缓存，较慢但更彻底）"
    echo "  -q, --quick      快速更新（跳过 git pull，使用缓存）"
    echo "  -l, --logs       更新完成后显示日志"
    echo "  -h, --help       显示帮助信息"
    echo ""
    echo "示例:"
    echo "  ./docker-update.sh          # 默认：拉取代码 + 使用缓存构建"
    echo "  ./docker-update.sh -f       # 完全重建（不使用缓存）"
    echo "  ./docker-update.sh -q       # 快速模式（跳过 git pull）"
    echo "  ./docker-update.sh -q -l    # 快速模式 + 显示日志"
    echo ""
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--full)
            USE_CACHE=false
            shift
            ;;
        -q|--quick)
            PULL_CODE=false
            shift
            ;;
        -l|--logs)
            SHOW_LOGS=true
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}未知选项: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}   🔄 STARK Todo List - Docker 更新${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# 显示当前配置
echo -e "${BLUE}📋 更新配置:${NC}"
if [ "$PULL_CODE" = true ]; then
    echo -e "   • Git Pull: ${GREEN}是${NC}"
else
    echo -e "   • Git Pull: ${YELLOW}跳过${NC}"
fi
if [ "$USE_CACHE" = true ]; then
    echo -e "   • 构建缓存: ${GREEN}启用${NC} (快速)"
else
    echo -e "   • 构建缓存: ${YELLOW}禁用${NC} (完全重建)"
fi
echo ""

# 记录开始时间
START_TIME=$(date +%s)

# 1. 拉取最新代码
if [ "$PULL_CODE" = true ] && [ -d ".git" ]; then
    echo -e "${BLUE}📥 正在获取远程最新代码...${NC}"
    CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
    echo -e "   当前分支: ${CYAN}$CURRENT_BRANCH${NC}"
    
    if git pull origin "$CURRENT_BRANCH" 2>&1; then
        echo -e "${GREEN}   ✓ 代码已更新${NC}"
    else
        echo -e "${RED}   ✗ 代码拉取失败！${NC}"
        echo -e "${YELLOW}   💡 提示: 运行 'git reset --hard origin/$CURRENT_BRANCH' 强制覆盖本地更改${NC}"
        exit 1
    fi
    echo ""
fi

# 2. 停止现有容器
echo -e "${BLUE}📦 停止现有容器...${NC}"
docker compose down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}   ✓ 容器已停止${NC}"
echo ""

# 3. 构建镜像
echo -e "${BLUE}🏗️  构建 Docker 镜像...${NC}"
if [ "$USE_CACHE" = true ]; then
    # 使用缓存构建（快速）
    if docker compose build 2>&1 | while read line; do echo -e "   $line"; done; then
        echo -e "${GREEN}   ✓ 镜像构建成功${NC}"
    else
        echo -e "${RED}   ✗ 镜像构建失败！${NC}"
        exit 1
    fi
else
    # 不使用缓存（完全重建）
    echo -e "${YELLOW}   (完全重建模式，可能需要几分钟...)${NC}"
    docker compose down --rmi local 2>/dev/null || true
    if docker compose build --no-cache 2>&1 | while read line; do echo -e "   $line"; done; then
        echo -e "${GREEN}   ✓ 镜像构建成功${NC}"
    else
        echo -e "${RED}   ✗ 镜像构建失败！${NC}"
        exit 1
    fi
fi
echo ""

# 4. 启动新容器
echo -e "${BLUE}🚀 启动新容器...${NC}"
docker compose up -d --force-recreate
echo -e "${GREEN}   ✓ 容器已启动${NC}"
echo ""

# 5. 清理悬空镜像（静默执行）
docker image prune -f > /dev/null 2>&1 || true

# 计算耗时
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   ✅ 更新完成！${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "   📍 访问地址: ${CYAN}http://localhost:4000${NC}"
echo -e "   ⏱️  总耗时: ${YELLOW}${DURATION}秒${NC}"
echo ""

# 显示日志
if [ "$SHOW_LOGS" = true ]; then
    echo -e "${BLUE}📋 显示容器日志 (Ctrl+C 退出)...${NC}"
    echo ""
    docker compose logs -f --tail 50
fi
