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
import { searchKnowledgeBase } from './useToolCalls'
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
  references: [],
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

  const userMessage = ref('') // 输入框文本，v-model 双向绑定
  const isAiTyping = ref(false) // AI 是否正在回复（控制发送按钮禁用 & 加载态）
  const toolCallStatus = ref('') // 工具调用状态提示，如"正在调用工具..."
  const attachedFile = ref(null) // 当前附件文件（PDF 等），发送后自动清空
  let abortController = null // 中断控制器，用于取消正在进行的 AI 流式请求

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
   * @param allMessages 发送给 API 的消息上下文（含 system prompt + 历史消息）
   * @param sessionId 当前会话 ID，用于保存 AI 消息和触发情绪分析
   */
  const executeAIResponse = async (allMessages, sessionId) => {
    // 取到最后一条消息（即 startAIResponse 中 push 的空 AI 消息占位）
    // executeToolCallLoop 会流式填充 aiMessage.content，界面实时更新
    const aiMessage = messages.value[messages.value.length - 1]
    abortController = new AbortController()

    try {
      await appendKnowledgeContext(allMessages, aiMessage)

      // 核心：执行 Tool Calling 循环（可能多轮流式请求，直到 AI 不再调用工具）
      await executeToolCallLoop({
        allMessages,
        aiMessage,
        signal: abortController.signal, // 支持用户手动中断
        toolCallStatus
      })

      isAiTyping.value = false

      // AI 回复完成后，将完整内容保存到后端
      if (aiMessage.content && sessionId) {
        try {
          await saveMessage(sessionId, { senderType: 2, content: aiMessage.content })
        } catch (e) {
          // 保存失败不影响用户使用，仅打印日志
          console.error('AI消息保存失败:', e)
        }
      }

      // 触发情绪分析（可选链：loadSessionEmotion 由外部注入，可能不存在）
      loadSessionEmotion?.(currentSession.value?.sessionId, true)
    } catch (err) {
      // 用户主动中断：静默处理，不弹错误提示
      if (err.name === 'AbortError') {
        isAiTyping.value = false
        toolCallStatus.value = ''
        return
      }

      // 其他错误：标记 AI 消息为错误状态，界面显示红色提示
      console.error('AI 请求错误:', err)
      aiMessage.content = err.message || 'AI回复失败，请重试'
      aiMessage.isError = true
      isAiTyping.value = false
      toolCallStatus.value = ''
      abortController = null
      ElMessage.error(err.message || 'AI回复失败，请重试')
    }
  }

  const appendKnowledgeContext = async (allMessages, aiMessage) => {
    const latestUserMessage = [...allMessages].reverse().find((msg) => msg.role === 'user')
    const query = latestUserMessage?.content?.trim()
    if (!query) return

    toolCallStatus.value = '正在检索知识库...'
    const result = await searchKnowledgeBase(query)
    toolCallStatus.value = ''

    if (Array.isArray(result.references)) {
      aiMessage.references = result.references
    }

    if (result.found && Array.isArray(result.articles) && result.articles.length > 0) {
      const context = result.articles
        .map((article) => `[${article.referenceIndex}] 标题：${article.title}\n内容：${article.content}`)
        .join('\n\n')

      allMessages.push({
        role: 'system',
        content: `本轮用户问题已经完成知识库检索。请优先依据以下资料回答；如果使用了资料，请在回答末尾列出引用编号，例如：参考来源：[1]。\n\n${context}`
      })
      return
    }

    allMessages.push({
      role: 'system',
      content: '本轮用户问题已经检索知识库，但没有找到充分依据。请不要编造知识库引用。'
    })
  }

  /**
   * 启动 AI 流式响应（纯文本消息）
   * 注意：_userText 参数未使用，保留仅为兼容调用签名
   */
  const startAIResponse = (sessionId, _userText) => {
    // 防止重复触发：AI 正在回复时拒绝新的请求
    if (isAiTyping.value) {
      ElMessage.error('AI助手正在输入中，请稍后')
      return
    }

    isAiTyping.value = true
    toolCallStatus.value = ''

    // 先 push 一个空的 AI 消息占位，后续流式填充 content（界面显示加载态）
    messages.value.push(createAiMessage())
    // 构建完整上下文：[system, ...历史消息]，供 DeepSeek API 使用
    const allMessages = buildMessages()
    // 进入流式响应 + Tool Calling 循环
    executeAIResponse(allMessages, sessionId)
  }

  // ==================== 会话管理 ====================

  /** 创建新会话并发送第一条消息（TEMP 会话 → ACTIVE 会话） */
  const startNewSession = async (message) => {
    const sessionParams = {
      initialMessage: message, //用户的第一条消息
      // 若当前标题是默认的"新对话"，替换为带时间的标题；否则保留用户自定义标题
      sessionTitle:
        currentSession.value?.sessionTitle === '新对话'
          ? `曼波AI助手 - ${new Date().toLocaleString()}`
          : currentSession.value?.sessionTitle
    }

    // 调后端 POST /psychological-chat/session/start，拿到真实 sessionId
    const res = await startSession(sessionParams)
    const sessionData = {
      sessionId: res.sessionId,
      status: res.status,
      sessionTitle: sessionParams.sessionTitle
    }

    // TEMP 会话：原地更新属性（保留引用，侧边栏列表仍指向同一对象）
    // 非 TEMP（理论上不应进入此分支）：整体替换
    if (currentSession.value?.status === 'TEMP') {
      Object.assign(currentSession.value, sessionData)
    } else {
      currentSession.value = sessionData
    }

    // 刷新侧边栏会话列表，使新会话立即出现
    await getSessionPage()
    // 将用户消息添加到聊天界面
    messages.value.push(createUserMessage(message))
    // 启动 AI 流式响应
    startAIResponse(currentSession.value.sessionId, message)
  }

  // ==================== 消息发送 ====================

  /** 发送消息（支持文本、文件附件） */
  const sendMessage = async (file = null) => {
    // 检查是否有内容可发送（文本或文件至少一项）
    const hasText = userMessage.value.trim()
    const hasFile = file || attachedFile.value

    if (!hasText && !hasFile) return

    // 防止 AI 正在回复时重复发送
    if (isAiTyping.value) {
      ElMessage.error('AI助手正在输入中，请稍后')
      return
    }

    // 提取输入框文本并清空，提取当前附件并清空
    const message = userMessage.value.trim()
    userMessage.value = ''
    const currentFile = file || attachedFile.value
    attachedFile.value = null

    // ==================== 处理文件附件 ====================
    if (currentFile) {
      try {
        // 解析文件（如 PDF 提取文本），界面显示"正在解析文件..."
        toolCallStatus.value = '正在解析文件...'
        const parsed = await parseFile(currentFile)
        toolCallStatus.value = ''

        // 将文件内容与用户文本拼接为增强消息，供 AI 理解文件内容
        const enrichedMessage = message
          ? `以下是我的心理测评报告内容：\n${parsed.content}\n\n我的问题是：${message}`
          : `以下是我的心理测评报告内容：\n${parsed.content}\n\n请根据报告内容与我对话`

        // 临时会话：需要先创建正式会话再发送
        if (currentSession.value?.status === 'TEMP') {
          await startNewSession(enrichedMessage)
          return
        }

        // 已有正式会话：直接追加用户消息、保存到后端、启动 AI 响应
        messages.value.push(createUserMessage(enrichedMessage))
        if (currentSession.value?.sessionId) {
          saveMessage(currentSession.value.sessionId, { senderType: 1, content: enrichedMessage }).catch(() => {})
        }
        startAIResponse(currentSession.value?.sessionId, enrichedMessage)
        return
      } catch (err) {
        // 文件解析失败：清空状态、提示用户，不发送消息
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
