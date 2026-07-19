const http = require('node:http')

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const state = { slowResponsesFinished: 0 }

const readJson = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

const sendJson = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const sendSse = (res, payload) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3100')
  if (url.pathname === '/__test/state' && req.method === 'GET') {
    return sendJson(res, 200, state)
  }
  if (url.pathname === '/__test/reset' && req.method === 'POST') {
    state.slowResponsesFinished = 0
    return sendJson(res, 200, { ok: true })
  }
  if (url.pathname !== '/v1/chat/completions' || req.method !== 'POST') {
    return sendJson(res, 404, { error: { message: 'Not found' } })
  }

  const body = await readJson(req)
  if (body.stream !== true) {
    return sendJson(res, 200, {
      choices: [
        {
          message: {
            content: JSON.stringify({
              primaryEmotion: '平静',
              emotionScore: 60,
              isNegative: false,
              riskLevel: 0,
              riskDescription: '',
              suggestion: '保持规律作息',
              improvementSuggestions: []
            })
          }
        }
      ]
    })
  }

  const latestUser = [...(body.messages || [])]
    .reverse()
    .find((message) => message.role === 'user')?.content || ''

  if (latestUser.includes('第二层业务错误')) {
    return sendJson(res, 500, { error: { message: '模拟 DeepSeek 业务错误' } })
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })

  if (latestUser.includes('第二层慢速回复')) {
    sendSse(res, { choices: [{ delta: { content: '第二层部分回复' }, finish_reason: null }] })
    await delay(5000)
    if (!res.destroyed) {
      sendSse(res, { choices: [{ delta: { content: '不应保存' }, finish_reason: 'stop' }] })
      res.end('data: [DONE]\n\n')
    }
    state.slowResponsesFinished += 1
    return
  }

  if (latestUser.includes('第二层异常断流')) {
    sendSse(res, { choices: [{ delta: { content: '第二层未完成内容' }, finish_reason: null }] })
    res.end()
    return
  }

  sendSse(res, { choices: [{ delta: { content: '第二层完整回复' }, finish_reason: null }] })
  sendSse(res, { choices: [{ delta: {}, finish_reason: 'stop' }] })
  res.end('data: [DONE]\n\n')
})

server.listen(3100, '0.0.0.0')

const closeServer = () => server.close(() => process.exit(0))
process.on('SIGTERM', closeServer)
process.on('SIGINT', closeServer)
