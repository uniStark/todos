#!/bin/bash

# STARK Todo List - Docker 快速更新脚本
# 用于快速停止、重新构建并启动 Docker 容器
# Author: Adrian Stark

set -e

# 颜色
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# 默认配置
USE_CACHE=true
PULL_CODE=true
SHOW_LOGS=false
GIT_REMOTE="${GIT_REMOTE:-cnb}"
GIT_BRANCH="${GIT_BRANCH:-main}"
CNB_URL="${CNB_URL:-https://cnb.cool/stark.inc/todos.git}"
REMOTE_BRANCH="${GIT_REMOTE}/${GIT_BRANCH}"

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
    echo "  ./docker-update.sh          # 默认：拉取 cnb/main + 使用缓存构建"
    echo "  ./docker-update.sh -f       # 完全重建（不使用缓存）"
    echo "  ./docker-update.sh -q       # 快速模式（跳过 git pull）"
    echo "  ./docker-update.sh -q -l    # 快速模式 + 显示日志"
    echo ""
    echo "Git 默认: 远程 ${CYAN}cnb${NC}，分支 ${CYAN}main${NC}。可通过环境变量覆盖:"
    echo "  GIT_REMOTE=cnb GIT_BRANCH=main ./docker-update.sh"
    echo "  CNB_URL 默认: ${CYAN}https://cnb.cool/stark.inc/todos.git${NC}（可覆盖）"
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

# 显示配置
echo -e "${BLUE}📋 配置${NC}  Git: $([ "$PULL_CODE" = true ] && echo -e "${GREEN}拉取 ${REMOTE_BRANCH}${NC}" || echo -e "${YELLOW}跳过${NC}")  缓存: $([ "$USE_CACHE" = true ] && echo -e "${GREEN}开${NC}" || echo -e "${YELLOW}关${NC}")"
echo ""

# 记录开始时间
START_TIME=$(date +%s)

# 1. 拉取最新代码（默认 cnb/main）
if [ "$PULL_CODE" = true ] && [ -d ".git" ]; then
    if ! git remote get-url "$GIT_REMOTE" &>/dev/null; then
        git remote add "$GIT_REMOTE" "$CNB_URL"
        echo -e "${BLUE}📥 已添加远程 ${GIT_REMOTE}${NC}"
    elif [ "$(git remote get-url "$GIT_REMOTE" 2>/dev/null)" != "$CNB_URL" ]; then
        git remote set-url "$GIT_REMOTE" "$CNB_URL"
        echo -e "${BLUE}📥 已更新远程 ${GIT_REMOTE} 地址${NC}"
    fi
    echo -e "${BLUE}📥 获取 ${REMOTE_BRANCH}...${NC}"
    current=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || true)
    [ -n "$current" ] && echo -e "   当前: ${CYAN}${current}${NC} → ${CYAN}${REMOTE_BRANCH}${NC}"
    if ! git fetch "$GIT_REMOTE" 2>&1; then
        echo -e "${RED}   ✗ fetch 失败，请检查 'git remote -v'${NC}"
        exit 1
    fi
    if git rev-parse --verify "${REMOTE_BRANCH}" &>/dev/null; then
        git checkout -B "$GIT_BRANCH" "${REMOTE_BRANCH}" 2>&1
        echo -e "${GREEN}   ✓ 已对齐 ${REMOTE_BRANCH}${NC}"
    else
        echo -e "${RED}   ✗ 远程分支 ${REMOTE_BRANCH} 不存在${NC}"
        exit 1
    fi
    echo ""
fi

# 2. 停止现有容器（保留数据卷）
echo -e "${BLUE}📦 停止现有容器...${NC}"
# 注意：不使用 -v 参数，以保留 todos-data 卷中的 todos.json 和 stats.json
docker compose down --remove-orphans 2>/dev/null || true
echo -e "${GREEN}   ✓ 容器已停止 (数据卷已保留)${NC}"
echo ""

# 3. 构建镜像
echo -e "${BLUE}🏗️  构建 Docker 镜像...${NC}"
if [ "$USE_CACHE" = false ]; then
    echo -e "${YELLOW}   (完全重建，可能需数分钟)${NC}"
    docker compose down --rmi local 2>/dev/null || true
fi
build_opts=()
[ "$USE_CACHE" = false ] && build_opts=(--no-cache)
docker compose build "${build_opts[@]}" 2>&1 | sed 's/^/   /'
[ "${PIPESTATUS[0]}" -ne 0 ] && { echo -e "${RED}   ✗ 镜像构建失败${NC}"; exit 1; }
echo -e "${GREEN}   ✓ 镜像构建成功${NC}"
echo ""

# 4. 启动新容器
echo -e "${BLUE}🚀 启动新容器...${NC}"
docker compose up -d --force-recreate
echo -e "${GREEN}   ✓ 容器已启动${NC}"
echo ""

# 5. 验证数据
echo -e "${BLUE}📊 验证数据...${NC}"
sleep 2
cid=$(docker compose ps -q app 2>/dev/null)
if [ -n "$cid" ]; then
    todos_count=$(docker exec "$cid" sh -c 'grep -o "\"id\"" /app/data/todos.json 2>/dev/null | wc -l' 2>/dev/null || echo "0")
    stats=$(docker exec "$cid" cat /app/data/stats.json 2>/dev/null || echo '{"pv":0,"uv":0}')
    pv=$(echo "$stats" | grep -Eo '"pv":[0-9]+' | grep -Eo '[0-9]+' || echo "0")
    uv=$(echo "$stats" | grep -Eo '"uv":[0-9]+' | grep -Eo '[0-9]+' || echo "0")
    echo -e "${GREEN}   ✓ 数据卷正常${NC}  Todos: ${CYAN}${todos_count}${NC}  PV: ${CYAN}${pv}${NC}  UV: ${CYAN}${uv}${NC}"
else
    echo -e "${YELLOW}   ⚠ 未获取到 app 容器${NC}"
fi
echo ""

docker image prune -f &>/dev/null || true

duration=$(($(date +%s) - START_TIME))
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}   ✅ 完成${NC}  ${CYAN}http://localhost:4000${NC}  耗时 ${YELLOW}${duration}s${NC}  卷 ${CYAN}todos-data${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

[ "$SHOW_LOGS" = true ] && { echo -e "${BLUE}📋 日志 (Ctrl+C 退出)${NC}"; echo ""; docker compose logs -f --tail 50; }
