import { ref } from "vue";
import { startSession, saveMessage } from "@/api/consultation";
import { toolDefinitions, executeToolCall } from "./useToolCalls";
import { getAIChatUrl } from "@/api/ai";
import { requestSSE, requestSSEH5, requestNonStream } from "@/utils/sse";
import { BASE_URL } from "@/config";

const SYSTEM_PROMPT = `你是"曼波"，一位温柔专业的AI心理健康助手。你的职责是：
1. 以温暖、耐心的态度陪伴用户
2. 倾听用户的倾诉，给予情感支持
3. 提供科学的心理健康建议（不替代诊疗）
4. 如果发现用户有自伤/自杀倾向，立即建议寻求专业帮助
5. 回复要简洁、自然、富有同理心
6. 当用户表达自伤、自杀或极度负面情绪时，调用 triggerAlert 工具触发预警
7. 当用户询问心理健康相关知识时，调用 searchKnowledgeBase 工具检索知识库`;

let _msgCounter = 0

const createUserMessage = (content: string) => ({
  id: `user_${Date.now()}_${++_msgCounter}`,
  senderType: 1,
  content,
  createdAt: new Date().toISOString(),
});
const createAiMessage = () => ({
  id: `ai_${Date.now()}_${++_msgCounter}`,
  senderType: 2,
  content: "",
  createdAt: new Date().toISOString(),
});

interface ConsultationStreamOptions {
  currentSession: any
  messages: any
  getSessionPage: () => Promise<void>
  loadSessionEmotion: (sessionId?: string | number | undefined, forceRefresh?: boolean) => Promise<void>
}

export function useConsultationStream({
  currentSession,
  messages,
  getSessionPage,
  loadSessionEmotion,
}: ConsultationStreamOptions) {
  const userMessage = ref("");
  const isAiTyping = ref(false);
  const toolCallStatus = ref("");

  const buildMessages = () => {
    const history = messages.value
      .filter((msg: any) => msg.content && !msg.isError)
      .map((msg: any) => ({
        role: msg.senderType === 1 ? "user" : "assistant",
        content: msg.content,
      }));
    return [{ role: "system", content: SYSTEM_PROMPT }, ...history];
  };

  const handleError = () => {
    const aiMessage = messages.value[messages.value.length - 1];
    if (aiMessage) {
      aiMessage.content = "AI回复失败，请重试";
      aiMessage.isError = true;
    }
    isAiTyping.value = false;
    toolCallStatus.value = "";
    uni.showToast({ title: "AI回复失败，请重试", icon: "none" });
  };

  const streamRound = async (allMessages: any[], aiMessage: any) => {
    const url = getAIChatUrl();
    const requestData = {
      messages: allMessages,
      tools: toolDefinitions,
      toolChoice: "auto",
      stream: true,
    };
    let toolCallsMap: Record<number, any> = {};
    let finalContent = "";
    let finishReason: string | null = null;

    // #ifdef H5
    await requestSSEH5({
      url,
      data: requestData,
      onMessage: (chunk: any) => {
        if (typeof chunk === "string") {
          finalContent += chunk;
          aiMessage.content += chunk;
        } else if (chunk.type === "tool_calls")
          for (const tc of chunk.data) {
            const idx = tc.index;
            if (!toolCallsMap[idx])
              toolCallsMap[idx] = { id: "", name: "", arguments: "" };
            if (tc.id) toolCallsMap[idx].id = tc.id;
            if (tc.function?.name) toolCallsMap[idx].name = tc.function.name;
            if (tc.function?.arguments)
              toolCallsMap[idx].arguments += tc.function.arguments;
          }
        else if (chunk.type === "finish_reason") finishReason = chunk.data;
      },
      onDone: () => {},
      onError: (err: any) => {
        throw err;
      },
    });
    // #endif

    // #ifndef H5
    // 小程序端使用非流式请求（SSE 不支持）
    const nonStreamData = { ...requestData, stream: false };
    try {
      const response: any = await requestNonStream(url, nonStreamData);
      if (response?.choices && response.choices[0]) {
        const choice = response.choices[0];
        finalContent = choice.message?.content || "";
        aiMessage.content = finalContent;
        finishReason = choice.finish_reason || null;
        if (choice.message?.tool_calls) {
          for (const tc of choice.message.tool_calls) {
            toolCallsMap[0] = {
              id: tc.id,
              name: tc.function.name,
              arguments: tc.function.arguments,
            };
          }
        }
      }
    } catch (err: any) {
      throw err;
    }
    // #endif

    return { finalContent, finishReason, toolCallsMap };
  };

  const startAIResponse = async (sessionId: string, userText: string) => {
    if (isAiTyping.value) {
      uni.showToast({ title: "AI助手正在输入中，请稍后", icon: "none" });
      return;
    }
    isAiTyping.value = true;
    toolCallStatus.value = "";
    messages.value.push(createAiMessage());
    const aiMessage = messages.value[messages.value.length - 1];

    try {
      const allMessages = buildMessages();
      let continueLoop = true;
      while (continueLoop) {
        const { finalContent, finishReason, toolCallsMap } =
          await streamRound(allMessages, aiMessage);
        if (finishReason !== "tool_calls") {
          if (finalContent)
            allMessages.push({ role: "assistant", content: finalContent });
          continueLoop = false;
          break;
        }
        if (finishReason === "tool_calls") {
          const toolCalls = Object.values(toolCallsMap);
          allMessages.push({
            role: "assistant",
            content: null,
            tool_calls: toolCalls.map((tc: any) => ({
              id: tc.id,
              type: "function",
              function: { name: tc.name, arguments: tc.arguments },
            })),
          });
          for (const tc of toolCalls) {
            toolCallStatus.value =
              tc.name === "triggerAlert"
                ? "正在触发预警..."
                : "正在检索知识库...";
            const result = await executeToolCall({
              function: { name: tc.name, arguments: tc.arguments },
            });
            allMessages.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify(result),
            });
          }
          toolCallStatus.value = "";
          aiMessage.content = "";
        }
      }
      isAiTyping.value = false;
      if (aiMessage.content && sessionId) {
        try {
          await saveMessage(sessionId, {
            senderType: 2,
            content: aiMessage.content,
          });
        } catch (e) {
          console.error("AI消息保存失败:", e);
        }
      }
      loadSessionEmotion?.(currentSession.value?.sessionId, true);
    } catch (err: any) {
      console.error("DeepSeek API 请求错误:", err);
      // 降级：移除可能已推入的空 AI 消息，使用非流式请求重试
      if (aiMessage.content === "") {
        const idx = messages.value.indexOf(aiMessage);
        if (idx > -1) messages.value.splice(idx, 1);
      }
      try {
        const url = getAIChatUrl();
        const allMessages = buildMessages();
        const res: any = await requestNonStream(url, {
          messages: allMessages,
          tools: toolDefinitions,
          toolChoice: "auto",
          stream: false,
        });
        const content =
          res.choices?.[0]?.message?.content || "AI 服务暂时不可用";
        messages.value.push({
          ...createAiMessage(),
          content,
        });
        if (sessionId) {
          await saveMessage(sessionId, { senderType: 2, content }).catch(
            () => {},
          );
        }
      } catch (fallbackErr) {
        handleError();
        return;
      }
      isAiTyping.value = false;
    }
  };

  const startNewSession = async (message: string) => {
    const sessionParams = {
      initialMessage: message,
      sessionTitle:
        currentSession.value?.sessionTitle === "新对话"
          ? `曼波AI助手 - ${new Date().toLocaleString()}`
          : currentSession.value?.sessionTitle,
    };
    const res: any = await startSession(sessionParams);
    Object.assign(currentSession.value, {
      sessionId: res.sessionId,
      status: res.status,
      sessionTitle: sessionParams.sessionTitle,
    });
    await getSessionPage();
    messages.value.push(createUserMessage(message));
    startAIResponse(currentSession.value.sessionId, message);
  };

  const sendMessage = async () => {
    const message = userMessage.value.trim();
    if (!message) return;
    if (isAiTyping.value) {
      uni.showToast({ title: "AI助手正在输入中，请稍后", icon: "none" });
      return;
    }
    userMessage.value = "";
    if (currentSession.value?.status === "TEMP") {
      await startNewSession(message);
      return;
    }
    messages.value.push(createUserMessage(message));
    if (currentSession.value?.sessionId)
      saveMessage(currentSession.value.sessionId, {
        senderType: 1,
        content: message,
      }).catch(() => {});
    startAIResponse(currentSession.value?.sessionId, message);
  };

  return { userMessage, isAiTyping, toolCallStatus, sendMessage };
}
