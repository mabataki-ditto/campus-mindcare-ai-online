import { Router, Request, Response } from "express";
import prisma from "../../utils/prisma";
import { success, fail } from "../../utils/response";
import { authMiddleware, adminMiddleware } from "../../middleware/auth";

// 创建/列表/处理预警
/**
 * 预警管理路由
 *
 * 提供心理危机预警的创建、查询和处理：
 * - POST /alert                创建预警记录（前端 triggerAlert 工具调用）
 * - GET  /alerts               预警列表（仅管理员）
 * - PUT  /alerts/:id/handle    处理预警（仅管理员）
 *
 * 风险等级定义：1=关注，2=预警，3=危机
 * 当 riskLevel >= 2 时，会同步更新 User.riskLevel（只升不降）
 */
const router = Router();

/**
 * POST /alert — 创建预警记录
 *
 * 由前端 triggerAlert 工具在 AI 检测到用户表达自伤/自杀/极端负面情绪时调用。
 * sessionId 可选（可能在没有会话上下文时触发）。
 * riskLevel >= 2 时同步更新用户风险等级（仅当新等级高于当前等级）。
 */
router.post("/alert", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { sessionId, riskLevel, reason } = req.body;

    if (!riskLevel || !reason) {
      return res.json(fail("风险等级和原因不能为空"));
    }

    // 查找 sessionId 对应的数据库 id（sessionId 可选）
    let sessionDbId: number | undefined;
    if (sessionId) {
      const session = await prisma.consultationSession.findFirst({
        where: { sessionId: String(sessionId) },
      });
      sessionDbId = session?.id;
    }

    const alert = await prisma.alertEvent.create({
      data: {
        userId,
        sessionId: sessionDbId,
        riskLevel: Number(riskLevel),
        reason,
      },
    });

    // riskLevel >= 2 时同步更新用户风险等级（只升不降，避免已恢复的用户被旧预警拉低）
    if (Number(riskLevel) >= 2) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user && Number(riskLevel) > user.riskLevel) {
        await prisma.user.update({
          where: { id: userId },
          data: { riskLevel: Number(riskLevel) },
        });
      }
    }

    return res.json(success({ alertId: alert.id }, "预警已记录"));
  } catch (err: any) {
    return res.json(fail(err.message));
  }
});

/**
 * GET /alerts — 预警记录列表（管理端）
 *
 * 仅管理员可访问（adminMiddleware 校验 userType === 2）。
 * 支持按 riskLevel 和 handled 状态筛选，返回关联的用户昵称信息。
 */
router.get(
  "/alerts",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const page = Number(req.query.currentPage || 1);
      const size = Number(req.query.size || 10);
      const riskLevel = req.query.riskLevel
        ? Number(req.query.riskLevel)
        : undefined;
      const handled =
        req.query.handled !== undefined
          ? req.query.handled === "true"
          : undefined;

      const where: Record<string, any> = {};
      if (riskLevel) where.riskLevel = riskLevel;
      if (handled !== undefined) where.handled = handled;

      // 并行查询数据和总数
      const [records, total] = await Promise.all([
        prisma.alertEvent.findMany({
          where,
          include: {
            user: { select: { nickname: true, username: true } },
          },
          orderBy: { createdAt: "desc" },
          skip: (page - 1) * size,
          take: size,
        }),
        prisma.alertEvent.count({ where }),
      ]);

      // 整理为前端需要的扁平结构
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
        createdAt: alert.createdAt,
      }));

      return res.json(
        success({ records: formattedRecords, total }, "查询成功"),
      );
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },
);

/**
 * PUT /alerts/:id/handle — 处理预警
 *
 * 仅管理员可访问。标记预警为已处理，记录处理人、处理备注和处理时间。
 */
router.put(
  "/alerts/:id/handle",
  authMiddleware,
  adminMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { handleNote } = req.body;
      const handlerId = req.user!.userId;

      await prisma.alertEvent.update({
        where: { id: Number(id) },
        data: {
          handled: true,
          handlerId,
          handleNote,
          handledAt: new Date(),
        },
      });

      return res.json(success(null, "处理成功"));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },
);

export { router as alertRouter };
