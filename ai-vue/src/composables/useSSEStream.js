/**
 * SSE（Server-Sent Events）流解析器
 *
 * 基于 eventsource-parser 实现，自动处理：
 * - buffer 缓存不完整的行（TCP 分包问题）
 * - 跨 chunk 的多字节字符拼接
 * - SSE 协议字段（data/event/id/retry）解析
 *
 * 使用 async generator 逐条产出解析后的 JSON 数据
 */

import { createParser } from 'eventsource-parser'

/**
 * 解析 SSE 流
 * @param {ReadableStreamDefaultReader} reader - fetch 返回的 reader
 * @param {TextDecoder} decoder - 文本解码器
 * @yields {Object} - 解析后的 SSE 数据块
 */
export async function* parseSSEStream(reader, decoder) {
  const events = []
  let finished = false

  const parser = createParser({
    onEvent: (event) => {
      if (event.data === '[DONE]') {
        finished = true
        return
      }
      try {
        events.push(JSON.parse(event.data))
      } catch {
        // 忽略解析失败的行
      }
    }
  })

  while (!finished) {
    const { done, value } = await reader.read()
    if (done) break

    // { stream: true } 处理跨 chunk UTF-8 多字节字符
    parser.feed(decoder.decode(value, { stream: true }))

    // 排空本轮产生的事件
    while (events.length) {
      yield events.shift()
    }
  }
}
