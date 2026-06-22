#!/bin/bash
# ============================================================
# 部署脚本 — 由 webhook/server.js 调用
# 作用：拉取最新代码 + 重建 Docker 镜像 + 重启容器
#
# 退出码：
#   0 = 成功
#   非 0 = 失败（webhook 会记录失败状态）
# ============================================================

# 任一命令失败立即退出，避免错误累积
set -e

# 项目根目录（webhook/ 的上一级）
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

echo "========== 部署开始 =========="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 工作目录: $PROJECT_DIR"

# 1. 拉取最新代码
echo "---------- [1/3] git pull ----------"
git pull
echo "当前 commit: $(git rev-parse --short HEAD)"

# 2. 重建并重启容器
# --build: 重新构建镜像（前端 dist、后端 dist 都会重新生成）
# -d: 后台运行
# docker compose 会自动处理 MySQL → backend → nginx 的启动顺序
echo "---------- [2/3] docker compose up --build -d ----------"
docker compose up --build -d

# 3. 检查容器状态
echo "---------- [3/3] 容器状态检查 ----------"
docker compose ps

echo "========== 部署完成 =========="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 全部步骤执行完毕"
