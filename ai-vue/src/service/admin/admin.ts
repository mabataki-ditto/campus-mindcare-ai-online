import hyRequest from '@/service'

export function login(data: { username: string; password: string }) {
  return hyRequest.post({ url: '/user/login', data })
}

export function categoryTree() {
  return hyRequest.get({ url: '/knowledge/category/tree' })
}

export function articlePage(params: any) {
  return hyRequest.get({ url: '/knowledge/article/page', params })
}

export function uploadFile(file: File, businessInfo: { businessId: string }) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('businessType', 'ARTICLE')
  formData.append('businessId', businessInfo.businessId)
  formData.append('businessField', 'cover')
  
  return hyRequest.post({ url: '/file/upload', data: formData })
}

export function createArticle(data: any) {
  return hyRequest.post({ url: '/knowledge/article', data })
}

export function getArticleDetail(id: number) {
  return hyRequest.get({ url: `/knowledge/article/${id}` })
}

export function updateArticle(id: number, data: any) {
  return hyRequest.put({ url: `/knowledge/article/${id}`, data })
}

export function changeArticleStatus(id: number, data: any) {
  return hyRequest.put({ url: `/knowledge/article/${id}/status`, data })
}

export function deleteArticle(id: number) {
  return hyRequest.delete({ url: `/knowledge/article/${id}` })
}

export function getConsultationPage(params: any) {
  return hyRequest.get({ url: '/psychological-chat/sessions', params })
}

export function getSessionDetail(sessionId: string) {
  return hyRequest.get({ url: `/psychological-chat/sessions/${sessionId}/messages` })
}

export function getEmotionalPage(params: any) {
  return hyRequest.get({ url: '/emotion-diary/admin/page', params })
}

export function deleteEmotional(id: number) {
  return hyRequest.delete({ url: `/emotion-diary/admin/${id}` })
}

export function getAnalyticsOverview() {
  return hyRequest.get({ url: '/data-analytics/overview' })
}

export function logout() {
  return hyRequest.post({ url: '/user/logout' })
}