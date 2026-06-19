import { Router, Request, Response } from 'express'
import prisma from '../utils/prisma'
import { success, fail } from '../utils/response'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

const router = Router()

/**
 * @swagger
 * /emotion-diary:
 *   post:
 *     tags: [情绪日记]
 *     summary: 添加情绪日记
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [moodScore]
 *             properties:
 *               moodScore: { type: number, minimum: 1, maximum: 10 }
 *               dominantEmotion: { type: string, example: 愉悦 }
 *               emotionTriggers: { type: string }
 *               diaryContent: { type: string }
 *               sleepQuality: { type: number }
 *               stressLevel: { type: number }
 *               diaryDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: 记录成功
 */
router.post('/', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { moodScore, dominantEmotion, emotionTriggers, diaryContent, sleepQuality, stressLevel, diaryDate } = req.body

    if (moodScore === undefined || moodScore === null) {
      return res.json(fail('请选择情绪评分'))
    }

    const diary = await prisma.emotionDiary.create({
      data: {
        userId,
        moodScore: Number(moodScore),
        moodLabel: dominantEmotion || '未选择',
        dominantEmotion: dominantEmotion || null,
        emotionTriggers: emotionTriggers || null,
        content: diaryContent || null,
        sleepQuality: sleepQuality ? Number(sleepQuality) : null,
        stressLevel: stressLevel ? Number(stressLevel) : null,
        diaryDate: diaryDate ? new Date(diaryDate) : new Date()
      }
    })

    return res.json(success({ id: diary.id }, '记录成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// GET /api/emotion-diary/admin/page — 日记管理列表
router.get('/admin/page', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.currentPage || 1)
    const size = Number(req.query.size || 10)
    const userId = req.query.userId ? Number(req.query.userId) : undefined

    const where: Record<string, any> = {}
    if (userId) where.userId = userId

    const [records, total] = await Promise.all([
      prisma.emotionDiary.findMany({
        where,
        include: {
          user: { select: { nickname: true, username: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size
      }),
      prisma.emotionDiary.count({ where })
    ])

    const formattedRecords = records.map((diary) => ({
      id: diary.id,
      userNickname: diary.user.nickname || diary.user.username,
      moodScore: diary.moodScore,
      moodLabel: diary.moodLabel,
      content: diary.content,
      createdAt: diary.createdAt
    }))

    return res.json(success({ records: formattedRecords, total }, '查询成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// DELETE /api/emotion-diary/admin/:id — 删除日记
router.delete('/admin/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await prisma.emotionDiary.delete({ where: { id: Number(id) } })

    return res.json(success(null, '删除成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

export { router as emotionDiaryRouter }
