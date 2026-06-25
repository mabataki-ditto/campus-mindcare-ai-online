import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getSessionList, deleteSession, getSessionDetail } from '@/service/frontend/frontend'

/**
 * 会话管理 Composable
 *
 * 提供心理咨询会话的状态管理和操作：
 * - currentSession  当前会话（TEMP 临时态 / ACTIVE 正式态）
 * - sessionList     左侧会话列表
 * - messages        当前会话的消息数组
 *
 * 核心方法：
 * - createNewFrontendSession  进入"新对话"临时态（不立即请求后端）
 * - getSessionPage            加载会话列表
 * - handleSessionClick        切换会话（加载历史消息 + 情绪分析）
 * - handleDeleteSession       删除会话（删当前会话时自动回到临时态）
 *
 * TEMP 会话设计：用户点"新建会话"时不立即请求后端，避免产生空会话；
 * 只有在发送第一条消息时才由 useConsultationStream 调用 startSession 创建真实会话。
 */
export function useConsultationSessions() {
  const currentSession = ref(null)
  const sessionList = ref([])
  const messages = ref([])

  /**
   * 进入"新对话"临时态
   *
   * 创建一个 TEMP 状态的临时会话对象（sessionId 为 temp_ 前缀），
   * 不请求后端。真正创建会话的时机由 useConsultationStream.startNewSession 控制。
   */
  const createNewFrontendSession = () => {
    currentSession.value = {
      sessionId: `temp_${Date.now()}`,
      status: 'TEMP',
      sessionTitle: '新对话'
    }
    messages.value = []
  }

  /**
   * 加载会话列表（固定取前 10 条）
   */
  const getSessionPage = async () => {
    const res = await getSessionList({
      pageNum: 1,
      pageSize: 10
    })
    sessionList.value = res.records || []
  }

  /**
   * 切换会话
   *
   * 流程：加载历史消息 → 加载该会话的情绪分析 → 更新 currentSession 为 ACTIVE
   *
   * @param {Object} session 会话对象（来自 sessionList）
   * @param {Function} loadSessionEmotion 加载情绪分析的函数（由 useConsultationEmotion 提供）
   */
  const handleSessionClick = async (session, loadSessionEmotion) => {
    const res = await getSessionDetail(session.id)
    messages.value = res || []

    await loadSessionEmotion(session.id)

    currentSession.value = {
      sessionId: session.id,
      status: 'ACTIVE',
      sessionTitle: session.sessionTitle
    }
  }

  /**
   * 删除会话
   *
   * 删除后若删的是当前会话，自动回到 TEMP 临时态，并刷新会话列表。
   *
   * @param {string|number} sessionId 会话 ID
   */
  const handleDeleteSession = async (sessionId) => {
    await deleteSession(sessionId)
    ElMessage.success('删除成功')

    // 删除的是当前会话 → 回到"新对话"临时态
    if (currentSession.value?.sessionId === sessionId) {
      createNewFrontendSession()
    }

    await getSessionPage()
  }

  return {
    currentSession,
    sessionList,
    messages,
    createNewFrontendSession,
    getSessionPage,
    handleSessionClick,
    handleDeleteSession
  }
}
