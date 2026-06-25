import { Router, Request, Response } from "express";
import prisma from "../../utils/prisma";
import { success, fail } from "../../utils/response";
import { authMiddleware } from "../../middleware/auth";
import { analyzeEmotionWithAI } from "./emotion.service";

// 情绪分析接口（含缓存逻辑）

/**
 * 情绪分析路由
 *
 * 提供会话情绪分析接口，支持缓存机制：
 * - GET /session/:sessionId/emotion  获取会话情绪分析结果
 *
 * 缓存策略：
 * - 默认返回该会话最近一次的情绪分析记录（SessionEmotion）
 * - forceRefresh=true 时强制重新调用 AI 分析
 */
const router = Router();

/**
 * GET /session/:sessionId/emotion — 会话情绪分析
 *
 * 流程：
 * 1. 根据 sessionId 查找会话，不存在则返回默认中性情绪
 * 2. 查询已有的情绪分析记录（取最新一条）
 * 3. 有缓存且未强制刷新 → 直接返回缓存
 *    否则 → 调用 analyzeEmotionWithAI 重新分析
 *
 * improvementSuggestions 在数据库中以 JSON 字符串存储，返回时解析为数组。
 */
router.get(
  "/session/:sessionId/emotion",
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const forceRefresh = req.query.forceRefresh === "true";

      // sessionId 是字符串格式（如 session_xxx），需要先查找数据库中的会话
      const session = await prisma.consultationSession.findFirst({
        where: { sessionId: String(sessionId) },
      });

      // 会话不存在时返回默认中性情绪（而非报错），便于前端首次进入时直接渲染
      if (!session) {
        return res.json(
          success(
            {
              primaryEmotion: "中性",
              emotionScore: 50,
              isNegative: false,
              riskLevel: 0,
              riskDescription: "",
              suggestion: "情绪状态平稳",
              improvementSuggestions: [],
            },
            "查询成功",
          ),
        );
      }

      // 查找已有的情绪分析记录（取最新一条作为缓存）
      let existingEmotion = await prisma.sessionEmotion.findFirst({
        where: { sessionId: session.id },
        orderBy: { createdAt: "desc" },
      });

      // forceRefresh=true 时强制重新分析，否则有缓存就用缓存
      let emotionResult: any;
      if (existingEmotion && !forceRefresh) {
        emotionResult = {
          primaryEmotion: existingEmotion.primaryEmotion,
          emotionScore: existingEmotion.emotionScore,
          isNegative: existingEmotion.isNegative,
          riskLevel: existingEmotion.riskLevel,
          riskDescription: existingEmotion.riskDescription || "",
          suggestion: existingEmotion.suggestion || "",
          improvementSuggestions: existingEmotion.improvementSuggestions,
        };
      } else {
        emotionResult = await analyzeEmotionWithAI(session.id);
      }

      return res.json(
        success(
          {
            primaryEmotion: emotionResult.primaryEmotion,
            emotionScore: emotionResult.emotionScore,
            isNegative: emotionResult.isNegative,
            riskLevel: emotionResult.riskLevel,
            riskDescription: emotionResult.riskDescription || "",
            suggestion: emotionResult.suggestion || "",
            // improvementSuggestions 在数据库中以 JSON 字符串存储，返回时解析为数组
            improvementSuggestions: emotionResult.improvementSuggestions
              ? typeof emotionResult.improvementSuggestions === "string"
                ? JSON.parse(emotionResult.improvementSuggestions)
                : emotionResult.improvementSuggestions
              : [],
          },
          "查询成功",
        ),
      );
    } catch (err: any) {
      console.error("情绪分析错误:", err);
      return res.json(fail(err.message));
    }
  },
);

export { router as emotionRouter };
