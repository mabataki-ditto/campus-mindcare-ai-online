import { Router, Request, Response } from "express";
import prisma from "../../utils/prisma";
import { success, fail } from "../../utils/response";
import { authMiddleware } from "../../middleware/auth";
import { v4 as uuidv4 } from "uuid";

/**
 * 会话管理路由
 *
 * 提供心理咨询会话的 CRUD 及消息增查：
 * - POST   /session/start                    创建会话（可选携带初始消息）
 * - GET    /sessions                          会话列表（管理员可查所有，普通用户只能查自己的）
 * - DELETE /sessions/:sessionId               删除会话（级联删除消息/情绪/预警）
 * - GET    /sessions/:sessionId/messages      获取会话历史消息
 * - POST   /sessions/:sessionId/messages      保存单条消息（用户或 AI 消息）
 *
 * sessionId 参数兼容两种格式：
 * - 字符串格式：session_{timestamp}_{uuid8位}（业务层生成）
 * - 数字格式：数据库自增 id（兼容旧版前端）
 */
const router = Router();

/**
 * POST /session/start — 创建会话
 *
 * 生成格式为 `session_{timestamp}_{uuid8位}` 的 sessionId，状态置为 ACTIVE。
 * 若传入 initialMessage，则同时插入一条用户消息（senderType=1）。
 */
router.post(
  "/session/start",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { initialMessage, sessionTitle } = req.body;
      const userId = req.user!.userId;

      // 生成业务层 sessionId：时间戳 + uuid 前 8 位，保证唯一性
      const sessionId = `session_${Date.now()}_${uuidv4().slice(0, 8)}`;

      const session = await prisma.consultationSession.create({
        data: {
          sessionId,
          userId,
          sessionTitle: sessionTitle || "新对话",
          status: "ACTIVE",
        },
      });

      // 如果有初始消息，插入用户消息
      if (initialMessage) {
        await prisma.chatMessage.create({
          data: {
            sessionId: session.id,
            senderType: 1, // 1=用户，2=AI
            content: initialMessage,
          },
        });
      }

      return res.json(
        success(
          {
            sessionId: session.sessionId,
            status: session.status,
          },
          "创建成功",
        ),
      );
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },
);

/**
 * GET /sessions — 会话列表
 *
 * 权限规则：
 * - 普通用户（userType !== 2）：只能查自己的会话
 * - 管理员（userType === 2）：可查所有，支持按 userId 筛选
 *
 * 返回字段包含会话预览（最后一条消息截断 50 字）、消息数、风险等级（取该会话所有预警的最大值）。
 */
router.get("/sessions", authMiddleware, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.userId;
    const userType = req.user!.userType;

    // 兼容两种分页参数命名（currentPage / pageNum）
    const page = Number(req.query.currentPage || req.query.pageNum || 1);
    const size = Number(req.query.size || req.query.pageSize || 10);
    const queryUserId = req.query.userId ? Number(req.query.userId) : undefined;

    const where: Record<string, any> = {};
    // 管理员可查所有，普通用户只能查自己的
    if (userType !== 2) {
      where.userId = userId;
    } else if (queryUserId) {
      where.userId = queryUserId;
    }

    // 并行查询数据和总数
    const [records, total] = await Promise.all([
      prisma.consultationSession.findMany({
        where,
        include: {
          user: { select: { nickname: true, username: true } },
          // 只取最后一条消息作为会话预览
          messages: {
            select: { content: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          _count: { select: { messages: true } },
          alerts: { select: { id: true, riskLevel: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * size,
        take: size,
      }),
      prisma.consultationSession.count({ where }),
    ]);

    // 整理为前端需要的扁平结构
    const formattedRecords = records.map((session) => ({
      id: session.id,
      userId: session.userId,
      sessionId: session.sessionId,
      sessionTitle: session.sessionTitle,
      sessionPreview: session.messages[0]?.content?.substring(0, 50) || "",
      messageCount: session._count.messages,
      lastMessageTime: session.messages[0]?.createdAt || session.createdAt,
      userNickname: session.user.nickname || session.user.username,
      status: session.status,
      // 风险等级取该会话所有预警中的最大值，无预警则为 0
      riskLevel:
        session.alerts.length > 0
          ? Math.max(...session.alerts.map((a: any) => a.riskLevel || 0))
          : 0,
      alertCount: session.alerts.length,
    }));

    return res.json(success({ records: formattedRecords, total }, "查询成功"));
  } catch (err: any) {
    return res.json(fail(err.message));
  }
});

/**
 * DELETE /sessions/:sessionId — 删除会话
 *
 * 级联删除关联数据（消息/情绪分析/预警），使用事务保证原子性。
 * 权限：普通用户只能删除自己的会话，管理员可删除任意会话。
 */
router.delete(
  "/sessions/:sessionId",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = req.user!.userId;

      // sessionId 可能是字符串格式或数字ID，用 OR 兼容两种查询
      const session = await prisma.consultationSession.findFirst({
        where: {
          OR: [
            { sessionId: String(sessionId) },
            { id: Number(sessionId) || undefined },
          ].filter(Boolean),
        },
      });

      if (!session) {
        return res.json(fail("会话不存在"));
      }

      // 校验会话归属：普通用户只能删除自己的会话
      if (req.user!.userType !== 2 && session.userId !== userId) {
        return res.status(403).json(fail("无权删除此会话", 403));
      }

      // 使用事务删除关联数据，保证原子性（任一步失败则全部回滚）
      await prisma.$transaction([
        prisma.chatMessage.deleteMany({ where: { sessionId: session.id } }),
        prisma.sessionEmotion.deleteMany({ where: { sessionId: session.id } }),
        prisma.alertEvent.deleteMany({ where: { sessionId: session.id } }),
        prisma.consultationSession.delete({ where: { id: session.id } }),
      ]);

      return res.json(success(null, "删除成功"));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },
);

/**
 * GET /sessions/:sessionId/messages — 获取会话历史消息
 *
 * 按时间升序返回该会话的所有消息（用户和 AI 消息混合）。
 * 会话不存在时返回空数组（而非报错），便于前端首次进入新会话时直接渲染。
 */
router.get(
  "/sessions/:sessionId/messages",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;

      // 查找 sessionId 对应的数据库 id（兼容字符串和数字两种格式）
      const parsedId = Number(sessionId);
      const session = await prisma.consultationSession.findFirst({
        where: {
          OR: [
            { sessionId: String(sessionId) },
            ...(isNaN(parsedId) ? [] : [{ id: parsedId }]),
          ],
        },
      });

      if (!session) {
        return res.json(success([], "查询成功"));
      }

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: session.id },
        orderBy: { createdAt: "asc" },
      });

      return res.json(success(messages, "查询成功"));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },
);

/**
 * POST /sessions/:sessionId/messages — 保存单条消息
 *
 * 由前端在 AI 回复完成后主动调用，分别保存用户消息和 AI 消息。
 * senderType：1=用户，2=AI
 */
router.post(
  "/sessions/:sessionId/messages",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { senderType, content } = req.body;

      if (!senderType || !content) {
        return res.json(fail("消息内容不能为空"));
      }

      // 查找会话（兼容字符串和数字两种 sessionId 格式）
      const parsedId2 = Number(sessionId);
      const session2 = await prisma.consultationSession.findFirst({
        where: {
          OR: [
            { sessionId: String(sessionId) },
            ...(isNaN(parsedId2) ? [] : [{ id: parsedId2 }]),
          ],
        },
      });

      if (!session2) {
        return res.json(fail("会话不存在"));
      }

      const message = await prisma.chatMessage.create({
        data: {
          sessionId: session2.id,
          senderType: Number(senderType),
          content: String(content),
        },
      });

      return res.json(success(message, "消息保存成功"));
    } catch (err: any) {
      return res.json(fail(err.message));
    }
  },
);

export { router as sessionRouter };
