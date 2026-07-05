import { Router, Request, Response } from 'express'
import { success, fail } from '../utils/response'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { answerWithRag } from '../rag/chat.service'
import { deleteArticleIndex, reindexArticle } from '../rag/index.service'
import { retrieveKnowledge } from '../rag/retrieve.service'
import { evaluateRetrieval } from '../rag/evaluate.service'

const router = Router()

router.post('/articles/:id/reindex', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await reindexArticle(Number(req.params.id))
    return res.json(success(result, '索引重建完成'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

router.delete('/articles/:id/index', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const result = await deleteArticleIndex(Number(req.params.id))
    return res.json(success(result, '索引删除完成'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

router.post('/retrieve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { query, topK } = req.body
    const records = await retrieveKnowledge(String(query || ''), topK ? Number(topK) : undefined)
    return res.json(success({ records }, '检索成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

router.post('/evaluate', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { cases, topK } = req.body
    if (!Array.isArray(cases) || cases.length === 0) {
      return res.json(fail('评估用例不能为空', 400))
    }

    const invalidCase = cases.find(
      (item) =>
        !item ||
        typeof item.question !== 'string' ||
        !item.question.trim() ||
        !Array.isArray(item.expectedArticleIds) ||
        item.expectedArticleIds.length === 0
    )
    if (invalidCase) {
      return res.json(fail('评估用例格式错误：question 和 expectedArticleIds 必填', 400))
    }

    const result = await evaluateRetrieval(
      cases.map((item) => ({
        question: item.question.trim(),
        expectedArticleIds: item.expectedArticleIds.map(Number)
      })),
      topK ? Number(topK) : undefined
    )

    return res.json(success(result, '评估完成'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

router.post('/chat', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { question } = req.body
    if (!question) return res.json(fail('问题不能为空', 400))

    const result = await answerWithRag(String(question))
    return res.json(success(result, '问答成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

export { router as ragRouter }
