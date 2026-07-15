const http = require('node:http')

const state = {
  aiRequests: [],
  aiSaves: [],
  closedStreams: 0
}

const readJson = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}
}

const sendJson = (res, data) => {
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

const sendSse = (res, payload) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`)
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:3000')

  if (url.pathname === '/__e2e/reset' && req.method === 'POST') {
    state.aiRequests = []
    state.aiSaves = []
    state.closedStreams = 0
    return sendJson(res, { ok: true })
  }

  if (url.pathname === '/__e2e/state') return sendJson(res, state)

  if (url.pathname === '/api/psychological-chat/sessions' && req.method === 'GET') {
    return sendJson(res, { code: 200, data: { records: [], total: 0 } })
  }

  if (url.pathname === '/api/psychological-chat/session/start' && req.method === 'POST') {
    return sendJson(res, { code: 200, data: { sessionId: 'session-e2e', status: 'ACTIVE' } })
  }

  if (/^\/api\/psychological-chat\/sessions\/[^/]+\/messages$/.test(url.pathname)) {
    if (req.method === 'GET') return sendJson(res, { code: 200, data: [] })
    if (req.method === 'POST') {
      const body = await readJson(req)
      if (body.senderType === 2) state.aiSaves.push(body)
      return sendJson(res, { code: 200, data: { id: state.aiSaves.length, ...body } })
    }
  }

  if (url.pathname === '/api/rag/retrieve' && req.method === 'POST') {
    return sendJson(res, { code: 200, data: { records: [] } })
  }

  if (url.pathname === '/api/psychological-chat/session/session-e2e/emotion') {
    return sendJson(res, { code: 200, data: null })
  }

  if (url.pathname === '/api/ai/chat' && req.method === 'POST') {
    const body = await readJson(req)
    state.aiRequests.push(body)
    const latestUser = [...body.messages].reverse().find((item) => item.role === 'user')?.content || ''

    if (latestUser.includes('业务错误')) {
      return sendJson(res, { code: 500, msg: '模拟业务错误' })
    }

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    })

    if (latestUser.includes('慢速回复')) {
      let completed = false
      res.on('close', () => {
        if (!completed) state.closedStreams += 1
      })
      sendSse(res, { choices: [{ delta: { content: '已经生成的部分' }, finish_reason: null }] })
      await delay(5000)
      if (!res.destroyed) {
        sendSse(res, { choices: [{ delta: { content: '不应出现' }, finish_reason: 'stop' }] })
        completed = true
        res.end('data: [DONE]\n\n')
      }
      return
    }

    if (latestUser.includes('异常断流')) {
      sendSse(res, { choices: [{ delta: { content: '未完成内容' }, finish_reason: null }] })
      res.end()
      return
    }

    if (latestUser.includes('增量回复')) {
      sendSse(res, { choices: [{ delta: { content: '第一段' }, finish_reason: null }] })
      await delay(600)
      sendSse(res, { choices: [{ delta: { content: '第二段' }, finish_reason: null }] })
      sendSse(res, { choices: [{ delta: {}, finish_reason: 'stop' }] })
      res.end('data: [DONE]\n\n')
      return
    }

    if (latestUser.includes('拆分中文')) {
      const event = Buffer.from(
        `data: ${JSON.stringify({ choices: [{ delta: { content: '中文完整' }, finish_reason: null }] })}\n\n`,
        'utf8'
      )
      const chineseStart = event.indexOf(Buffer.from('中'))
      res.write(event.subarray(0, chineseStart + 1))
      await delay(50)
      res.write(event.subarray(chineseStart + 1, event.length - 1))
      await delay(50)
      res.write(event.subarray(event.length - 1))
      sendSse(res, { choices: [{ delta: {}, finish_reason: 'stop' }] })
      res.end('data: [DONE]\n\n')
      return
    }

    if (latestUser.includes('检查上下文')) {
      const polluted = body.messages.some(
        (item) => item.role === 'assistant' && String(item.content).includes('已经生成的部分')
      )
      sendSse(res, {
        choices: [{ delta: { content: polluted ? '上下文污染' : '上下文干净' }, finish_reason: null }]
      })
      sendSse(res, { choices: [{ delta: {}, finish_reason: 'stop' }] })
      res.end('data: [DONE]\n\n')
      return
    }

    sendSse(res, { choices: [{ delta: { content: '完整回复' }, finish_reason: null }] })
    await delay(50)
    sendSse(res, { choices: [{ delta: {}, finish_reason: 'stop' }] })
    res.end('data: [DONE]\n\n')
    return
  }

  sendJson(res, { code: 404, msg: `未模拟接口: ${req.method} ${url.pathname}` })
})

const startMockServer = (port = 3000) =>
  new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => {
      resolve({
        close: () =>
          new Promise((done) => {
            server.closeAllConnections()
            server.close(done)
          })
      })
    })
  })

module.exports = { startMockServer }

if (require.main === module) {
  startMockServer()
}

const closeProcess = () => {
  server.closeAllConnections()
  server.close(() => process.exit(0))
}
process.on('SIGTERM', closeProcess)
process.on('SIGINT', closeProcess)
