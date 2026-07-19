const http = require('node:http')

const upstreamBaseUrl = String(process.env.DEEPSEEK_UPSTREAM_BASE_URL || '').replace(/\/+$/, '')
const state = {
  forwardedRequests: 0,
  blockedChatRequests: 0,
  locallyHandledAuxiliaryRequests: 0,
  upstreamCompleted: false,
  upstreamFailed: false
}

const sendJson = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const readBody = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3200')
  if (url.pathname === '/__test/state' && req.method === 'GET') {
    return sendJson(res, 200, state)
  }
  if (url.pathname !== '/v1/chat/completions' || req.method !== 'POST') {
    return sendJson(res, 404, { error: { message: 'Not found' } })
  }
  const body = await readBody(req)
  let requestBody = {}
  try {
    requestBody = JSON.parse(body.toString('utf8'))
  } catch {}

  if (state.forwardedRequests >= 1) {
    if (requestBody.stream !== true) {
      state.locallyHandledAuxiliaryRequests += 1
      return sendJson(res, 200, {
        choices: [
          {
            message: {
              content: JSON.stringify({
                primaryEmotion: '中性',
                emotionScore: 50,
                isNegative: false,
                riskLevel: 0,
                riskDescription: '',
                suggestion: '情绪状态平稳',
                improvementSuggestions: []
              })
            }
          }
        ]
      })
    }
    state.blockedChatRequests += 1
    return sendJson(res, 429, { error: { message: 'Layer 3 blocked a second chat request' } })
  }

  state.forwardedRequests += 1
  try {
    const upstream = await fetch(`${upstreamBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
        Authorization: req.headers.authorization || ''
      },
      body
    })

    res.writeHead(upstream.status, {
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': upstream.headers.get('cache-control') || 'no-cache'
    })
    if (!upstream.body) {
      state.upstreamCompleted = true
      res.end()
      return
    }

    const reader = upstream.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
    state.upstreamCompleted = true
    res.end()
  } catch (error) {
    state.upstreamCompleted = true
    state.upstreamFailed = true
    if (res.headersSent) {
      res.end()
      return
    }
    sendJson(res, 502, { error: { message: `DeepSeek guard network error: ${error.message}` } })
  }
})

server.listen(3200, '0.0.0.0')

const closeServer = () => server.close(() => process.exit(0))
process.on('SIGTERM', closeServer)
process.on('SIGINT', closeServer)
