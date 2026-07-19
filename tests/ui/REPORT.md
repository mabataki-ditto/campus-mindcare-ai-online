# Web UI 三层自动化测试

## 测试架构

| 层级 | 被测链路 | 运行时机 |
| --- | --- | --- |
| Layer 1 | Vue → 整体 Mock Server | 本地开发、每次 push、Pull Request |
| Layer 2 | Vue → 真实 Express → Mock DeepSeek → 独立测试 MySQL | 后端或持久化链路改动、主分支 push |
| Layer 3 | Vue → 真实 Express → 真实 DeepSeek → 独立测试 MySQL | 发布前或 GitHub Actions 手动触发 |

三层由 pytest 标记显式选择，不会根据环境自动猜测。Layer 1 的 `mock-server.cjs` 模拟整个后端；Layer 2、3 使用 `docker-compose.test.yml` 启动真实后端和数据库。

## 安装

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r tests\ui\requirements.txt
.venv\Scripts\python.exe -m playwright install chromium
```

Linux 或 GitHub Actions 将 Python 路径替换为 `python`。

前端依赖也必须安装：

```powershell
Set-Location ai-vue
npm install
Set-Location ..
```

## 执行

```powershell
.venv\Scripts\python.exe -m pytest -m layer1 --alluredir=allure-results --clean-alluredir
.venv\Scripts\python.exe -m pytest -m layer2 --alluredir=allure-results --clean-alluredir
$env:RUN_REAL_LLM='1'
.venv\Scripts\python.exe -m pytest -m layer3 --alluredir=allure-results --clean-alluredir
```

Layer 3 从进程环境、根目录 `.env` 或后端 `.env` 读取 `DEEPSEEK_API_KEY`。未设置 `RUN_REAL_LLM=1` 或没有有效密钥时会跳过，不会调用真实模型。为保证本地验收最多产生一次真实模型请求，`deepseek-guard.cjs` 只向上游转发第一条流式聊天；回复完成后的非流式情绪分析由代理返回固定中性结果，第二条流式聊天会被阻断并使测试失败。该用例只验证真实聊天 SSE 和消息持久化。

生成 HTML 报告：

```powershell
npx.cmd --yes allure-commandline@2.43.0 generate allure-results -o allure-report --clean
```

## 用例范围与本地迁移结果

迁移日期：2026-07-19。

- TypeScript 迁移前基线：8/8 通过。
- Layer 1：8/8 通过，覆盖增量渲染、UTF-8 跨块解析、重复发送、正常保存、主动中断、上下文隔离、异常断流和 JSON 业务错误。
- Layer 2：4/4 通过，覆盖正常回复落库、主动中断不保存部分回复、异常断流不保存以及上游业务错误不保存。
- Layer 3：真实 DeepSeek 冒烟链路完成过 1 次通过验证；加入单次出口保护后的最终请求计数和 UI/数据库严格一致性断言，使用容器内 Mock DeepSeek 完成 1/1 自检。按约定没有再次调用真实 API。

以上数字是本次本地迁移验证结果，不代表持续不变的质量指标；后续结果以 pytest 和 Allure 报告为准。

## 数据安全

- 测试数据库固定为 `campus_mindcare_test`，清理代码会拒绝不以 `_test` 结尾的数据库名。
- 每条 Layer 2、3 用例前仅清理会话、消息、情绪和预警业务数据，保留测试账号与角色种子数据。
- 套件启动前和结束后均执行 `docker compose down -v`，销毁测试数据库卷。
- Allure、截图、Trace 和进程日志位于忽略目录；GitHub Actions Artifact 同时保存原始结果和 HTML 报告，保留 7 天。

## 已知限制

仓库当前不跟踪前后端 `package-lock.json`，因此 GitHub Actions 和测试镜像只能使用 `npm install`，Node 依赖会按 `package.json` 中的版本范围解析；Python 测试依赖已经固定版本。若后续要求 Node 环境也完全可重复，应单独评估并提交两端 lockfile。
