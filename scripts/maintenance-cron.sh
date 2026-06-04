#!/bin/sh
# 维护任务定时调度（在独立 sidecar 容器内运行，不绑 web 进程生命周期）。
# 调用 maintenance.mjs：清过期 session + 物理回收 30 天前软删 todos + SQLite 备份。
# 启动先跑一次（清理积压），之后每天 03:00 各跑一次。
set -u

run() {
  echo "[maintenance-cron] run at $(date)"
  node /app/scripts/maintenance.mjs "$(date +%Y%m%d-%H%M%S)" || echo "[maintenance-cron] run failed (continuing)"
}

echo "[maintenance-cron] started"
run

while true; do
  # 算到下一个 03:00 的等待秒数（GNU date）；取不到则退化为固定 24h
  target=$(date -d 'tomorrow 03:00' +%s 2>/dev/null) || target=$(( $(date +%s) + 86400 ))
  now=$(date +%s)
  wait=$(( target - now ))
  [ "$wait" -gt 0 ] 2>/dev/null || wait=86400
  sleep "$wait"
  run
done
