import { reactive } from 'vue'
import { createAlert } from '@/api/consultation'
import { searchKnowledge } from '@/api/knowledge'

// 预警状态（全局响应式）
export const alertState = reactive({ visible: false, riskLevel: 0, reason: '' })

export const toolDefinitions = [
  { type: 'function' as const, function: { name: 'triggerAlert', description: '当用户表达自伤、自杀或极度负面情绪时触发预警', parameters: { type: 'object' as const, properties: { riskLevel: { type: 'integer' as const, enum: [1, 2, 3], description: '风险等级：1=关注, 2=预警, 3=危机' }, reason: { type: 'string' as const, description: '触发预警的原因摘要' } }, required: ['riskLevel', 'reason'] } } },
  { type: 'function' as const, function: { name: 'searchKnowledgeBase', description: '根据用户问题检索心理健康知识库中的相关文章', parameters: { type: 'object' as const, properties: { query: { type: 'string' as const, description: '检索关键词' } }, required: ['query'] } } }
]

async function triggerAlert(riskLevel: number, reason: string) {
  alertState.visible = true; alertState.riskLevel = riskLevel; alertState.reason = reason
  try { await createAlert({ riskLevel, reason, timestamp: Date.now() }) } catch (e) { console.error('预警记录上报失败', e) }
  return { success: true, message: '预警已触发' }
}

async function searchKnowledgeBase(query: string) {
  try {
    const data: any = await searchKnowledge(query)
    const list = data?.list || data?.records || (Array.isArray(data) ? data : [])
    if (list.length > 0) {
      const results = list.slice(0, 3).map((a: any) => ({ title: a.title, summary: a.summary || a.content?.substring(0, 200) }))
      return { found: true, articles: results }
    }
    return { found: false, message: '未找到相关知识库文章' }
  } catch (e) { return { found: false, message: '知识库检索失败' } }
}

const toolRegistry: Record<string, any> = { triggerAlert: { execute: (args: any) => triggerAlert(args.riskLevel, args.reason) }, searchKnowledgeBase: { execute: (args: any) => searchKnowledgeBase(args.query) } }

export async function executeToolCall(toolCall: any) {
  const { name, arguments: argsStr } = toolCall.function
  try {
    const args = JSON.parse(argsStr)
    const tool = toolRegistry[name]
    if (!tool) return { error: `未知工具: ${name}` }
    return await tool.execute(args)
  } catch (e: any) { return { error: `工具调用失败: ${e.message}` } }
}
