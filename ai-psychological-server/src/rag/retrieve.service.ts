import prisma from '../utils/prisma'
import { config } from '../config'
import { createEmbedding } from './embedding.service'
import { searchVectors } from './vector.service'

export interface RagReference {
  index: number
  chunkId: number
  articleId: number
  title: string
  content: string
  snippet: string
  score: number
}

export async function retrieveKnowledge(query: string, topK = config.rag.topK): Promise<RagReference[]> {
  if (!query || !query.trim()) return []

  const queryEmbedding = await createEmbedding(query.trim())
  const vectorResults = await searchVectors(queryEmbedding, topK, config.rag.minScore)
  const vectorIds = vectorResults.map((item) => String(item.id))
  if (vectorIds.length === 0) return []

  const chunks = await (prisma as any).knowledgeChunk.findMany({
    where: {
      vectorId: { in: vectorIds },
      status: 1,
      article: { status: 1 }
    },
    select: {
      id: true,
      articleId: true,
      title: true,
      content: true,
      vectorId: true
    }
  })

  const chunkByVectorId = new Map<string, any>(chunks.map((chunk: any) => [chunk.vectorId, chunk]))

  return vectorResults
    .map((result, order) => {
      const chunk = chunkByVectorId.get(String(result.id))
      if (!chunk) return null
      return {
        index: order + 1,
        chunkId: chunk.id,
        articleId: chunk.articleId,
        title: chunk.title,
        content: chunk.content,
        snippet: createSnippet(chunk.content),
        score: Number(result.score.toFixed(4))
      }
    })
    .filter(Boolean) as RagReference[]
}

function createSnippet(content: string) {
  return content.replace(/\s+/g, ' ').slice(0, 160)
}
