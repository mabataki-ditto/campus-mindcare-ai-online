import { Router, Request, Response } from "express";
import { success, fail } from "../utils/response";
import { authMiddleware } from "../middleware/auth";
import { config } from "../config";

const router = Router();

interface AiChatRequest {
  messages: Array<{
    role: string;
    content:
      | string
      | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }>;
  tools?: Array<{
    type: string;
    function: { name: string; description: string; parameters: any };
  }>;
  toolChoice?: string;
  stream?: boolean;
}

router.post("/chat", authMiddleware, async (req: Request, res: Response) => {
  try {
    const { messages, tools, toolChoice, stream }: AiChatRequest = req.body;

    // 校验 API Key 是否已配置
    if (!config.deepseek.apiKey) {
      return res.json(fail("DeepSeek API Key 未配置"));
    }

    // 组装转发给 DeepSeek 的请求体（自动注入 model 和 stream）
    const requestBody: Omit<AiChatRequest, "messages"> & {
      messages: AiChatRequest["messages"];
      model: string;
      stream: boolean;
    } = {
      model: config.deepseek.model,
      messages,
      stream: stream !== false, // 默认流式
    };

    // 有工具定义时附加 tools 和 tool_choice
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      (requestBody as Record<string, any>).tool_choice = toolChoice || "auto";
    }

    // 流式响应分支（SSE 透传）
    if (requestBody.stream) {
      const response = await fetch(
        `${config.deepseek.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.deepseek.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        return res.json(fail(`DeepSeek API 请求失败: ${response.status}`));
      }

      // 设置 SSE 响应头
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      // 获取流式 reader，用于逐块读取 DeepSeek 返回
      const reader = response.body?.getReader();
      if (!reader) {
        return res.json(fail("流式响应读取失败"));
      }

      const decoder = new TextDecoder();

      // pump：循环读取 DeepSeek 的流，原样写入客户端响应
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            // { stream: true } 保证跨 chunk 的多字节字符正确拼接
            res.write(decoder.decode(value, { stream: true }));
          }
          res.end();
        } catch (err: any) {
          console.error("流式传输错误:", err.message);
          res.end();
        }
      };

      await pump();
    } else {
      // 非流式响应分支（一次性返回完整结果，小程序端降级使用）
      const response = await fetch(
        `${config.deepseek.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.deepseek.apiKey}`,
          },
          body: JSON.stringify(requestBody),
        },
      );

      const data = await response.json();
      return res.json(success(data, "请求成功"));
    }
  } catch (err: any) {
    return res.json(fail(err.message));
  }
});

export { router as aiRouter };
