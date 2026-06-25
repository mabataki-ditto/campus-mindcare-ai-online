/**
 * 数据看板分析路由模块。
 * 提供首页看板所需的总览数据：用户/日记/咨询/预警的统计卡片、
 * 情绪与咨询趋势图、30 天用户活跃度、预警等级分布等。
 */
import { Router, Request, Response } from 'express'
import prisma from '../utils/prisma'
import { success, fail } from '../utils/response'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

const router = Router()

// 看板总览接口：一次性返回首页图表和统计卡片需要的全部数据。
router.get('/overview', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    // 统计口径统一到当天 00:00:00，避免跨天边界把今天的数据算偏。
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 最近 30 天的起始日期，用于趋势图和活跃用户统计。
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

    // 将所有看板查询并发执行，接口总耗时接近最慢的单个查询。
    const [
      totalUsers,
      totalDiaries,
      todayNewDiaries,
      totalSessions,
      todayNewSessions,
      totalAlerts,
      unhandledAlerts,
      recentDiaries,
      recentSessions,
      recentAlerts,
      dailyNewUsers,
      dailyDiaryUsers,
      dailyConsultationUsers,
      activeUsers,
      alertByLevel
    ] = await Promise.all([
      prisma.user.count({ where: { status: 1 } }),
      prisma.emotionDiary.count(),
      prisma.emotionDiary.count({ where: { createdAt: { gte: today } } }),
      prisma.consultationSession.count(),
      prisma.consultationSession.count({ where: { createdAt: { gte: today } } }),
      prisma.alertEvent.count(),
      prisma.alertEvent.count({ where: { handled: false } }),
      // 情绪趋势：取最近 30 天的日记记录，后面按日期聚合成折线图数据。
      prisma.emotionDiary.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { moodScore: true, createdAt: true }
      }),
      // 咨询趋势：取最近 30 天的会话记录，后面按日期聚合成柱状图数据。
      prisma.consultationSession.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, userId: true }
      }),
      // 最近未处理预警：给看板和待办卡片使用。
      prisma.alertEvent.findMany({
        where: { handled: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { nickname: true } } }
      }),
      // 每日新增用户数。
      getDailyNewUsers(thirtyDaysAgo),
      // 每日日记活跃用户数，按用户去重。
      getDailyUniqueUsers('emotionDiary', 'userId', thirtyDaysAgo),
      // 每日咨询活跃用户数，按用户去重。
      getDailyUniqueUsers('consultationSession', 'userId', thirtyDaysAgo),
      // 最近 30 天有任意行为的活跃用户数。
      prisma.user.count({
        where: {
          OR:  [
            { diaries: { some: { createdAt: { gte: thirtyDaysAgo } } } },
            { sessions: { some: { createdAt: { gte: thirtyDaysAgo } } } }
          ]
        }
      }),
      // 按风险等级统计预警数量。
      prisma.alertEvent.groupBy({
        by: ['riskLevel'],
        _count: true
      })
    ])

    // 将原始记录按日期聚合成图表可直接渲染的数据。
    const emotionTrend = aggregateByDate(recentDiaries, 'moodScore')

    // 咨询趋势不计算平均值，只需要按天的数量统计。
    const consultationDailyTrend = aggregateByDate(recentSessions)

    // 将 groupBy 的数组结果转成前端更好用的对象结构。
    const alertByLevelMap: Record<string, number> = {}
    for (const item of alertByLevel) {
      alertByLevelMap[String(item.riskLevel)] = item._count
    }

    // 补齐最近 30 天的日期序列，缺失日期补 0，方便前端直接画连续折线。
    const userActivity = buildFullDateActivity(dailyNewUsers, dailyDiaryUsers, dailyConsultationUsers, thirtyDaysAgo)

    // 按前端看板模块组织返回结构，避免页面再做二次拼装。
    return res.json(
      success(
        {
          // 系统总览：顶部统计卡片数据。
          systemOverview: {
            totalUsers,
            activeUsers,
            totalDiaries,
            todayNewDiaries,
            totalSessions,
            todayNewSessions,
            totalAlerts,
            unhandledAlerts
          },
          // 情绪趋势：30 天日均情绪分折线图。
          emotionTrend,
          // 咨询统计：会话总数、日均趋势（平均时长暂未统计）。
          consultationStats: {
            totalSessions,
            dailyTrend: consultationDailyTrend
          },
          // 用户活跃度：30 天每日新增/日记/咨询用户数。
          userActivity,
          // 预警统计：等级分布 + 最近 5 条未处理预警。
          alertStats: {
            totalAlerts,
            byLevel: alertByLevelMap,
            recentAlerts: recentAlerts.map((a) => ({
              id: a.id,
              user: { nickname: a.user.nickname },
              riskLevel: a.riskLevel,
              reason: a.reason,
              createdAt: a.createdAt
            }))
          }
        },
        '查询成功'
      )
    )
  } catch (err: any) {
    return res.status(500).json(fail(err.message || '服务器内部错误'))
  }
})

/**
 * 统计每日新增用户数。
 * 只取创建时间，避免拉取不必要字段。
 */
async function getDailyNewUsers(since: Date): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const records = await prisma.user.findMany({
    where: { createdAt: { gte: since }, status: 1 },
    select: { createdAt: true }
  })
  // 按天分组累加：把 createdAt 截断成日期字符串作为 key。
  for (const r of records) {
    const date = new Date(r.createdAt).toISOString().split('T')[0]
    map.set(date, (map.get(date) || 0) + 1)
  }
  return map
}

/**
 * 统计每日独立活跃用户数。
 * modelName 用来切换日记 / 咨询两种来源，field 指定去重字段。
 */
async function getDailyUniqueUsers(
  modelName: 'emotionDiary' | 'consultationSession',
  field: string,
  since: Date
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  let records: Array<{ createdAt: Date; [key: string]: any }>
  // 根据数据来源选择对应的 Prisma 模型查询。
  if (modelName === 'emotionDiary') {
    records = (await prisma.emotionDiary.findMany({
      where: { createdAt: { gte: since } },
      select: { [field]: true, createdAt: true }
    })) as any
  } else {
    records = (await prisma.consultationSession.findMany({
      where: { createdAt: { gte: since } },
      select: { [field]: true, createdAt: true }
    })) as any
  }
  // 按天分组，用 Set 对用户去重。
  for (const r of records) {
    const date = new Date(r.createdAt).toISOString().split('T')[0]
    if (!map.has(date)) map.set(date, new Set())
    map.get(date)!.add(String(r[field]))
  }
  return map
}

interface DateActivityItem {
  date: string // 日期，格式 YYYY-MM-DD
  activeUsers: number // 当日活跃用户估算值（日记/咨询用户数取最大）
  newUsers: number // 当日新增用户数
  diaryUsers: number // 当日写日记的去重用户数
  consultationUsers: number // 当日咨询的去重用户数
}

/**
 * 构建完整的 30 天日期序列。
 * 活跃度按“日记用户数”和“咨询用户数”取最大值，作为当天活跃用户估算。
 */
function buildFullDateActivity(
  newMap: Map<string, number>,
  diaryMap: Map<string, Set<string>>,
  consultMap: Map<string, Set<string>>,
  startDate: Date
): DateActivityItem[] {
  const result: DateActivityItem[] = []
  // 从起始日期向后遍历 30 天，保证日期序列连续，缺失数据补 0。
  for (let i = 0; i < 30; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]

    // 取 Set 的 size 即为当天去重后的用户数。
    const diaryCount = diaryMap.has(dateStr) ? diaryMap.get(dateStr)!.size : 0
    const consultCount = consultMap.has(dateStr) ? consultMap.get(dateStr)!.size : 0

    result.push({
      date: dateStr,
      activeUsers: Math.max(diaryCount, consultCount),
      newUsers: newMap.has(dateStr) ? newMap.get(dateStr)! : 0,
      diaryUsers: diaryCount,
      consultationUsers: consultCount
    })
  }
  return result
}

// 聚合后的图表通用结构。
interface AggregateItem {
  date: string // 日期，格式 YYYY-MM-DD
  avgMoodScore: number // 当日平均情绪分（保留一位小数），无值字段时为 0
  recordCount: number // 当日记录数（日记场景使用）
  sessionCount: number // 当日会话数（咨询场景使用）
  userCount: number // 当日用户数
}

// 将按天明细压缩成图表可直接消费的聚合数据。
function aggregateByDate(data: Array<{ createdAt: Date; [key: string]: any }>, valueField?: string): AggregateItem[] {
  // 第一阶段：按天累加指定字段的和与记录数。
  const map = new Map<string, { sum: number; count: number }>()
  for (const item of data) {
    const date = new Date(item.createdAt).toISOString().split('T')[0]
    const existing = map.get(date) || { sum: 0, count: 0 }
    existing.count++
    if (valueField) existing.sum += Number(item[valueField])
    map.set(date, existing)
  }
  // 第二阶段：把累加结果转成图表数据，平均值保留一位小数。
  return Array.from(map.entries()).map(([date, { sum, count }]) => ({
    date,
    avgMoodScore: valueField ? Math.round((sum / count) * 10) / 10 : 0,
    recordCount: count,
    sessionCount: count,
    userCount: count
  }))
}

export { router as analyticsRouter }
