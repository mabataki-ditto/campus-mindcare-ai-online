# Campus MindCare AI

校园 AI 心理陪伴平台，包含 Web 管理与用户端、Node.js API、UniApp 客户端，以及浏览器端自动化测试。

## 项目结构

```text
.
├─ ai-vue/                     Vue 3 Web 前端
├─ ai-psychological-server/    Express + Prisma 后端
├─ uniapp-ai-psychological/    UniApp 客户端
├─ tests/ui/                   Playwright + Pytest UI 测试
├─ webhook/                    Gitee 自动部署服务
├─ docs/                       本地项目资料（当前不纳入 Git）
├─ docker-compose.yml          生产式本地编排
└─ docker-compose.test.yml     UI 集成测试编排
```

## 环境要求

- Node.js 24
- Docker 与 Docker Compose
- Python 3.12（运行 UI 自动化测试时需要）

## Docker 启动

复制环境变量模板并填写真实配置：

```powershell
Copy-Item .env.example .env
docker compose up --build -d
```

启动后访问：

- Web：<http://localhost>
- 健康检查：<http://localhost/api/health>

停止服务：

```powershell
docker compose down
```

## 本地开发

直接启动后端前，请先在 `ai-psychological-server/.env` 中配置本地数据库和所需的 API 环境变量。

后端：

```powershell
cd ai-psychological-server
npm ci
npm run dev
```

Web 前端：

```powershell
cd ai-vue
npm ci
npm run dev
```

UniApp H5：

```powershell
cd uniapp-ai-psychological
npm ci
npm run dev:h5
```

## UI 自动化测试

```powershell
python -m venv .venv
.\.venv\Scripts\pip.exe install -r tests/ui/requirements.txt
.\.venv\Scripts\python.exe -m playwright install chromium
.\.venv\Scripts\pytest.exe -m layer1
```

Layer 2 和 Layer 3 会使用 `docker-compose.test.yml` 启动真实后端与测试数据库；详细说明见 `tests/ui/REPORT.md`。

## 常用验证命令

```powershell
cd ai-vue
npm run lint:check
npm run build

cd ..\ai-psychological-server
npm run build

cd ..\uniapp-ai-psychological
npm run type-check
npm run build:h5
```

真实密码和 API Key 只应保存在被忽略的 `.env` 中，不要写入源码或提交到仓库。
