import { config } from '../config'

interface EmbeddingResponse {
  data?: Array<{ embedding?: number[] }>
}

export async function createEmbedding(input: string) {
  if (!config.embedding.apiKey || !config.embedding.baseUrl || !config.embedding.model) {
    throw new Error('Embedding 服务未配置')
  }

  const response = await fetch(`${trimTrailingSlash(config.embedding.baseUrl)}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.embedding.apiKey}`
    },
    body: JSON.stringify({
      model: config.embedding.model,
      input
    })
  })

  if (!response.ok) {
    throw new Error(`Embedding API 请求失败: ${response.status}`)
  }

  const data = (await response.json()) as EmbeddingResponse
  const embedding = data.data?.[0]?.embedding
  if (!Array.isArray(embedding) || embedding.length === 0) {
    throw new Error('Embedding API 返回格式异常')
  }

  return embedding
}

export async function createEmbeddings(inputs: string[]) {
  const embeddings: number[][] = []
  for (const input of inputs) {
    embeddings.push(await createEmbedding(input))
  }
  return embeddings
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}
