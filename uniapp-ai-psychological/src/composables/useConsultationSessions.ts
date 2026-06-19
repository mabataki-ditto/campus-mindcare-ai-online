import { ref } from 'vue'
import { getSessionList, deleteSession, getSessionDetail } from '@/api/consultation'

interface SessionInfo {
  sessionId: string | number
  status: string
  sessionTitle: string
}

export function useConsultationSessions() {
  const currentSession = ref<SessionInfo | null>(null)
  const sessionList = ref<any[]>([])
  const messages = ref<any[]>([])

  const createNewFrontendSession = () => {
    currentSession.value = { sessionId: `temp_${Date.now()}`, status: 'TEMP', sessionTitle: '新对话' }
    messages.value = []
  }

  const getSessionPage = async () => {
    try {
      const res: any = await getSessionList({ pageNum: 1, pageSize: 10 })
      sessionList.value = res.records || []
    } catch (e) {
      console.error('获取会话列表失败:', e)
      uni.showToast({ title: '获取会话列表失败', icon: 'none' })
    }
  }

  const handleSessionClick = async (session: any, loadSessionEmotion: Function) => {
    try {
      const res: any = await getSessionDetail(session.id)
      messages.value = res || []
      await loadSessionEmotion(session.id)
      currentSession.value = { sessionId: session.id, status: 'ACTIVE', sessionTitle: session.sessionTitle }
    } catch (e) {
      console.error('加载会话失败:', e)
      uni.showToast({ title: '加载会话失败', icon: 'none' })
    }
  }

  const handleDeleteSession = async (sessionId: number) => {
    try {
      await deleteSession(sessionId)
      uni.showToast({ title: '删除成功', icon: 'success' })
      if (currentSession.value?.sessionId === sessionId) createNewFrontendSession()
      await getSessionPage()
    } catch (e) {
      console.error('删除会话失败:', e)
      uni.showToast({ title: '删除失败', icon: 'none' })
    }
  }

  return { currentSession, sessionList, messages, createNewFrontendSession, getSessionPage, handleSessionClick, handleDeleteSession }
}
