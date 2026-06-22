# 校园 MindCare AI Docker + Nginx 部署流程

## 目标

把当前两个项目部署到 Ubuntu 云服务器，练习 Docker Compose + Nginx 的完整上线流程。

本次部署的项目是：

```text
ai-vue                      Vue 前端项目
ai-psychological-server     Express 后端项目
```

访问链路是：

```text
浏览器 -> 服务器 8080 端口 -> Nginx -> Vue 静态页面
浏览器 -> 服务器 8080/api -> Nginx -> backend:3000 -> MySQL:3306
```

当前服务器信息：

```text
公网 IP：106.53.3.215
SSH 用户名：ubuntu
练习访问端口：8080
```

## 文件说明

部署相关文件已经放在项目里：

```text
docker-compose.yml                         编排 Nginx、后端、MySQL
nginx.conf                                 Nginx 静态站点和反向代理配置
.env.example                               环境变量模板
.dockerignore                              根目录 Docker 忽略规则
ai-vue/Dockerfile                          前端构建镜像
ai-vue/.dockerignore                       前端 Docker 忽略规则
ai-psychological-server/Dockerfile         后端构建镜像
ai-psychological-server/.dockerignore      后端 Docker 忽略规则
docs/deploy-flow.md                        当前部署流程文档
```

注意：真实密码和 API Key 不要长期放在 `.env.example`。推荐把 `.env.example` 当模板，把真实值放到 `.env`。

## 本地 Win11 准备

先确认本机能使用这些命令：

```powershell
ssh -V
scp
docker --version
docker compose version
```

进入项目根目录：

```powershell
cd E:\campus-mindcare-AI
```

复制环境变量文件：

```powershell
Copy-Item .env.example .env
```

编辑 `.env`：

```powershell
notepad .env
```

至少确认这些值存在：

```env
MYSQL_ROOT_PASSWORD=你的MySQL密码
MYSQL_DATABASE=ai_psychological
JWT_SECRET=你的JWT密钥
DEEPSEEK_API_KEY=你的DeepSeekKey
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

`MYSQL_DATABASE=ai_psychological` 是因为后端代码默认使用这个数据库名。可以改，但要保持 Docker Compose 和后端连接的数据库名一致。

本地检查 Compose 配置：

```powershell
docker compose --env-file .env config --quiet
```

本地启动测试：

```powershell
docker compose up --build -d
```

查看容器：

```powershell
docker compose ps
```

访问：

```text
http://localhost:8080
http://localhost:8080/api/health
```

停止：

```powershell
docker compose down
```

如果想清空数据库数据：

```powershell
docker compose down -v
```

## 服务器准备

在 Win11 PowerShell 登录服务器：

```powershell
ssh ubuntu@106.53.3.215
```

第一次连接如果提示：

```text
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

输入：

```text
yes
```

登录后确认系统：

```bash
whoami
uname -a
pwd
```

Ubuntu 服务器安装 Docker Engine：

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

添加 Docker 官方软件源：

```bash
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

安装 Docker 和 Compose 插件：

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

验证：

```bash
docker --version
docker compose version
sudo systemctl status docker
```

如果普通 `ubuntu` 用户执行 Docker 提示权限不足，可以先用 `sudo docker ...`。想免 sudo 可以执行：

```bash
sudo usermod -aG docker ubuntu
exit
```

然后重新 SSH 登录。

测试 Docker：

```bash
sudo docker run hello-world
```

如果拉镜像超时，可以配置腾讯云镜像加速：

```bash
sudo mkdir -p /etc/docker
sudo tee /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com"
  ]
}
EOF
sudo systemctl daemon-reload
sudo systemctl restart docker
sudo docker info | grep -A 5 "Registry Mirrors"
```

## 上传项目到服务器

项目已经推到 Gitee 仓库，服务器直接从 Gitee 拉取，不需要 scp。

SSH 登录服务器：

```powershell
ssh ubuntu@106.53.3.215
```

clone 项目：

```bash
cd /home/ubuntu
git clone https://gitee.com/mabataki7777777/campus-mindcare-ai-online.git campus-mindcare-AI
cd campus-mindcare-AI
```

注意：`.env` 被 `.gitignore` 忽略，不会随 git 上传，需要在服务器上手动创建。配置方法见下一节。

### 后续更新代码

本地改完代码后，先推到 Gitee：

```powershell
# 本机 PowerShell
cd E:\campus-mindcare-AI
git add .
git commit -m "更新说明"
git push
```

**两种更新方式：**

#### 方式 A：自动部署（推荐，已配置 Webhook）

push 到 Gitee 后，Gitee 会自动调用服务器上的 webhook 服务，服务器自动执行 `git pull && docker compose up --build -d`，无需 SSH 登录。

配置方法见下方 [Webhook 自动部署](#webhook-自动部署) 章节。

查看部署日志：

```bash
# 服务器上查看 webhook 服务日志
sudo journalctl -u webhook -f
```

#### 方式 B：手动部署（Webhook 故障时备用）

SSH 登录服务器后手动执行：

```bash
# 服务器
cd /home/ubuntu/campus-mindcare-AI
git pull
docker compose up --build -d
```

## Webhook 自动部署

### 原理

```
本地 git push → Gitee 仓库
                    ↓
              Gitee 调用 Webhook
                    ↓
   POST http://106.53.3.215:9000/webhook (带 X-Gitee-Token)
                    ↓
      webhook/server.js 验证 token
                    ↓
      执行 webhook/deploy.sh
                    ↓
   git pull && docker compose up --build -d
```

### 服务器一次性配置

#### 1. 确认 `.env` 里有 webhook 配置

```bash
# 服务器
cd /home/ubuntu/campus-mindcare-AI
grep WEBHOOK .env
```

如果没有，手动追加（`WEBHOOK_SECRET` 用 `openssl rand -hex 16` 生成）：

```env
WEBHOOK_SECRET=生成的随机字符串
WEBHOOK_PORT=9000
```

#### 2. 给 deploy.sh 执行权限

```bash
chmod +x webhook/deploy.sh
```

#### 3. 安装 systemd 服务

```bash
sudo cp webhook/webhook.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable webhook
sudo systemctl start webhook
```

#### 4. 验证服务运行

```bash
# 查看服务状态
sudo systemctl status webhook

# 健康检查（返回 JSON 即正常）
curl http://localhost:9000/

# 查看实时日志
sudo journalctl -u webhook -f
```

#### 5. 腾讯云安全组放行 9000 端口

在腾讯云控制台 → 安全组 → 入站规则，添加：

- 协议：TCP
- 端口：9000
- 来源：`0.0.0.0/0`（或限制为 Gitee 的 IP 段更安全）

#### 6. 配置 Gitee Webhook

进入 Gitee 仓库 → 管理 → WebHooks → 添加：

- URL：`http://106.53.3.215:9000/webhook`
- 密码：填 `.env` 里的 `WEBHOOK_SECRET` 值
- 触发事件：勾选 `Push`
- 测试：点"测试"按钮，服务器日志应出现 `📨 收到 webhook 推送`

### 验证自动部署

1. 本地改一行代码（比如改个注释）
2. `git commit && git push`
3. 服务器上 `sudo journalctl -u webhook -f` 应看到部署日志
4. 浏览器访问 `http://106.53.3.215`，强制刷新（Ctrl+F5）看到更新

### Webhook 排查

| 现象 | 排查 |
|------|------|
| Gitee 测试返回 403 | `WEBHOOK_SECRET` 不一致，对比 Gitee 和 `.env` |
| Gitee 测试返回连接超时 | 安全组没放行 9000，或服务没启动 |
| webhook 收到但没部署 | `sudo journalctl -u webhook -f` 看日志 |
| 部署失败 | `docker compose logs -f` 看容器日志，常见是 `.env` 缺值或 Dockerfile 报错 |

## 配置服务器环境变量

如果服务器上还没有 `.env`，复制模板：

```bash
cp .env.example .env
```

编辑：

```bash
nano .env
```

至少确认：

```env
MYSQL_ROOT_PASSWORD=你的MySQL密码
MYSQL_DATABASE=ai_psychological
JWT_SECRET=你的JWT密钥
DEEPSEEK_API_KEY=你的DeepSeekKey
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

保存 `nano`：

```text
Ctrl + O
Enter
Ctrl + X
```

安全提醒：

- `.env` 放真实值。
- `.env.example` 最好只放示例值。
- 不要把真实 API Key 发到公开仓库。

## 启动服务

在服务器项目根目录执行：

```bash
docker compose config --quiet
docker compose up --build -d
```

第一次启动会做这些事：

- 构建前端 `ai-vue`，生成静态文件
- 构建后端 `ai-psychological-server`
- 启动 MySQL 容器
- 等 MySQL 健康后，后端执行 `npx prisma migrate deploy`
- 启动后端
- 启动 Nginx，对外暴露 `8080`

查看容器状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

只看后端日志：

```bash
docker compose logs -f backend
```

只看 Nginx 日志：

```bash
docker compose logs -f nginx
```

## 外网访问验证

浏览器访问：

```text
http://106.53.3.215:8080
```

健康检查：

```text
http://106.53.3.215:8080/api/health
```

也可以在服务器里用命令检查：

```bash
curl http://localhost:8080/api/health
```

如果返回 JSON，说明 Nginx -> 后端 链路是通的。

如果前端页面能打开，但接口失败，优先看：

```bash
docker compose logs -f backend
docker compose logs -f nginx
```

## 初始化测试账号

当前 Compose 默认只执行 Prisma migration，不自动执行 seed，避免每次启动都重复改数据。

如果需要初始化测试账号，在服务器执行：

```bash
docker compose exec backend npm run db:seed
```

然后根据后端种子脚本里的账号登录测试。

## 常用命令

启动或重建：

```bash
docker compose up --build -d
```

停止：

```bash
docker compose down
```

停止并清空数据库 volume：

```bash
docker compose down -v
```

查看状态：

```bash
docker compose ps
```

查看日志：

```bash
docker compose logs -f
```

进入后端容器：

```bash
docker compose exec backend sh
```

进入 MySQL 容器：

```bash
docker compose exec mysql mysql -uroot -p
```

手动执行数据库迁移：

```bash
docker compose exec backend npx prisma migrate deploy
```

## 改成 80 端口

练习阶段使用：

```yaml
ports:
  - "8080:80"
```

如果你想直接访问：

```text
http://106.53.3.215
```

把 `docker-compose.yml` 里的端口改成：

```yaml
ports:
  - "80:80"
```

然后重启：

```bash
docker compose up --build -d
```

同时确认腾讯云安全组和服务器防火墙放行 `80`。

## 常见问题

### SSH 连接失败

先检查：

- 公网 IP 是否是 `106.53.3.215`
- 用户名是否是 `ubuntu`
- 云服务器是否运行中
- 安全组是否放行 `22`
- 密码是否是服务器登录密码，不是云平台账号密码

### git clone 或 git pull 失败

先检查：

- 服务器是否能访问 gitee.com
- Gitee 仓库是否是公开仓库，或者需要配置 SSH key
- 本地是否已经 `git push` 到 Gitee

如果是私有仓库，在服务器上配置 Gitee 的 SSH key：

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
```

把输出的公钥添加到 Gitee 账号的 SSH 设置里。

### docker compose 提示环境变量缺失

说明根目录没有 `.env`，或者 `.env` 缺少必填项。

修复：

```bash
cp .env.example .env
nano .env
```

### 后端连不上数据库

先看后端日志：

```bash
docker compose logs -f backend
```

重点检查：

- `mysql` 容器是否健康
- `.env` 里的 `MYSQL_ROOT_PASSWORD` 是否正确
- `MYSQL_DATABASE` 是否是 `ai_psychological`
- 不要在 Docker 内使用 `localhost` 连接 MySQL，容器内要用服务名 `mysql`

### 前端能打开，但接口 502

通常是后端没有启动成功。

检查：

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f nginx
```

### Docker 拉镜像很慢或超时

配置镜像加速后重试：

```bash
sudo systemctl restart docker
docker compose up --build -d
```

## 最小上线检查清单

- `docker compose ps` 里 `mysql`、`backend`、`nginx` 都在运行
- `http://106.53.3.215:8080` 能打开前端页面
- `http://106.53.3.215:8080/api/health` 能返回 JSON
- 后端能执行 Prisma migration
- MySQL 端口没有直接暴露到公网
- `.env` 里有真实配置
- `.env.example` 不保留真实密钥
- 能用 `docker compose logs -f` 定位错误

