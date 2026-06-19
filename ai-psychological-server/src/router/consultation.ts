import { Router, Request, Response } from 'express'
import prisma from '../utils/prisma'
import { success, fail } from '../utils/response'
import { authMiddleware, adminMiddleware } from '../middleware/auth'
import { v4 as uuidv4 } from 'uuid'
import { config } from '../config'

const router = Router()

/**
 * @swagger
 * /psychological-chat/session/start:
 *   post:
 *     tags: [心理咨询]
 *     summary: 创建咨询会话
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               initialMessage: { type: string }
 *               sessionTitle: { type: string }
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/session/start', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { initialMessage, sessionTitle } = req.body
    const userId = req.user!.userId

    const sessionId = `session_${Date.now()}_${uuidv4().slice(0, 8)}`

    const session = await prisma.consultationSession.create({
      data: {
        sessionId,
        userId,
        sessionTitle: sessionTitle || '新对话',
        status: 'ACTIVE'
      }
    })

    // 如果有初始消息，插入用户消息
    if (initialMessage) {
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          senderType: 1,
          content: initialMessage
        }
      })
    }

    return res.json(success({
      sessionId: session.sessionId,
      status: session.status
    }, '创建成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// GET /api/psychological-chat/sessions — 会话列表
router.get('/sessions', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const userType = req.user!.userType

    // 兼容两种分页参数
    const page = Number(req.query.currentPage || req.query.pageNum || 1)
    const size = Number(req.query.size || req.query.pageSize || 10)
    const queryUserId = req.query.userId ? Number(req.query.userId) : undefined

    const where: Record<string, any> = {}
    // 管理员可查所有，普通用户只能查自己的
    if (userType !== 2) {
      where.userId = userId
    } else if (queryUserId) {
      where.userId = queryUserId
    }

    const [records, total] = await Promise.all([
      prisma.consultationSession.findMany({
        where,
        include: {
          user: { select: { nickname: true, username: true } },
          messages: { select: { content: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
          _count: { select: { messages: true } },
          alerts: { select: { id: true, riskLevel: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size
      }),
      prisma.consultationSession.count({ where })
    ])

    const formattedRecords = records.map((session) => ({
      id: session.id,
      userId: session.userId,
      sessionId: session.sessionId,
      sessionTitle: session.sessionTitle,
      sessionPreview: session.messages[0]?.content?.substring(0, 50) || '',
      messageCount: session._count.messages,
      lastMessageTime: session.messages[0]?.createdAt || session.createdAt,
      userNickname: session.user.nickname || session.user.username,
      status: session.status,
      riskLevel: session.alerts.length > 0
        ? Math.max(...session.alerts.map((a: any) => a.riskLevel || 0))
        : 0,
      alertCount: session.alerts.length
    }))

    return res.json(success({ records: formattedRecords, total }, '查询成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// DELETE /api/psychological-chat/sessions/:sessionId — 删除会话
router.delete('/sessions/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const userId = req.user!.userId

    // sessionId 可能是字符串格式或数字ID
    const session = await prisma.consultationSession.findFirst({
      where: {
        OR: [
          { sessionId: String(sessionId) },
          { id: Number(sessionId) || undefined }
        ].filter(Boolean)
      }
    })

    if (!session) {
      return res.json(fail('会话不存在'))
    }

    // 校验会话归属：普通用户只能删除自己的会话
    if (req.user!.userType !== 2 && session.userId !== userId) {
      return res.status(403).json(fail('无权删除此会话', 403))
    }

    // 使用事务删除关联数据，保证原子性
    await prisma.$transaction([
      prisma.chatMessage.deleteMany({ where: { sessionId: session.id } }),
      prisma.sessionEmotion.deleteMany({ where: { sessionId: session.id } }),
      prisma.alertEvent.deleteMany({ where: { sessionId: session.id } }),
      prisma.consultationSession.delete({ where: { id: session.id } })
    ])

    return res.json(success(null, '删除成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// GET /api/psychological-chat/sessions/:sessionId/messages — 会话消息
router.get('/sessions/:sessionId/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params

    // 查找 sessionId 对应的数据库 id
    const parsedId = Number(sessionId)
    const session = await prisma.consultationSession.findFirst({
      where: {
        OR: [
          { sessionId: String(sessionId) },
          ...(isNaN(parsedId) ? [] : [{ id: parsedId }])
        ]
      }
    })

    if (!session) {
      return res.json(success([], '查询成功'))
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' }
    })

    return res.json(success(messages, '查询成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// POST /api/psychological-chat/sessions/:sessionId/messages — 保存消息
router.post('/sessions/:sessionId/messages', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const { senderType, content } = req.body

    if (!senderType || !content) {
      return res.json(fail('消息内容不能为空'))
    }

    // 查找会话
    const parsedId2 = Number(sessionId)
    const session2 = await prisma.consultationSession.findFirst({
      where: {
        OR: [
          { sessionId: String(sessionId) },
          ...(isNaN(parsedId2) ? [] : [{ id: parsedId2 }])
        ]
      }
    })

    if (!session2) {
      return res.json(fail('会话不存在'))
    }

    const message = await prisma.chatMessage.create({
      data: {
        sessionId: session2.id,
        senderType: Number(senderType),
        content: String(content)
      }
    })

    return res.json(success(message, '消息保存成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// GET /api/psychological-chat/session/:sessionId/emotion — 会话情绪分析
router.get('/session/:sessionId/emotion', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params
    const forceRefresh = req.query.forceRefresh === 'true'

    // sessionId 是字符串格式（如 session_xxx），需要先查找数据库中的会话
    const session = await prisma.consultationSession.findFirst({
      where: { sessionId: String(sessionId) }
    })

    if (!session) {
      return res.json(success({
        primaryEmotion: '中性',
        emotionScore: 50,
        isNegative: false,
        riskLevel: 0,
        riskDescription: '',
        suggestion: '情绪状态平稳',
        improvementSuggestions: []
      }, '查询成功'))
    }

    // 查找已有的情绪分析记录
    let existingEmotion = await prisma.sessionEmotion.findFirst({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'desc' }
    })

    // forceRefresh=true 时强制重新分析，否则有缓存就用缓存
    let emotionResult: any
    if (existingEmotion && !forceRefresh) {
      emotionResult = {
        primaryEmotion: existingEmotion.primaryEmotion,
        emotionScore: existingEmotion.emotionScore,
        isNegative: existingEmotion.isNegative,
        riskLevel: existingEmotion.riskLevel,
        riskDescription: existingEmotion.riskDescription || '',
        suggestion: existingEmotion.suggestion || '',
        improvementSuggestions: existingEmotion.improvementSuggestions
      }
    } else {
      emotionResult = await analyzeEmotionWithAI(session.id)
    }

    return res.json(success({
      primaryEmotion: emotionResult.primaryEmotion,
      emotionScore: emotionResult.emotionScore,
      isNegative: emotionResult.isNegative,
      riskLevel: emotionResult.riskLevel,
      riskDescription: emotionResult.riskDescription || '',
      suggestion: emotionResult.suggestion || '',
      improvementSuggestions: emotionResult.improvementSuggestions
        ? (typeof emotionResult.improvementSuggestions === 'string'
          ? JSON.parse(emotionResult.improvementSuggestions)
          : emotionResult.improvementSuggestions)
        : []
    }, '查询成功'))
  } catch (err: any) {
    console.error('情绪分析错误:', err)
    return res.json(fail(err.message))
  }
})

// 调用 DeepSeek AI 分析会话情绪
async function analyzeEmotionWithAI(sessionDbId: number) {
  try {
    // 获取该会话的所有消息（最近20条）
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: sessionDbId },
      orderBy: { createdAt: 'desc' },
      take: 20
    }).then(msgs => msgs.reverse())

    if (messages.length === 0) {
      // 没有消息，返回默认值
      return {
        primaryEmotion: '中性',
        emotionScore: 50,
        isNegative: false,
        riskLevel: 0,
        riskDescription: '',
        suggestion: '暂无对话记录',
        improvementSuggestions: JSON.stringify([])
      }
    }

    // 构建用户消息摘要
    const userMessages = messages
      .filter(m => m.senderType === 1)
      .map(m => m.content)
      .join('\n')

    // 调用 DeepSeek 分析情绪（使用统一配置）
    const response = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.deepseek.apiKey}`
      },
      body: JSON.stringify({
        model: config.deepseek.model,
        messages: [
          {
            role: 'system',
            content: `你是一位专业的心理咨询师和情绪分析师。请根据用户的聊天内容，分析其情绪状态。

请严格按照以下JSON格式回复（不要包含其他文字）：
{
  "primaryEmotion": "主要情绪（如：焦虑、悲伤、愤怒、恐惧、绝望、平静、开心等）",
  "emotionScore": 情绪分数(0-100, 0=极度负面, 50=中性, 100=极度正面),
  "isNegative": 是否为负面情绪(true/false),
  "riskLevel": 风险等级(0=正常, 1=关注, 2=预警, 3=危机),
  "riskDescription": "风险描述（简要说明判断依据）",
  "suggestion": "温暖的支持性建议（一句话）",
  "improvementSuggestions": ["建议1", "建议2", "建议3"]
}

风险等级判断标准：
- 0=正常：情绪平稳，无异常表达
- 1=关注：有轻微负面情绪或压力表达
- 2=预警：有明显焦虑/抑郁倾向，提到失眠、食欲不振、自我否定等
- 3=危机：表达自杀意念、自伤想法、极端绝望、无法承受等

注意：用户消息中如果出现"不想活了"、"想死"、"结束生命"、"割腕"、"跳楼"、"自杀"等词汇，必须判定为 riskLevel=3（危机）。`
          },
          {
            role: 'user',
            content: `以下是用户在心理咨询对话中的发言，请分析其情绪状态：\n\n${userMessages}`
          }
        ],
        temperature: 0.3
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API 错误: ${response.status}`)
    }

    const data = await response.json() as any
    const aiContent = data.choices?.[0]?.message?.content || ''

    // 解析 AI 返回的 JSON
    let analysisResult
    try {
      // 尝试提取 JSON（可能被包裹在代码块中）
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0])
      } else {
        analysisResult = JSON.parse(aiContent)
      }
    } catch {
      // 解析失败，使用默认值
      analysisResult = {
        primaryEmotion: '未知',
        emotionScore: 50,
        isNegative: false,
        riskLevel: 0,
        riskDescription: 'AI 分析结果解析失败',
        suggestion: '如需帮助请联系专业咨询师',
        improvementSuggestions: []
      }
    }

    // 确保字段值合法
    const result = {
      primaryEmotion: String(analysisResult.primaryEmotion || '中性').substring(0, 20),
      emotionScore: Math.max(0, Math.min(100, Number(analysisResult.emotionScore) || 50)),
      isNegative: Boolean(analysisResult.isNegative),
      riskLevel: Math.max(0, Math.min(3, Number(analysisResult.riskLevel) || 0)),
      riskDescription: String(analysisResult.riskDescription || '').substring(0, 500),
      suggestion: String(analysisResult.suggestion || '情绪状态平稳').substring(0, 500),
      improvementSuggestions: JSON.stringify(Array.isArray(analysisResult.improvementSuggestions)
        ? analysisResult.improvementSuggestions.slice(0, 5)
        : [])
    }

    // 保存到数据库，风险等级 >= 2 时在事务中同时创建预警记录
    if (result.riskLevel >= 2) {
      const sessionInfo = await prisma.consultationSession.findUnique({ where: { id: sessionDbId } })
      if (sessionInfo) {
        await prisma.$transaction([
          prisma.sessionEmotion.create({
            data: {
              sessionId: sessionDbId,
              ...result
            }
          }),
          prisma.alertEvent.create({
            data: {
              userId: sessionInfo.userId,
              sessionId: sessionDbId,
              riskLevel: result.riskLevel,
              reason: `AI 情绪分析检测到${result.riskLevel === 3 ? '危机' : '预警'}级情绪: ${result.primaryEmotion} - ${result.riskDescription}`
            }
          })
        ])

        // 更新用户风险等级
        await prisma.user.update({
          where: { id: sessionInfo.userId },
          data: { riskLevel: result.riskLevel }
        })
      }
    } else {
      await prisma.sessionEmotion.create({
        data: {
          sessionId: sessionDbId,
          ...result
        }
      })
    }

    return result
  } catch (error: any) {
    console.error('AI 情绪分析失败:', error.message)
    // 分析失败时返回默认值
    return {
      primaryEmotion: '中性',
      emotionScore: 50,
      isNegative: false,
      riskLevel: 0,
      riskDescription: '',
      suggestion: '情绪状态平稳',
      improvementSuggestions: JSON.stringify([])
    }
  }
}

// POST /api/psychological-chat/alert — 创建预警记录
router.post('/alert', authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId
    const { sessionId, riskLevel, reason } = req.body

    if (!riskLevel || !reason) {
      return res.json(fail('风险等级和原因不能为空'))
    }

    // 查找 sessionId 对应的数据库 id
    let sessionDbId: number | undefined
    if (sessionId) {
      const session = await prisma.consultationSession.findFirst({
        where: { sessionId: String(sessionId) }
      })
      sessionDbId = session?.id
    }

    const alert = await prisma.alertEvent.create({
      data: {
        userId,
        sessionId: sessionDbId,
        riskLevel: Number(riskLevel),
        reason
      }
    })

    // 更新用户风险等级
    if (Number(riskLevel) >= 2) {
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user && Number(riskLevel) > user.riskLevel) {
        await prisma.user.update({
          where: { id: userId },
          data: { riskLevel: Number(riskLevel) }
        })
      }
    }

    return res.json(success({ alertId: alert.id }, '预警已记录'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// GET /api/psychological-chat/alerts — 预警记录列表（管理端）
router.get('/alerts', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.currentPage || 1)
    const size = Number(req.query.size || 10)
    const riskLevel = req.query.riskLevel ? Number(req.query.riskLevel) : undefined
    const handled = req.query.handled !== undefined ? req.query.handled === 'true' : undefined

    const where: Record<string, any> = {}
    if (riskLevel) where.riskLevel = riskLevel
    if (handled !== undefined) where.handled = handled

    const [records, total] = await Promise.all([
      prisma.alertEvent.findMany({
        where,
        include: {
          user: { select: { nickname: true, username: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size
      }),
      prisma.alertEvent.count({ where })
    ])

    const formattedRecords = records.map((alert) => ({
      id: alert.id,
      userId: alert.userId,
      user: { nickname: alert.user.nickname, username: alert.user.username },
      sessionId: alert.sessionId,
      riskLevel: alert.riskLevel,
      reason: alert.reason,
      handled: alert.handled,
      handlerId: alert.handlerId,
      handleNote: alert.handleNote,
      handledAt: alert.handledAt,
      createdAt: alert.createdAt
    }))

    return res.json(success({ records: formattedRecords, total }, '查询成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// PUT /api/psychological-chat/alerts/:id/handle — 处理预警
router.put('/alerts/:id/handle', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { handleNote } = req.body
    const handlerId = req.user!.userId

    await prisma.alertEvent.update({
      where: { id: Number(id) },
      data: {
        handled: true,
        handlerId,
        handleNote,
        handledAt: new Date()
      }
    })

    return res.json(success(null, '处理成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

export { router as consultationRouter }
