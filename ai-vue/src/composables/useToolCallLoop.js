/**
 * Tool Calling 循环处理
 *
 * 处理 AI 可能多次调用工具的循环逻辑：
 * AI 调用工具 → 执行工具 → 将结果返回给 AI → AI 继续生成回复
 *
 * 这个模块消除了 startAIResponse 和 startAIResponseWithImage 中的重复代码
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

  while (continueLoop) {
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

    // 将 assistant 的 tool_calls 消息加入上下文（OpenAI 协议要求）
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
    for (const tc of toolCalls) {
      toolCallStatus.value = tc.name === 'triggerAlert' ? '正在触发预警...' : '正在检索知识库...'
      const result = await executeToolCall({
        function: { name: tc.name, arguments: tc.arguments }
      })
      allMessages.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: JSON.stringify(result)
      })
    }
    toolCallStatus.value = ''

    // 清空 aiMessage 内容，准备接收工具调用后的最终回复
    aiMessage.content = ''
  }

  return aiMessage.content
}
