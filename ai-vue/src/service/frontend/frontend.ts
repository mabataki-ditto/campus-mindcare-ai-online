import hyRequest from '@/service'

interface IRegisterData {
  username: string
  password: string
  email?: string
  nickname?: string
  phone?: string
  gender?: number
  userType?: number
}

export function register(data: IRegisterData) {
  return hyRequest.post({ url: '/user/add', data })
}

export function startSession(data: { userId?: number }) {
  return hyRequest.post({ url: '/psychological-chat/session/start', data })
}

export function getSessionList(params?: { userId?: number; currentPage?: number; size?: number }) {
  return hyRequest.get({ url: '/psychological-chat/sessions', params })
}

export function deleteSession(sessionId: string) {
  return hyRequest.delete({ url: `/psychological-chat/sessions/${sessionId}` })
}

export function getSessionDetail(sessionId: string) {
  return hyRequest.get({ url: `/psychological-chat/sessions/${sessionId}/messages` })
}

export function saveMessage(sessionId: string, data: { senderType: number; content: string }) {
  return hyRequest.post({ url: `/psychological-chat/sessions/${sessionId}/messages`, data })
}

export function getSessionEmotion(sessionId: string, forceRefresh = false) {
  return hyRequest.get({
    url: `/psychological-chat/session/${sessionId}/emotion`,
    params: forceRefresh ? { forceRefresh: 'true' } : undefined
  })
}

export function addEmotionDiary(data: { moodScore: number; moodLabel: string; content: string }) {
  return hyRequest.post({ url: '/emotion-diary', data })
}

export function getKnowledgeList(params?: { currentPage?: number; size?: number; categoryId?: number; status?: number }) {
  return hyRequest.get({ url: '/knowledge/article/page', params })
}

export function getKnowledgeDetail(id: number) {
  return hyRequest.get({ url: `/knowledge/article/${id}` })
}