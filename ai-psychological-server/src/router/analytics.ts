import { Router, Request, Response } from 'express'
import prisma from '../utils/prisma'
import { success, fail } from '../utils/response'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

const router = Router()

// GET /api/data-analytics/overview — 数据看板概览（仅管理员）
// 聚合统计：系统总览 + 情绪趋势 + 咨询趋势 + 用户活跃度 + 预警统计
router.get('/overview', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    // 时间范围：今日零点（用于"今日新增"）+ 近 30 天（用于趋势图）
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

    // 并行查询所有统计数据，避免串行等待
    const [
      totalUsers, // 总用户数（status=1）
      totalDiaries, // 总日记数
      todayNewDiaries, // 今日新增日记
      totalSessions, // 总咨询会话数
      todayNewSessions, // 今日新增会话
      totalAlerts, // 总预警数
      unhandledAlerts, // 未处理预警数
      recentDiaries, // 近 30 天日记（用于情绪趋势聚合）
      recentSessions, // 近 30 天会话（用于咨询趋势聚合）
      recentAlerts, // 最近 5 条未处理预警（Top 5）
      dailyNewUsers, // 每日新增用户 Map
      dailyDiaryUsers, // 每日写日记的去重用户 Map
      dailyConsultationUsers, // 每日咨询的去重用户 Map
      activeUsers, // 近 30 天活跃用户数
      alertByLevel // 按风险等级分组的预警数
    ] = await Promise.all([
      prisma.user.count({ where: { status: 1 } }),
      prisma.emotionDiary.count(),
      prisma.emotionDiary.count({ where: { createdAt: { gte: today } } }),
      prisma.consultationSession.count(),
      prisma.consultationSession.count({ where: { createdAt: { gte: today } } }),
      prisma.alertEvent.count(),
      prisma.alertEvent.count({ where: { handled: false } }),
      prisma.emotionDiary.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { moodScore: true, createdAt: true }
      }),
      prisma.consultationSession.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, userId: true }
      }),
      prisma.alertEvent.findMany({
        where: { handled: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { nickname: true } } }
      }),
      getDailyNewUsers(thirtyDaysAgo),
      getDailyUniqueUsers('emotionDiary', 'userId', thirtyDaysAgo),
      getDailyUniqueUsers('consultationSession', 'userId', thirtyDaysAgo),
      // 活跃用户：近 30 天写过日记 OR 发起过咨询的用户数
      prisma.user.count({
        where: {
          OR: [
            { diaries: { some: { createdAt: { gte: thirtyDaysAgo } } } },
            { sessions: { some: { createdAt: { gte: thirtyDaysAgo } } } }
          ]
        }
      }),
      prisma.alertEvent.groupBy({
        by: ['riskLevel'],
        _count: true
      })
    ])

    // 二次聚合：将原始记录转为按日趋势数据
    const emotionTrend = aggregateByDate(recentDiaries, 'moodScore')
    const consultationDailyTrend = buildConsultationTrend(recentSessions)

    // 将 groupBy 结果转为 { '1': 数量, '2': 数量, '3': 数量 } 的 Map
    const alertByLevelMap: Record<string, number> = {}
    for (const item of alertByLevel) {
      alertByLevelMap[String(item.riskLevel)] = item._count
    }

    // 合并三个每日 Map → 完整的 30 天用户活跃度数组（补齐空日期）
    const userActivity = buildFullDateActivity(dailyNewUsers, dailyDiaryUsers, dailyConsultationUsers, thirtyDaysAgo)

    return res.json(
      success(
        {
          systemOverview: {
            // 顶部统计卡片
            totalUsers,
            activeUsers,
            totalDiaries,
            todayNewDiaries,
            totalSessions,
            todayNewSessions,
            totalAlerts,
            unhandledAlerts
          },
          emotionTrend, // 情绪折线图：每日平均情绪分数
          consultationStats: {
            // 咨询统计
            totalSessions,
            dailyTrend: consultationDailyTrend
          },
          userActivity, // 用户活跃度图：每日活跃/新增/日记/咨询用户数
          alertStats: {
            // 预警统计
            totalAlerts,
            byLevel: alertByLevelMap, // 按风险等级分布
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
 * 查询每日新增用户数
 * 遍历用户记录，按 createdAt 的日期分组计数
 *
 * @returns Map<日期字符串, 该日新增用户数>
 */
async function getDailyNewUsers(since: Date): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  const records = await prisma.user.findMany({
    where: { createdAt: { gte: since }, status: 1 },
    select: { createdAt: true }
  })

  for (const r of records) {
    const date = new Date(r.createdAt).toISOString().split('T')[0]
    map.set(date, (map.get(date) || 0) + 1)
  }

  return map
}

/**
 * 查询每日去重用户数（按指定模型和字段）
 * 用 Set 去重同一用户在同一天的多条记录（如用户当天写 3 条日记只算 1 个活跃用户）
 *
 * @param modelName Prisma 模型名：emotionDiary 或 consultationSession
 * @param field 去重字段（userId）
 * @returns Map<日期字符串, 该日去重用户 Set>
 */
async function getDailyUniqueUsers(
  modelName: 'emotionDiary' | 'consultationSession',
  field: string,
  since: Date
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  let records: Array<{ createdAt: Date; [key: string]: any }>

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

  for (const r of records) {
    const date = new Date(r.createdAt).toISOString().split('T')[0]
    if (!map.has(date)) map.set(date, new Set())
    map.get(date)!.add(String(r[field]))
  }

  return map
}

interface DateActivityItem {
  date: string
  activeUsers: number
  newUsers: number
  diaryUsers: number
  consultationUsers: number
}

/**
 * 构建 30 天用户活跃度数据
 * 补全无数据的日期，确保折线图 X 轴连续不缺天
 *
 * 活跃用户 = 当天写日记和咨询用户数的较大值（粗略估算）
 */
function buildFullDateActivity(
  newMap: Map<string, number>,
  diaryMap: Map<string, Set<string>>,
  consultMap: Map<string, Set<string>>,
  startDate: Date
): DateActivityItem[] {
  const result: DateActivityItem[] = []

  for (let i = 0; i < 30; i++) {
    const d = new Date(startDate)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]

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

interface ConsultationTrendItem {
  date: string
  sessionCount: number
  userCount: number
}

/**
 * 构建咨询趋势：按日聚会话数 + 去重用户数
 * 同一用户当天多次咨询：sessionCount 计多次，userCount 只计一次
 */
function buildConsultationTrend(data: Array<{ createdAt: Date; userId: number }>): ConsultationTrendItem[] {
  const map = new Map<string, { sessionCount: number; userIds: Set<string> }>()

  for (const item of data) {
    const date = new Date(item.createdAt).toISOString().split('T')[0]
    const existing = map.get(date) || { sessionCount: 0, userIds: new Set<string>() }
    existing.sessionCount++
    existing.userIds.add(String(item.userId))
    map.set(date, existing)
  }

  // 按日期升序排序，确保折线图 X 轴时间顺序正确
  return Array.from(map.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, day]) => ({
      date,
      sessionCount: day.sessionCount,
      userCount: day.userIds.size
    }))
}

interface AggregateItem {
  date: string
  avgMoodScore: number
  recordCount: number
  sessionCount: number
  userCount: number
}

/**
 * 按日期聚合数据：计算每日平均值和记录数
 * 用于情绪趋势图（valueField='moodScore' 时计算平均心情分数）
 *
 * 注意：返回值含 sessionCount/userCount 字段，但本函数实际只填 recordCount，
 *       sessionCount/userCount 是为兼容接口字段保留，值为 recordCount 的复制
 */
function aggregateByDate(data: Array<{ createdAt: Date; [key: string]: any }>, valueField?: string): AggregateItem[] {
  const map = new Map<string, { sum: number; count: number }>()

  for (const item of data) {
    const date = new Date(item.createdAt).toISOString().split('T')[0]
    const existing = map.get(date) || { sum: 0, count: 0 }
    existing.count++
    if (valueField) existing.sum += Number(item[valueField])
    map.set(date, existing)
  }

  // 平均值保留 1 位小数
  return Array.from(map.entries()).map(([date, { sum, count }]) => ({
    date,
    avgMoodScore: valueField ? Math.round((sum / count) * 10) / 10 : 0,
    recordCount: count,
    sessionCount: count,
    userCount: count
  }))
}

export { router as analyticsRouter }
