import hyRequest from '@/service'

// ==================== 用户认证 ====================

/** 管理员登录 */
export function login(data: { username: string; password: string }) {
  return hyRequest.post({ url: '/user/login', data })
}

/** 退出登录 */
export function logout() {
  return hyRequest.post({ url: '/user/logout' })
}

// ==================== 知识文章管理 ====================

/** 获取分类树，用于文章编辑时的分类选择 */
export function categoryList() {
  return hyRequest.get({ url: '/knowledge/category/tree' })
}

/** 文章分页列表（支持 title/categoryId/status/keyword 筛选） */
export function articlePage(params: any) {
  return hyRequest.get({ url: '/knowledge/article/page', params })
}

/**
 * 上传文件（文章封面图）
 * @param file 文件对象
 * @param businessInfo 业务关联信息，businessId 关联文章 ID
 */
export function uploadFile(file: File, businessInfo: { businessId: string }) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('businessType', 'ARTICLE') // 业务类型：文章
  formData.append('businessId', businessInfo.businessId) // 关联业务 ID
  formData.append('businessField', 'cover') // 业务字段：封面

  return hyRequest.post({ url: '/file/upload', data: formData })
}

/** 创建文章 */
export function createArticle(data: any) {
  return hyRequest.post({ url: '/knowledge/article', data })
}

/** 获取文章详情 */
export function getArticleDetail(id: number) {
  return hyRequest.get({ url: `/knowledge/article/${id}` })
}

/** 更新文章内容 */
export function updateArticle(id: number, data: any) {
  return hyRequest.put({ url: `/knowledge/article/${id}`, data })
}

/** 修改文章状态（发布/下线） */
export function changeArticleStatus(id: number, data: any) {
  return hyRequest.put({ url: `/knowledge/article/${id}/status`, data })
}

/** 删除文章 */
export function deleteArticle(id: number) {
  return hyRequest.delete({ url: `/knowledge/article/${id}` })
}

/** 手动重建文章 RAG 索引 */
export function reindexArticle(id: number) {
  return hyRequest.post({ url: `/rag/articles/${id}/reindex` })
}

// ==================== 咨询会话管理 ====================

/** 咨询会话分页列表 */
export function getConsultationPage(params: any) {
  return hyRequest.get({ url: '/psychological-chat/sessions', params })
}

/** 获取会话详情（含完整消息记录） */
export function getSessionDetail(sessionId: string) {
  return hyRequest.get({ url: `/psychological-chat/sessions/${sessionId}/messages` })
}

// ==================== 情绪日记管理 ====================

/** 情绪日记分页列表（管理员查看所有用户日记） */
export function getEmotionalPage(params: any) {
  return hyRequest.get({ url: '/emotion-diary/admin/page', params })
}

/** 删除情绪日记 */
export function deleteEmotional(id: number) {
  return hyRequest.delete({ url: `/emotion-diary/admin/${id}` })
}

// ==================== 数据看板 ====================

/** 数据概览（用户数、文章数、预警数等统计） */
export function getAnalyticsOverview() {
  return hyRequest.get({ url: '/data-analytics/overview' })
}
