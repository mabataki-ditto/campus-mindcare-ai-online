import { Router, Request, Response } from 'express'
import prisma from '../utils/prisma'
import { success, fail } from '../utils/response'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

const router = Router()

// GET /api/data-analytics/overview — 数据概览
router.get('/overview', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 最近30天的起始时间（用于趋势统计）
    const thirtyDaysAgo = new Date(today)
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29)

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
      dailyConsultationUsers
    ] = await Promise.all([
      prisma.user.count({ where: { status: 1 } }),
      prisma.emotionDiary.count(),
      prisma.emotionDiary.count({ where: { createdAt: { gte: today } } }),
      prisma.consultationSession.count(),
      prisma.consultationSession.count({ where: { createdAt: { gte: today } } }),
      prisma.alertEvent.count(),
      prisma.alertEvent.count({ where: { handled: false } }),
      // 情绪趋势：最近30天所有日记
      prisma.emotionDiary.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { moodScore: true, createdAt: true }
      }),
      // 咨询趋势：最近30天所有会话
      prisma.consultationSession.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
        select: { createdAt: true, userId: true }
      }),
      // 未处理预警
      prisma.alertEvent.findMany({
        where: { handled: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { nickname: true } } }
      }),
      // 新增用户：按日统计
      getDailyNewUsers(thirtyDaysAgo),
      // 日记用户：按日统计有写日记的用户
      getDailyUniqueUsers('emotionDiary', 'userId', thirtyDaysAgo),
      // 咨询用户：按日统计有咨询的用户
      getDailyUniqueUsers('consultationSession', 'userId', thirtyDaysAgo)
    ])

    // 近30天活跃用户数（有写日记或咨询任一行为）
    const activeUsers = await prisma.user.count({
      where: {
        OR: [
          { diaries: { some: { createdAt: { gte: thirtyDaysAgo } } } },
          { sessions: { some: { createdAt: { gte: thirtyDaysAgo } } } }
        ]
      }
    })

    // 情绪趋势（按日期聚合）
    const emotionTrend = aggregateByDate(recentDiaries, 'moodScore')

    // 咨询统计趋势
    const consultationDailyTrend = aggregateByDate(recentSessions)

    // 预警按等级统计
    const alertByLevel = await prisma.alertEvent.groupBy({
      by: ['riskLevel'],
      _count: true
    })

    const alertByLevelMap: Record<string, number> = {}
    for (const item of alertByLevel) {
      alertByLevelMap[String(item.riskLevel)] = item._count
    }

    // 构建近30天完整日期序列的活跃度数据（活跃用户 = max(日记用户, 咨询用户)）
    const userActivity = buildFullDateActivity(
      dailyNewUsers,
      dailyDiaryUsers,
      dailyConsultationUsers,
      thirtyDaysAgo
    )

    return res.json(success({
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
      emotionTrend,
      consultationStats: {
        totalSessions,
        avgDurationMinutes: 0,
        dailyTrend: consultationDailyTrend
      },
      userActivity,
      alertStats: {
        totalAlerts,
        byLevel: alertByLevelMap,
        recentAlerts: recentAlerts.map(a => ({
          id: a.id,
          user: { nickname: a.user.nickname },
          riskLevel: a.riskLevel,
          reason: a.reason,
          createdAt: a.createdAt
        }))
      }
    }, '查询成功'))
  } catch (err: any) {
    return res.status(500).json(fail(err.message || '服务器内部错误'))
  }
})

/**
 * 统计每日新增用户数
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
 * 统计每日独立用户数（去重）
 */
async function getDailyUniqueUsers(
  modelName: 'emotionDiary' | 'consultationSession',
  field: string,
  since: Date
): Promise<Map<string, Set<string>>> {
  const map = new Map<string, Set<string>>()
  let records: Array<{ createdAt: Date; [key: string]: any }>
  if (modelName === 'emotionDiary') {
    records = await prisma.emotionDiary.findMany({
      where: { createdAt: { gte: since } },
      select: { [field]: true, createdAt: true }
    }) as any
  } else {
    records = await prisma.consultationSession.findMany({
      where: { createdAt: { gte: since } },
      select: { [field]: true, createdAt: true }
    }) as any
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
 * 构建30天完整日期序列的用户活跃度数据
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

// 按日期聚合辅助函数
interface AggregateItem {
  date: string
  avgMoodScore: number
  recordCount: number
  sessionCount: number
  userCount: number
}

function aggregateByDate(data: Array<{ createdAt: Date; [key: string]: any }>, valueField?: string): AggregateItem[] {
  const map = new Map<string, { sum: number; count: number }>()
  for (const item of data) {
    const date = new Date(item.createdAt).toISOString().split('T')[0]
    const existing = map.get(date) || { sum: 0, count: 0 }
    existing.count++
    if (valueField) existing.sum += Number(item[valueField])
    map.set(date, existing)
  }
  return Array.from(map.entries()).map(([date, { sum, count }]) => ({
    date,
    avgMoodScore: valueField ? Math.round(sum / count * 10) / 10 : 0,
    recordCount: count,
    sessionCount: count,
    userCount: count
  }))
}

export { router as analyticsRouter }
