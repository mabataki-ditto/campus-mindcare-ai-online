/**
 * Tool Calling 循环处理
 *
 * 处理 AI 可能多次调用工具的循环逻辑：
 * AI 调用工具 → 执行工具 → 将结果返回给 AI → AI 继续生成回复
 *
 */

import { executeToolCall } from './useToolCalls'
import { streamRound } from './useStreamRound'

/**
 * 执行 Tool Calling 循环
 * @param {Object} params - 参数
 * @param {Array} params.allMessages - 消息上下文（会被修改）
 * @param {Object} params.aiMessage - Vue 响应式的 AI 消息对象
 * @param {AbortSignal} params.signal - 中断信号
 * @param {Ref} params.toolCallStatus - 工具调用状态提示
 * @returns {string} - AI 最终回复内容
 */
export async function executeToolCallLoop({ allMessages, aiMessage, signal, toolCallStatus }) {
  let continueLoop = true

  // 循环条件：AI 调用了工具后需要再发一轮请求让 AI 看到工具结果并继续回复
  while (continueLoop) {
    // 执行一轮流式请求：fetch → SSE 解析 → 实时填充 aiMessage.content
    // 返回：finalContent（完整文本）、finishReason（stop/tool_calls）、toolCallsMap（工具调用信息）
    const { finalContent, finishReason, toolCallsMap } = await streamRound({
      allMessages,
      aiMessage,
      signal
    })

    // 普通回复，结束循环
    if (finishReason !== 'tool_calls') {
      if (finalContent) {
        allMessages.push({ role: 'assistant', content: finalContent })
      }
      break
    }

    // 处理工具调用
    const toolCalls = Object.values(toolCallsMap)

    // 将 assistant 的 tool_calls 消息加入上下文（OpenAI/DeepSeek 协议要求必须）
    // content 为 null：此时 AI 只是声明"我要调用工具"，还没生成文本回复
    allMessages.push({
      role: 'assistant',
      content: null,
      tool_calls: toolCalls.map((tc) => ({
        id: tc.id,
        type: 'function',
        function: { name: tc.name, arguments: tc.arguments }
      }))
    })

    // 逐个执行工具并追加 tool 角色消息
    // 每个工具调用必须对应一条 tool 消息，通过 tool_call_id 关联
    for (const tc of toolCalls) {
      // 更新界面状态提示，让用户知道当前在执行哪个工具
      toolCallStatus.value = tc.name === 'triggerAlert' ? '正在触发预警...' : '正在检索知识库...'
      // 执行工具：triggerAlert → POST /alert 创建预警；searchKnowledgeBase → 检索知识库
      const result = await executeToolCall({
        function: { name: tc.name, arguments: tc.arguments }
      })
      if (tc.name === 'searchKnowledgeBase' && Array.isArray(result.references)) {
        aiMessage.references = result.references
      }
      // 将工具执行结果追加到上下文，AI 下一轮会看到这些结果
      allMessages.push({
        role: 'tool',
        tool_call_id: tc.id, // 必须与上方 assistant 消息中的 tc.id 一致
        content: JSON.stringify(result) // 工具返回值序列化为字符串
      })
    }
    toolCallStatus.value = ''

    // 清空 aiMessage 内容，准备接收工具调用后的最终回复
    // 上一轮流式填充的内容是 AI 调用工具前的"思考"，不是最终回复
    aiMessage.content = ''
  }

  return aiMessage.content
}
