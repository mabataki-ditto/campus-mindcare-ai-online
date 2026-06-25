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
  // 事件队列：作为 parser 回调与 generator yield 之间的桥梁
  // parser.onEvent 解析出一条事件就 push 进来，主循环再 shift 出去 yield 给调用方
  const events = []
  // 流是否结束：收到 [DONE] 标记后置为 true，主循环据此退出
  let finished = false

  // 创建 SSE 协议解析器
  // eventsource-parser 内部维护 buffer，自动处理 TCP 分包导致的半行问题
  const parser = createParser({
    // 每解析出一条完整 SSE 事件（以空行分隔的块）触发一次
    onEvent: (event) => {
      // [DONE] 是 OpenAI/DeepSeek 约定的流结束标记
      if (event.data === '[DONE]') {
        finished = true
        return
      }
      try {
        // SSE 的 data 字段是字符串，这里解析为 JSON 对象
        // 解析失败（如心跳行、非 JSON 数据）静默忽略，不影响后续事件
        events.push(JSON.parse(event.data))
      } catch {
        // 忽略解析失败的行
      }
    }
  })

  // 主循环：持续读取网络流直到结束
  while (!finished) {
    // reader.read() 返回 { done, value }
    // done=true 表示流已关闭（服务端关闭连接）
    // value 是 Uint8Array，本次 chunk 的原始字节
    const { done, value } = await reader.read()
    if (done) break

    // { stream: true } 关键参数：告诉 decoder 本次解码是流的一部分
    // 处理跨 chunk 的 UTF-8 多字节字符（如中文占 3 字节，可能被截断）
    // decoder 会缓存不完整的字节，等下次 chunk 拼接后再输出
    parser.feed(decoder.decode(value, { stream: true }))

    // 排空本轮 chunk 解析出的所有事件，逐条 yield 给调用方
    // 调用方在 for await 中同步消费，消费完再读下一个 chunk
    while (events.length) {
      yield events.shift()
    }
  }
}
