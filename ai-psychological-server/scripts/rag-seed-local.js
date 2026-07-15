const fs = require('fs')
const path = require('path')
const { cases } = require('./rag-eval-dataset')

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
  const login = await request('/user/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  })
  const headers = { token: login.token }

  const page = await request('/knowledge/article/page?currentPage=1&size=500', { headers })
  const titleToId = new Map(page.records.map((article) => [article.title, article.id]))
  const evalCases = []
  const summary = []

  for (const item of cases) {
    let id = titleToId.get(item.title)
    if (!id) {
      const article = await request('/knowledge/article', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          title: item.title,
          content: item.content,
          summary: item.summary,
          categoryId: item.categoryId,
          tags: item.tags,
          authorName: '管理员'
        })
      })
      id = article.id
      titleToId.set(item.title, id)

      await request(`/knowledge/article/${id}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status: 1 })
      })
    }

    const index = await request(`/rag/articles/${id}/reindex`, {
      method: 'POST',
      headers
    })

    evalCases.push({
      question: item.question,
      expectedArticleIds: [id]
    })
    summary.push({
      id,
      topic: item.topic,
      title: item.title,
      chunkCount: index.chunkCount
    })
  }

  fs.writeFileSync(
    EVAL_PATH,
    `${JSON.stringify({ topK: 5, cases: evalCases }, null, 2)}\n`,
    'utf8'
  )

  console.table(summary)
  console.log(`已生成评估用例: ${EVAL_PATH}`)
}

main().catch((error) => {
  console.error(error.message)
  process.exit(1)
})
