import crypto from 'crypto'
import prisma from '../utils/prisma'
import { splitArticleIntoChunks } from './chunk'
import { createEmbeddings } from './embedding.service'
import { deleteVectors, upsertVectors } from './vector.service'

export async function reindexArticle(articleId: number) {
  const article = await prisma.knowledgeArticle.findUnique({
    where: { id: articleId },
    include: { category: { select: { categoryName: true } } }
  })

  if (!article) {
    throw new Error('文章不存在')
  }

  if (article.status !== 1) {
    await deleteArticleIndex(articleId)
    await markArticleIndex(articleId, 'DELETED', null)
    return { indexed: false, reason: '文章未发布，已清理索引', chunkCount: 0 }
  }

  try {
    await markArticleIndex(articleId, 'INDEXING', null)
    await deleteArticleIndex(articleId)

    const chunks = splitArticleIntoChunks(article.title, article.content)
    if (chunks.length === 0) {
      await markArticleIndex(articleId, 'FAILED', '文章正文为空，无法建立索引')
      return { indexed: false, reason: '文章正文为空', chunkCount: 0 }
    }

    const embeddings = await createEmbeddings(chunks.map((chunk) => chunk.content))
    const chunkRecords = chunks.map((chunk, index) => {
      const vectorId = crypto.randomUUID()
      return {
        ...chunk,
        vectorId,
        embedding: embeddings[index]
      }
    })

    await upsertVectors(
      chunkRecords.map((chunk) => ({
        id: chunk.vectorId,
        vector: chunk.embedding,
        payload: {
          articleId: article.id,
          chunkIndex: chunk.chunkIndex,
          title: article.title,
          categoryId: article.categoryId,
          categoryName: article.category?.categoryName || '',
          tags: article.tags || ''
        }
      }))
    )

    await (prisma as any).knowledgeChunk.createMany({
      data: chunkRecords.map((chunk) => ({
        articleId: article.id,
        chunkIndex: chunk.chunkIndex,
        title: article.title,
        content: chunk.content,
        contentHash: chunk.contentHash,
        vectorId: chunk.vectorId,
        status: 1,
        metadata: JSON.stringify({
          categoryId: article.categoryId,
          categoryName: article.category?.categoryName || '',
          tags: article.tags || '',
          updatedAt: article.updatedAt
        })
      }))
    })

    await markArticleIndex(articleId, 'INDEXED', null)
    return { indexed: true, chunkCount: chunkRecords.length }
  } catch (error: any) {
    await markArticleIndex(articleId, 'FAILED', error.message)
    throw error
  }
}

export async function deleteArticleIndex(articleId: number) {
  const chunks = await (prisma as any).knowledgeChunk.findMany({
    where: { articleId },
    select: { vectorId: true }
  })

  await deleteVectors(chunks.map((chunk: { vectorId: string }) => chunk.vectorId))
  await (prisma as any).knowledgeChunk.deleteMany({ where: { articleId } })

  return { deleted: true, chunkCount: chunks.length }
}

export function syncArticleRagIndex(articleId: number, status: number) {
  const task = status === 1 ? reindexArticle(articleId) : deleteArticleIndex(articleId).then(() => markArticleIndex(articleId, 'DELETED', null))
  task.catch((error: any) => {
    console.error(`RAG 索引同步失败 articleId=${articleId}:`, error.message)
  })
}

async function markArticleIndex(articleId: number, status: string, error: string | null) {
  await (prisma as any).knowledgeArticle.update({
    where: { id: articleId },
    data: {
      ragIndexStatus: status,
      ragIndexedAt: status === 'INDEXED' ? new Date() : undefined,
      ragIndexError: error ? String(error).substring(0, 500) : null
    }
  })
}
