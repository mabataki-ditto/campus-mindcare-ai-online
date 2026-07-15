/**
 * 单轮流式请求
 *
 * 调用 DeepSeek Chat Completions API，解析 SSE 流式响应
 * 返回本轮的文本内容、结束原因和工具调用信息
 */

import { alertToolDefinitions } from './useToolCalls'
import { parseSSEStream } from './useSSEStream'
import { localCache } from '@/utils/cache'
import { LOGIN_TOKEN } from '@/global/constants'

/**
 * 执行一轮流式请求
 * @param {Object} params - 参数
 * @param {Array} params.allMessages - 消息上下文
 * @param {Object} params.aiMessage - Vue 响应式的 AI 消息对象（用于实时更新 UI）
 * @param {AbortSignal} params.signal - 中断信号
 * @returns {Object} - { finalContent, finishReason, toolCallsMap }
 */
export async function streamRound({ allMessages, aiMessage, signal }) {
  // 通过后端 SSE 接口中转，API Key 不暴露给前端
  const response = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      token: localCache.getCache(LOGIN_TOKEN) || ''
    },
    body: JSON.stringify({
      messages: allMessages,
      tools: alertToolDefinitions,
      toolChoice: 'auto',
      stream: true
    }),
    signal
  })

  if (!response.ok) {
    throw new Error(`API 请求失败: ${response.status}`)
  }

  // 后端可能返回 JSON 错误（如 token 过期、Key 未配置），而非 SSE 流
  const contentType = response.headers.get('Content-Type') || ''
  if (contentType.includes('application/json')) {
    const data = await response.json()
    throw new Error(data.msg || '请求失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  // 工具调用增量拼接：index -> { id, name, arguments }
  let toolCallsMap = {}
  let finalContent = ''
  let finishReason = null

  // 遍历 SSE 流
  for await (const chunk of parseSSEStream(reader, decoder)) {
    const choice = chunk.choices?.[0]
    if (!choice) continue

    const delta = choice.delta
    finishReason = choice.finish_reason

    // 普通文本内容 — 正常流式输出
    if (delta?.content) {
      finalContent += delta.content
      aiMessage.content += delta.content
    }

    // 工具调用 — 增量拼接
    // SSE 流中 tool_calls 是分段传来的：第一个 chunk 带 id 和 name，后续 chunk 只带 arguments 片段
    // 用 index 作为 key 把同一个工具调用的片段拼到一起
    // 例：chunk1 → { index:0, id:"call_abc", function:{name:"triggerAlert"} }
    //     chunk2 → { index:0, function:{arguments:'{"ri'} }
    //     chunk3 → { index:0, function:{arguments:'skLevel":3}'} }
    //     拼接结果 → { id:"call_abc", name:"triggerAlert", arguments:'{"riskLevel":3}' }
    if (delta?.tool_calls) {
      for (const tc of delta.tool_calls) {
        const idx = tc.index
        if (!toolCallsMap[idx]) {
          toolCallsMap[idx] = { id: '', name: '', arguments: '' }
        }
        if (tc.id) toolCallsMap[idx].id = tc.id
        if (tc.function?.name) toolCallsMap[idx].name = tc.function.name
        // arguments 用 += 追加，因为跨 chunk 分片传输
        if (tc.function?.arguments) toolCallsMap[idx].arguments += tc.function.arguments
      }
    }
  }

  if (finishReason === null) {
    throw new Error('流式响应意外中断，请重试')
  }

  return { finalContent, finishReason, toolCallsMap }
}
