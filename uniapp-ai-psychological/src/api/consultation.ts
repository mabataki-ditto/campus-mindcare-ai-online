import http from '@/utils/request'

interface SessionStartParams {
  initialMessage?: string
  sessionTitle?: string
}

interface SaveMessageParams {
  senderType: number
  content: string
}

interface AlertParams {
  riskLevel: number
  reason: string
  timestamp?: number
}

export function startSession(data: SessionStartParams) { return http.post('/psychological-chat/session/start', data) }
export function getSessionList(params?: Record<string, any>) { return http.get('/psychological-chat/sessions', { params }) }
export function deleteSession(sessionId: number) { return http.delete(`/psychological-chat/sessions/${sessionId}`) }
export function getSessionDetail(sessionId: number) { return http.get(`/psychological-chat/sessions/${sessionId}/messages`) }
export function saveMessage(sessionId: string | number, data: SaveMessageParams) { return http.post(`/psychological-chat/sessions/${sessionId}/messages`, data) }
export function getSessionEmotion(sessionId: string | number, forceRefresh?: boolean) { return http.get(`/psychological-chat/session/${sessionId}/emotion`, forceRefresh ? { params: { forceRefresh: 'true' } } : undefined) }
export function createAlert(data: AlertParams) { return http.post('/psychological-chat/alert', data) }
