import { Router, Request, Response } from "express";
import prisma from "../../utils/prisma";
import { success, fail } from "../../utils/response";
import { authMiddleware } from "../../middleware/auth";
import { v4 as uuidv4 } from "uuid";

const router = Router();

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
