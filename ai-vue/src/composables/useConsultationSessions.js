import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getSessionList, deleteSession, getSessionDetail } from '@/service/frontend/frontend'

export function useConsultationSessions() {
  const currentSession = ref(null)
  const sessionList = ref([])
  const messages = ref([])

  const createNewFrontendSession = () => {
    currentSession.value = {
      sessionId: `temp_${Date.now()}`,
      status: 'TEMP',
      sessionTitle: '新对话'
    }
    messages.value = []
  }

  const getSessionPage = async () => {
    const res = await getSessionList({
      pageNum: 1,
      pageSize: 10
    })
    sessionList.value = res.records || []
  }

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

  const handleDeleteSession = async (sessionId) => {
    await deleteSession(sessionId)
    ElMessage.success('删除成功')

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
