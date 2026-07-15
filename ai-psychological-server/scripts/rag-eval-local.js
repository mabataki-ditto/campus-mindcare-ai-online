const fs = require('fs')
const path = require('path')

const BASE_URL = 'http://localhost:3000/api'
const EVAL_PATH = path.resolve(__dirname, '..', '..', 'eval.json')

async function request(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...(options.headers || {})
    }
  })
  const data = await response.json()
  if (!data.success && data.code !== 200) {
    throw new Error(data.msg || `请求失败: ${pathname}`)
  }
  return data.data
}

async function main() {
  const evalBody = JSON.parse(fs.readFileSync(EVAL_PATH, 'utf8'))
  const login = await request('/user/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  })

  const result = await request('/rag/evaluate', {
    method: 'POST',
    headers: { token: login.token },
    body: JSON.stringify(evalBody)
  })

  console.log(JSON.stringify(result, null, 2))
  console.log('\n指标摘要')
  console.table([
    { metric: `Keyword HitRate@${result.topK}`, value: result.keywordHitRate },
    { metric: `Keyword NoResultRate@${result.topK}`, value: result.keywordNoResultRate },
    { metric: `RAG HitRate@${result.topK}`, value: result.ragHitRate },
    { metric: `RAG NoResultRate@${result.topK}`, value: result.ragNoResultRate }
  ])
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
