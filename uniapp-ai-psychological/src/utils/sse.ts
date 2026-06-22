import { createParser } from "eventsource-parser";
import { BASE_URL } from "@/config";
import { LOGIN_TOKEN } from "@/global/constants";
import http from "./request";

function decodeChunk(buffer: ArrayBuffer, decoder: TextDecoder): string {
  try {
    return decoder.decode(new Uint8Array(buffer), { stream: true });
  } catch {
    return "";
  }
}

export function requestSSE(options: any) {
  const { url, data, onMessage, onDone, onError } = options;
  const token = uni.getStorageSync(LOGIN_TOKEN);
  const tokenStr =
    typeof token === "string" ? token.replace(/^"|"$/g, "") : token || "";
  let doneCalled = false;
  const safeOnDone = () => {
    if (!doneCalled) {
      doneCalled = true;
      onDone && onDone();
    }
  };

  const requestTask = uni.request({
    url,
    method: "POST",
    header: { "Content-Type": "application/json", token: tokenStr },
    data,
    enableChunked: true,
    success: (res: any) => {
      // 如果不支持 onChunkedData，使用普通响应处理
      if (!(requestTask as any).onChunkedData) {
        try {
          const responseData = res.data;
          // 处理非流式响应
          if (responseData.choices && responseData.choices[0]) {
            const content = responseData.choices[0].message?.content || "";
            if (content) onMessage && onMessage(content);
          }
          safeOnDone();
        } catch (err) {
          onError && onError(err);
        }
      }
    },
    fail: (err: any) => onError && onError(err),
  });

  // 检查是否支持 onChunkedData（仅 H5 和部分小程序支持）
  if ((requestTask as any).onChunkedData) {
    const decoder = new TextDecoder();
    const parser = createParser({
      onEvent: (event) => {
        if (event.data === "[DONE]") {
          safeOnDone();
          return;
        }
        try {
          const parsed = JSON.parse(event.data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) onMessage && onMessage(delta.content);
          if (delta?.tool_calls)
            onMessage &&
              onMessage({ type: "tool_calls", data: delta.tool_calls });
          const finishReason = parsed.choices?.[0]?.finish_reason;
          if (finishReason)
            onMessage &&
              onMessage({ type: "finish_reason", data: finishReason });
        } catch {
          /* skip */
        }
      },
    });

    (requestTask as any).onChunkedData((res: any) => {
      parser.feed(decodeChunk(res.data, decoder));
    });
  }

  return requestTask;
}

export async function requestSSEH5(options: any) {
  const { url, data, onMessage, onDone, onError } = options;
  const token = uni.getStorageSync(LOGIN_TOKEN);
  const tokenStr =
    typeof token === "string" ? token.replace(/^"|"$/g, "") : token || "";
  let doneCalled = false;
  const safeOnDone = () => {
    if (!doneCalled) {
      doneCalled = true;
      onDone && onDone();
    }
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: tokenStr },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API 请求失败: ${response.status}`);
    const reader = response.body?.getReader();
    if (!reader) throw new Error("无法读取流式响应");

    const decoder = new TextDecoder();
    const parser = createParser({
      onEvent: (event) => {
        if (event.data === "[DONE]") {
          safeOnDone();
          return;
        }
        try {
          const parsed = JSON.parse(event.data);
          const delta = parsed.choices?.[0]?.delta;
          if (delta?.content) onMessage && onMessage(delta.content);
          if (delta?.tool_calls)
            onMessage &&
              onMessage({ type: "tool_calls", data: delta.tool_calls });
          const fr = parsed.choices?.[0]?.finish_reason;
          if (fr) onMessage && onMessage({ type: "finish_reason", data: fr });
        } catch {
          /* skip */
        }
      },
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.feed(decoder.decode(value, { stream: true }));
    }
    safeOnDone();
  } catch (err: any) {
    onError && onError(err);
  }
}

export async function requestNonStream(url: string, data: any) {
  const path = url.replace(BASE_URL, "");
  return await http.post(path, { ...data, stream: false });
}
