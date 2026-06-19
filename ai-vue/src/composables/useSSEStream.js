/**
 * SSE（Server-Sent Events）流解析器
 *
 * 使用 async generator 逐行产出解析后的数据
 *
 * 关键设计：
 * - buffer 缓存不完整的行，处理 TCP 分包问题
 * - { stream: true } 处理跨 chunk 的 UTF-8 多字节字符
 */

/**
 * 解析 SSE 流
 * @param {ReadableStreamDefaultReader} reader - fetch 返回的 reader
 * @param {TextDecoder} decoder - 文本解码器
 * @yields {Object} - 解析后的 SSE 数据块
 */
export async function* parseSSEStream(reader, decoder) {
  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) return

    // 解码当前 chunk，{ stream: true } 处理跨 chunk UTF-8
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // 保留最后一个可能不完整的行

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6).trim()
        if (data === '[DONE]') return // SSE 结束标记
        try {
          yield JSON.parse(data) // 产出解析后的 JSON
        } catch {
          // 忽略解析失败的行
        }
      }
    }
  }
}
