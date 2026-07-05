import prisma from '../utils/prisma'
import { retrieveKnowledge } from './retrieve.service'

export interface RagEvalCase {
  question: string
  expectedArticleIds: number[]
}

export interface RagEvalResult {
  question: string
  expectedArticleIds: number[]
  keywordHitArticleIds: number[]
  ragHitArticleIds: number[]
  keywordHit: boolean
  ragHit: boolean
  keywordNoResult: boolean
  ragNoResult: boolean
  keywordHitRank: number | null
  ragHitRank: number | null
}

export async function evaluateRetrieval(cases: RagEvalCase[], topK = 8) {
  const results: RagEvalResult[] = []

  for (const item of cases) {
    const [keywordArticles, ragReferences] = await Promise.all([
      keywordSearch(item.question, topK),
      retrieveKnowledge(item.question, topK)
    ])

    const keywordHitArticleIds = keywordArticles.map((article: any) => article.id)
    const ragHitArticleIds = Array.from(new Set(ragReferences.map((reference) => reference.articleId)))
    const keywordHitRank = findHitRank(keywordHitArticleIds, item.expectedArticleIds)
    const ragHitRank = findHitRank(ragHitArticleIds, item.expectedArticleIds)

    results.push({
      question: item.question,
      expectedArticleIds: item.expectedArticleIds,
      keywordHitArticleIds,
      ragHitArticleIds,
      keywordHit: keywordHitRank !== null,
      ragHit: ragHitRank !== null,
      keywordNoResult: keywordHitArticleIds.length === 0,
      ragNoResult: ragHitArticleIds.length === 0,
      keywordHitRank,
      ragHitRank
    })
  }

  return {
    total: results.length,
    topK,
    keywordHitRate: calcRate(results.filter((item) => item.keywordHit).length, results.length),
    keywordNoResultRate: calcRate(results.filter((item) => item.keywordNoResult).length, results.length),
    ragHitRate: calcRate(results.filter((item) => item.ragHit).length, results.length),
    ragNoResultRate: calcRate(results.filter((item) => item.ragNoResult).length, results.length),
    keywordFailureCases: buildFailureCases(results, 'keyword'),
    ragFailureCases: buildFailureCases(results, 'rag'),
    results
  }
}

function keywordSearch(query: string, topK: number) {
  return prisma.knowledgeArticle.findMany({
    where: {
      status: 1,
      OR: [{ title: { contains: query } }, { content: { contains: query } }]
    },
    select: { id: true },
    take: topK
  })
}

function findHitRank(actual: number[], expected: number[]) {
  const index = actual.findIndex((id) => expected.includes(id))
  return index === -1 ? null : index + 1
}

function calcRate(hit: number, total: number) {
  if (total === 0) return 0
  return Number((hit / total).toFixed(4))
}

function buildFailureCases(results: RagEvalResult[], type: 'keyword' | 'rag') {
  return results
    .filter((item) => (type === 'keyword' ? !item.keywordHit : !item.ragHit))
    .map((item) => {
      const hitArticleIds = type === 'keyword' ? item.keywordHitArticleIds : item.ragHitArticleIds
      return {
        question: item.question,
        expectedArticleIds: item.expectedArticleIds,
        hitArticleIds,
        reason: hitArticleIds.length === 0 ? 'NO_RESULT' : 'MISSED_EXPECTED'
      }
    })
}
