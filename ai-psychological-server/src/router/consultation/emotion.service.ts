import prisma from "../../utils/prisma";
import { config } from "../../config";

/**
 * 情绪分析服务
 *
 * 封装调用 DeepSeek 分析会话情绪的逻辑，独立于路由层，便于复用和测试。
 */

/**
 * 调用 DeepSeek AI 分析会话情绪
 *
 * 完整流程：
 * 1. 取该会话最近 20 条消息（按时间倒序取再反转回正序）
 * 2. 过滤出用户消息（senderType=1）拼接成文本
 * 3. 调用 DeepSeek（非流式，temperature=0.3 保证输出稳定）
 * 4. 解析 AI 返回的 JSON（兼容代码块包裹的情况）
 * 5. 字段合法性校验（分数 0-100、风险 0-3、字符串截断）
 * 6. 持久化：
 *    - riskLevel >= 2：事务中同时写 SessionEmotion + AlertEvent，并更新 User.riskLevel
 *    - 否则：仅写 SessionEmotion
 *
 * 失败时返回默认中性情绪，不抛出异常（保证调用方不会因分析失败而中断）。
 *
 * @param sessionDbId 会话在数据库中的自增 id（非业务层 sessionId 字符串）
 */
export async function analyzeEmotionWithAI(sessionDbId: number) {
  try {
    // 取最近 20 条消息（倒序取再反转，避免消息过多导致 token 超限）
    const messages = await prisma.chatMessage
      .findMany({
        where: { sessionId: sessionDbId },
        orderBy: { createdAt: "desc" },
        take: 20,
      })
      .then((msgs) => msgs.reverse());

    if (messages.length === 0) {
      // 没有消息，返回默认值
      return {
        primaryEmotion: "中性",
        emotionScore: 50,
        isNegative: false,
        riskLevel: 0,
        riskDescription: "",
        suggestion: "暂无对话记录",
        improvementSuggestions: JSON.stringify([]),
      };
    }

    // 只分析用户消息（senderType=1），AI 回复不参与情绪判断
    const userMessages = messages
      .filter((m) => m.senderType === 1)
      .map((m) => m.content)
      .join("\n");

    // 调用 DeepSeek 分析情绪（非流式，temperature=0.3 保证输出稳定）
    const response = await fetch(
      `${config.deepseek.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.deepseek.apiKey}`,
        },
        body: JSON.stringify({
          model: config.deepseek.model,
          messages: [
            {
              role: "system",
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

注意：用户消息中如果出现"不想活了"、"想死"、"结束生命"、"割腕"、"跳楼"、"自杀"等词汇，必须判定为 riskLevel=3（危机）。`,
            },
            {
              role: "user",
              content: `以下是用户在心理咨询对话中的发言，请分析其情绪状态：\n\n${userMessages}`,
            },
          ],
          temperature: 0.3,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`DeepSeek API 错误: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const aiContent = data.choices?.[0]?.message?.content || "";

    // 解析 AI 返回的 JSON（可能被 ```json 代码块包裹，用正则提取）
    let analysisResult;
    try {
      // 尝试提取 JSON（可能被包裹在代码块中）
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        analysisResult = JSON.parse(aiContent);
      }
    } catch {
      // 解析失败，使用默认值（不中断流程）
      analysisResult = {
        primaryEmotion: "未知",
        emotionScore: 50,
        isNegative: false,
        riskLevel: 0,
        riskDescription: "AI 分析结果解析失败",
        suggestion: "如需帮助请联系专业咨询师",
        improvementSuggestions: [],
      };
    }

    // 字段合法性校验：分数限制 0-100，风险限制 0-3，字符串截断防止超长
    const result = {
      primaryEmotion: String(analysisResult.primaryEmotion || "中性").substring(
        0,
        20,
      ),
      emotionScore: Math.max(
        0,
        Math.min(100, Number(analysisResult.emotionScore) || 50),
      ),
      isNegative: Boolean(analysisResult.isNegative),
      riskLevel: Math.max(
        0,
        Math.min(3, Number(analysisResult.riskLevel) || 0),
      ),
      riskDescription: String(analysisResult.riskDescription || "").substring(
        0,
        500,
      ),
      suggestion: String(analysisResult.suggestion || "情绪状态平稳").substring(
        0,
        500,
      ),
      // improvementSuggestions 最多保留 5 条，序列化为 JSON 字符串存库
      improvementSuggestions: JSON.stringify(
        Array.isArray(analysisResult.improvementSuggestions)
          ? analysisResult.improvementSuggestions.slice(0, 5)
          : [],
      ),
    };

    // 持久化：风险等级 >= 2 时在事务中同时创建预警记录
    if (result.riskLevel >= 2) {
      const sessionInfo = await prisma.consultationSession.findUnique({
        where: { id: sessionDbId },
      });
      if (sessionInfo) {
        // 事务保证 SessionEmotion 和 AlertEvent 同时写入，任一失败则全部回滚
        await prisma.$transaction([
          prisma.sessionEmotion.create({
            data: {
              sessionId: sessionDbId,
              ...result,
            },
          }),
          prisma.alertEvent.create({
            data: {
              userId: sessionInfo.userId,
              sessionId: sessionDbId,
              riskLevel: result.riskLevel,
              reason: `AI 情绪分析检测到${result.riskLevel === 3 ? "危机" : "预警"}级情绪: ${result.primaryEmotion} - ${result.riskDescription}`,
            },
          }),
        ]);

        // 更新用户风险等级（此处直接覆盖，与 alert.routes 的"只升不降"逻辑不同）
        await prisma.user.update({
          where: { id: sessionInfo.userId },
          data: { riskLevel: result.riskLevel },
        });
      }
    } else {
      // 低风险只写情绪记录，不创建预警
      await prisma.sessionEmotion.create({
        data: {
          sessionId: sessionDbId,
          ...result,
        },
      });
    }

    return result;
  } catch (error: any) {
    // 整个流程任何异常都返回默认中性情绪，保证调用方不中断
    console.error("AI 情绪分析失败:", error.message);
    return {
      primaryEmotion: "中性",
      emotionScore: 50,
      isNegative: false,
      riskLevel: 0,
      riskDescription: "",
      suggestion: "情绪状态平稳",
      improvementSuggestions: JSON.stringify([]),
    };
  }
}
