import http from '@/utils/request'
export function getCategoryList() { return http.get('/knowledge/category/tree') }
export function getArticlePage(params?: any) { return http.get('/knowledge/article/page', { params }) }
export function getArticleDetail(id: number) { return http.get(`/knowledge/article/${id}`) }
export function searchKnowledge(keyword: string) { return http.get('/knowledge/article/search', { params: { keyword } }) }
