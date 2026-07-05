import { config } from '../config'

interface VectorPoint {
  id: string
  vector: number[]
  payload: Record<string, any>
}

interface SearchResult {
  id: string
  score: number
  payload?: Record<string, any>
}

let collectionReady = false

export async function upsertVectors(points: VectorPoint[]) {
  if (points.length === 0) return
  await ensureCollection(points[0].vector.length)

  const response = await qdrantFetch(`/collections/${config.qdrant.collection}/points?wait=true`, {
    method: 'PUT',
    body: JSON.stringify({ points })
  })

  if (!response.ok) {
    throw new Error(`Qdrant 写入失败: ${response.status}`)
  }
}

export async function deleteVectors(vectorIds: string[]) {
  if (vectorIds.length === 0) return
  await ensureCollection(config.embedding.dimension)

  const response = await qdrantFetch(`/collections/${config.qdrant.collection}/points/delete?wait=true`, {
    method: 'POST',
    body: JSON.stringify({ points: vectorIds })
  })

  if (!response.ok) {
    throw new Error(`Qdrant 删除失败: ${response.status}`)
  }
}

export async function searchVectors(vector: number[], limit: number, minScore: number): Promise<SearchResult[]> {
  await ensureCollection(vector.length)

  const response = await qdrantFetch(`/collections/${config.qdrant.collection}/points/search`, {
    method: 'POST',
    body: JSON.stringify({
      vector,
      limit,
      score_threshold: minScore,
      with_payload: true
    })
  })

  if (!response.ok) {
    throw new Error(`Qdrant 检索失败: ${response.status}`)
  }

  const data = (await response.json()) as { result?: SearchResult[] }
  return data.result || []
}

async function ensureCollection(vectorSize: number) {
  if (collectionReady) return

  const getResponse = await qdrantFetch(`/collections/${config.qdrant.collection}`, { method: 'GET' })
  if (getResponse.ok) {
    collectionReady = true
    return
  }

  if (getResponse.status !== 404) {
    throw new Error(`Qdrant 集合检查失败: ${getResponse.status}`)
  }

  const createResponse = await qdrantFetch(`/collections/${config.qdrant.collection}`, {
    method: 'PUT',
    body: JSON.stringify({
      vectors: {
        size: vectorSize,
        distance: 'Cosine'
      }
    })
  })

  if (!createResponse.ok) {
    throw new Error(`Qdrant 集合创建失败: ${createResponse.status}`)
  }

  collectionReady = true
}

function qdrantFetch(path: string, init: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }
  if (config.qdrant.apiKey) headers['api-key'] = config.qdrant.apiKey

  return fetch(`${trimTrailingSlash(config.qdrant.url)}${path}`, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers || {})
    }
  })
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '')
}
