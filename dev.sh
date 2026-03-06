#!/bin/bash

# --- 颜色定义 ---
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

PID_FILE="app.pid"
LOG_FILE="app.log"

# --- 逻辑封装 ---

function do_stop() {
    printf "${YELLOW}正在停止 STARK Todo List...${NC}\n"
    
    # 1. 首先尝试通过 PID 文件停止
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        pkill -P $PID >/dev/null 2>&1
        kill $PID >/dev/null 2>&1
        rm "$PID_FILE"
    fi

    # 2. 强力兜底：查找并杀死占用 3000 端口的所有 Node 进程
    PORT_PIDS=$(lsof -t -i:3000)
    if [ -n "$PORT_PIDS" ]; then
        for P in $PORT_PIDS; do
            kill -9 $P >/dev/null 2>&1
        done
    fi
    printf "${YELLOW}已停止所有相关进程并释放端口。${NC}\n"
}

function do_start() {
    if [ -f "$PID_FILE" ] && kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        printf "${YELLOW}应用已经在运行中 (PID: $(cat $PID_FILE))${NC}\n"
        return 0
    fi

    PORT_PID=$(lsof -t -i:3000)
    if [ -n "$PORT_PID" ]; then
        printf "${RED}错误: 端口 3000 已被占用，尝试执行 stop 后再启动${NC}\n"
        return 1
    fi

    printf "${GREEN}使用 $PM 启动 STARK Todo List...${NC}\n"
    # 抑制安装输出，保持界面整洁
    $PM install > /dev/null 2>&1
    
    nohup $PM run dev > "$LOG_FILE" 2>&1 &
    echo $! > "$PID_FILE"
    
    sleep 2
    if kill -0 $(cat "$PID_FILE") 2>/dev/null; then
        printf "${GREEN}启动成功！访问: http://localhost:3000${NC}\n"
    else
        printf "${RED}启动失败，请查看 $LOG_FILE${NC}\n"
        rm -f "$PID_FILE"
    fi
}

# --- 初始化 ---
if [ ! -f "todos.json" ]; then
    echo "[]" > todos.json
    printf "${YELLOW}已创建初始数据文件 todos.json${NC}\n"
fi

# 检查包管理器
if command -v pnpm >/dev/null 2>&1; then
    PM="pnpm"
else
    PM="npm"
fi

case "$1" in
    start)
        do_start
        ;;
    stop)
        do_stop
        ;;
    restart)
        printf "${BLUE}正在执行彻底重启...${NC}\n"
        do_stop
        sleep 1
        rm -rf .next
        do_start
        ;;
    logs)
        [ -f "$LOG_FILE" ] && tail -f "$LOG_FILE" || printf "${RED}日志文件不存在${NC}\n"
        ;;
    status)
        if lsof -i:3000 >/dev/null 2>&1; then
            printf "${GREEN}应用正在运行${NC}\n"
            lsof -i:3000
        else
            printf "${RED}应用未运行${NC}\n"
        fi
        ;;
    clean)
        printf "${BLUE}清理缓存和日志...${NC}\n"
        rm -rf .next "$LOG_FILE" "$PID_FILE"
        printf "${GREEN}清理完成${NC}\n"
        ;;
    *)
        printf "${BLUE}STARK Todo List 本地管理脚本${NC}\n"
        echo "用法: $0 [start|stop|restart|logs|status|clean]"
        exit 1
        ;;
esac
