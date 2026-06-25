import { Router } from "express";
import { sessionRouter } from "./session.routes";
import { emotionRouter } from "./emotion.routes";
import { alertRouter } from "./alert.routes";

/**
 * 心理咨询聚合路由
 *
 * 挂载在 /api/psychological-chat 前缀下，包含三个子模块：
 * - sessionRouter  会话管理（创建/列表/删除/消息增查）
 * - emotionRouter  情绪分析（调 DeepSeek 分析会话情绪）
 * - alertRouter    预警管理（创建/列表/处理预警）
 */
const router = Router();

router.use(sessionRouter);
router.use(emotionRouter);
router.use(alertRouter);

export { router as consultationRouter };
