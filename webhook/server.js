// ============================================================
// Webhook 接收服务 — Gitee push 后自动拉取代码并重建 Docker 镜像
//
// 工作流程：
//   1. 本地 git push 到 Gitee
//   2. Gitee 配置 Webhook，调用 http://服务器IP:9000/webhook
//   3. 本脚本验证 X-Gitee-Token，通过后异步执行 deploy.sh
//   4. deploy.sh 执行 git pull && docker compose up --build -d
//
// 零依赖，只用 Node 内置模块，无需 npm install
// 用 systemd 管理：见 webhook/webhook.service
// ============================================================

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");

// ==================== 配置 ====================
const PORT = parseInt(process.env.WEBHOOK_PORT || "9000", 10);
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";
const DEPLOY_SCRIPT = path.join(__dirname, "deploy.sh");

// 部署锁：防止上一次部署未完成时又触发新的部署
let isDeploying = false;
let lastDeployTime = null;
let lastDeployStatus = null;

// ==================== 工具函数 ====================
function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

// ==================== 部署逻辑 ====================
function runDeploy() {
  if (isDeploying) {
    log("⚠️  上一次部署仍在进行，跳过本次触发");
    return;
  }

  isDeploying = true;
  log("🚀 开始执行部署脚本: " + DEPLOY_SCRIPT);

  // spawn 执行 shell 脚本，继承 stdio 让输出直接进 systemd journal
  const child = spawn("bash", [DEPLOY_SCRIPT], {
    cwd: path.resolve(__dirname, ".."),
    stdio: "inherit",
  });

  child.on("close", (code) => {
    isDeploying = false;
    lastDeployTime = new Date().toISOString();
    lastDeployStatus = code === 0 ? "success" : `failed (exit ${code})`;

    if (code === 0) {
      log("✅ 部署成功完成");
    } else {
      log(`❌ 部署失败，退出码: ${code}`);
    }
  });

  child.on("error", (err) => {
    isDeploying = false;
    lastDeployStatus = `error: ${err.message}`;
    log(`❌ 启动部署脚本失败: ${err.message}`);
  });
}

// ==================== HTTP 服务 ====================
const server = http.createServer((req, res) => {
  // 健康检查：GET / 返回服务状态，方便排查
  if (req.method === "GET" && req.url === "/") {
    return sendJson(res, 200, {
      service: "mindcare-webhook",
      status: "running",
      isDeploying,
      lastDeployTime,
      lastDeployStatus,
    });
  }

  // Webhook 入口：POST /webhook
  if (req.method === "POST" && req.url === "/webhook") {
    // 验证 secret：Gitee 通过 X-Gitee-Token 头传递
    const token = req.headers["x-gitee-token"] || "";
    if (!WEBHOOK_SECRET) {
      log("❌ 服务器未配置 WEBHOOK_SECRET，拒绝请求");
      return sendJson(res, 500, { error: "WEBHOOK_SECRET not configured" });
    }
    if (token !== WEBHOOK_SECRET) {
      log("❌ X-Gitee-Token 验证失败，拒绝请求");
      return sendJson(res, 403, { error: "Invalid token" });
    }

    // 读取请求体（Gitee 会推送 push 事件详情，这里只记录 ref）
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        log(
          `📨 收到 webhook 推送: ref=${payload.ref || "unknown"}, ` +
            `before=${payload.before || "?"}, after=${payload.after || "?"}`
        );
      } catch {
        log("📨 收到 webhook 推送（body 非 JSON，已忽略）");
      }

      // 异步触发部署，立即返回 200 避免 Gitee 端超时
      runDeploy();
      sendJson(res, 200, {
        message: "Deploy triggered",
        isDeploying: true,
      });
    });
    return;
  }

  // 其他路径返回 404
  sendJson(res, 404, { error: "Not found" });
});

server.listen(PORT, () => {
  log(`✅ Webhook 服务已启动，监听端口 ${PORT}`);
  log(`   健康检查: GET  http://localhost:${PORT}/`);
  log(`   Webhook : POST http://localhost:${PORT}/webhook`);
  if (!WEBHOOK_SECRET) {
    log("⚠️  警告: 未配置 WEBHOOK_SECRET，所有 webhook 请求都会被拒绝");
  }
});

// 优雅退出
process.on("SIGTERM", () => {
  log("收到 SIGTERM，关闭服务...");
  server.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  log("收到 SIGINT，关闭服务...");
  server.close(() => process.exit(0));
});
