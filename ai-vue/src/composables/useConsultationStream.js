/**
 * AI 心理咨询流式对话 Composable
 *
 * 核心功能：
 * 1. SSE 流式解析 DeepSeek API 响应
 * 2. Tool Calling（Function Calling）循环处理
 * 3. 文件解析（PDF 提取文本）
 *
 * 模块拆分：
 * - useSSEStream：SSE 流解析
 * - useStreamRound：单轮流式请求
 * - useToolCallLoop：Tool Calling 循环
 * - useToolCalls：工具定义与执行
 * - useFileParser：文件解析
 */

import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { startSession, saveMessage } from '@/service/frontend/frontend'
import { executeToolCallLoop } from './useToolCallLoop'
import { parseFile } from './useFileParser'

// ==================== 消息构造函数 ====================

let _msgCounter = 0

/** 创建用户消息对象 */
const createUserMessage = (content) => ({
  id: `user_${Date.now()}_${++_msgCounter}`,
  senderType: 1,
  content,
  createdAt: new Date().toISOString()
})

/** 创建 AI 消息对象（初始内容为空，流式填充） */
const createAiMessage = () => ({
  id: `ai_${Date.now()}_${++_msgCounter}`,
  senderType: 2,
  content: '',
  createdAt: new Date().toISOString()
})

// ==================== 系统提示词 ====================

const SYSTEM_PROMPT = `你是"曼波"，一位温柔专业的AI心理健康助手。你的职责是：
1. 以温暖、耐心的态度陪伴用户
2. 倾听用户的倾诉，给予情感支持
3. 提供科学的心理健康建议（不替代专业诊疗）
4. 如果发现用户有自伤/自杀倾向，立即建议寻求专业帮助
5. 回复要简洁、自然、富有同理心，避免长篇大论
6. 可以适当使用 Markdown 格式（如加粗、列表）让内容更清晰
7. 当用户表达自伤、自杀或极度负面情绪时，请调用 triggerAlert 工具触发预警
8. 当用户询问心理健康相关知识时，请调用 searchKnowledgeBase 工具检索知识库`

// ==================== Composable 主函数 ====================

export function useConsultationStream({ currentSession, messages, getSessionPage, loadSessionEmotion }) {
  // ==================== 响应式状态 ====================

  const userMessage = ref('')
  const isAiTyping = ref(false)
  const toolCallStatus = ref('')
  const attachedFile = ref(null)
  let abortController = null

  // ==================== 辅助函数 ====================

  /** 构建发送给 DeepSeek API 的消息上下文 */
  const buildMessages = () => {
    const history = messages.value
      .filter((msg) => msg.content && !msg.isError)
      .map((msg) => ({
        role: msg.senderType === 1 ? 'user' : 'assistant',
        content: msg.content
      }))
    return [{ role: 'system', content: SYSTEM_PROMPT }, ...history]
  }

  /** 错误处理：标记 AI 消息为错误状态（保留供降级使用） */
  const _handleError = () => {
    const aiMessage = messages.value[messages.value.length - 1]
    if (aiMessage) {
      aiMessage.content = 'AI回复失败，请重试'
      aiMessage.isError = true
    }
    isAiTyping.value = false
    toolCallStatus.value = ''
    abortController = null
    ElMessage.error('AI回复失败，请重试')
  }

  /** 中断当前请求 */
  const cancelRequest = () => {
    if (abortController) {
      abortController.abort()
      abortController = null
    }
    isAiTyping.value = false
    toolCallStatus.value = ''
  }

  // ==================== AI 响应启动 ====================

  /**
   * 执行流式 AI 响应的公共逻辑
   * @param allMessages 发送给 API 的消息上下文
   * @param sessionId 当前会话 ID
   */
  const executeAIResponse = async (allMessages, sessionId) => {
    const aiMessage = messages.value[messages.value.length - 1]
    abortController = new AbortController()

    try {
      await executeToolCallLoop({
        allMessages,
        aiMessage,
        signal: abortController.signal,
        toolCallStatus
      })

      isAiTyping.value = false
      if (aiMessage.content && sessionId) {
        try {
          await saveMessage(sessionId, { senderType: 2, content: aiMessage.content })
        } catch (e) {
          console.error('AI消息保存失败:', e)
        }
      }
      loadSessionEmotion?.(currentSession.value?.sessionId, true)
    } catch (err) {
      if (err.name === 'AbortError') {
        isAiTyping.value = false
        toolCallStatus.value = ''
        return
      }
      console.error('AI 请求错误:', err)
      aiMessage.content = err.message || 'AI回复失败，请重试'
      aiMessage.isError = true
      isAiTyping.value = false
      toolCallStatus.value = ''
      abortController = null
      ElMessage.error(err.message || 'AI回复失败，请重试')
    }
  }

  /**
   * 启动 AI 流式响应（纯文本消息）
   */
  const startAIResponse = (sessionId, _userText) => {
    if (isAiTyping.value) {
      ElMessage.error('AI助手正在输入中，请稍后')
      return
    }

    isAiTyping.value = true
    toolCallStatus.value = ''

    messages.value.push(createAiMessage())
    const allMessages = buildMessages()
    executeAIResponse(allMessages, sessionId)
  }

  // ==================== 会话管理 ====================

  /** 创建新会话并发送第一条消息 */
  const startNewSession = async (message) => {
    const sessionParams = {
      initialMessage: message,
      sessionTitle:
        currentSession.value?.sessionTitle === '新对话'
          ? `曼波AI助手 - ${new Date().toLocaleString()}`
          : currentSession.value?.sessionTitle
    }

    const res = await startSession(sessionParams)
    const sessionData = {
      sessionId: res.sessionId,
      status: res.status,
      sessionTitle: sessionParams.sessionTitle
    }

    if (currentSession.value?.status === 'TEMP') {
      Object.assign(currentSession.value, sessionData)
    } else {
      currentSession.value = sessionData
    }

    await getSessionPage()
    messages.value.push(createUserMessage(message))
    startAIResponse(currentSession.value.sessionId, message)
  }

  // ==================== 消息发送 ====================

  /** 发送消息（支持文本、文件附件） */
  const sendMessage = async (file = null) => {
    const hasText = userMessage.value.trim()
    const hasFile = file || attachedFile.value

    if (!hasText && !hasFile) return

    if (isAiTyping.value) {
      ElMessage.error('AI助手正在输入中，请稍后')
      return
    }

    const message = userMessage.value.trim()
    userMessage.value = ''
    const currentFile = file || attachedFile.value
    attachedFile.value = null

    // ==================== 处理文件附件 ====================
    if (currentFile) {
      try {
        toolCallStatus.value = '正在解析文件...'
        const parsed = await parseFile(currentFile)
        toolCallStatus.value = ''

        // PDF 文件：提取文本，拼接为消息
        const enrichedMessage = message
          ? `以下是我的心理测评报告内容：\n${parsed.content}\n\n我的问题是：${message}`
          : `以下是我的心理测评报告内容：\n${parsed.content}\n\n请根据报告内容与我对话`

        if (currentSession.value?.status === 'TEMP') {
          await startNewSession(enrichedMessage)
          return
        }

        messages.value.push(createUserMessage(enrichedMessage))
        if (currentSession.value?.sessionId) {
          saveMessage(currentSession.value.sessionId, { senderType: 1, content: enrichedMessage }).catch(() => {})
        }
        startAIResponse(currentSession.value?.sessionId, enrichedMessage)
        return
      } catch (err) {
        toolCallStatus.value = ''
        ElMessage.error(err.message || '文件解析失败')
        return
      }
    }

    // ==================== 纯文本消息 ====================
    if (currentSession.value?.status === 'TEMP') {
      await startNewSession(message)
      return
    }

    messages.value.push(createUserMessage(message))
    if (currentSession.value?.sessionId) {
      saveMessage(currentSession.value.sessionId, { senderType: 1, content: message }).catch(() => {})
    }
    startAIResponse(currentSession.value?.sessionId, message)
  }

  // ==================== 返回值 ====================

  return {
    userMessage,
    isAiTyping,
    toolCallStatus,
    attachedFile,
    sendMessage,
    cancelRequest
  }
}
