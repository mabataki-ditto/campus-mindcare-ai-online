import { reactive } from 'vue'
import hyRequest from '@/service'

// 预警状态（使用函数延迟初始化，避免模块导入时立即创建副作用）
let _alertState = null
export const getAlertState = () => {
  if (!_alertState) {
    _alertState = reactive({
      visible: false,
      riskLevel: 0,
      reason: ''
    })
  }
  return _alertState
}

// 兼容旧代码的直接访问方式
export const alertState = new Proxy({}, {
  get(_, key) {
    return getAlertState()[key]
  },
  set(_, key, value) {
    getAlertState()[key] = value
    return true
  }
})

// 工具定义（用于 API 请求体的 tools 字段）
export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'triggerAlert',
      description: '当用户表达自伤、自杀或极度负面情绪时触发预警',
      parameters: {
        type: 'object',
        properties: {
          riskLevel: {
            type: 'integer',
            enum: [1, 2, 3],
            description: '风险等级：1=关注, 2=预警, 3=危机'
          },
          reason: {
            type: 'string',
            description: '触发预警的原因摘要'
          }
        },
        required: ['riskLevel', 'reason']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'searchKnowledgeBase',
      description: '根据用户问题检索心理健康知识库中的相关文章',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: '检索关键词'
          }
        },
        required: ['query']
      }
    }
  }
]

// 触发预警
async function triggerAlert(riskLevel, reason) {
  alertState.visible = true
  alertState.riskLevel = riskLevel
  alertState.reason = reason

  // 同步调用后端接口，记录预警事件
  try {
    await hyRequest.post({
      url: '/psychological-chat/alert',
      data: { riskLevel, reason, timestamp: Date.now() }
    })
  } catch (e) {
    console.error('预警记录上报失败', e)
  }

  return { success: true, message: '预警已触发' }
}

// 知识库检索
async function searchKnowledgeBase(query) {
  try {
    const data = await hyRequest.get({
      url: '/knowledge/article/search',
      params: { keyword: query }
    })

    if (data?.list?.length > 0) {
      const results = data.list.slice(0, 3).map((article) => ({
        title: article.title,
        summary: article.summary || article.content?.substring(0, 200)
      }))
      return { found: true, articles: results }
    }

    return { found: false, message: '未找到相关知识库文章' }
  } catch (e) {
    return { found: false, message: '知识库检索失败' }
  }
}

// 工具注册表 — 所有可被模型调用的函数在此注册
const toolRegistry = {
  triggerAlert: {
    execute: (args) => triggerAlert(args.riskLevel, args.reason)
  },
  searchKnowledgeBase: {
    execute: (args) => searchKnowledgeBase(args.query)
  }
}

// 执行工具调用
export async function executeToolCall(toolCall) {
  const { name, arguments: argsStr } = toolCall.function
  try {
    const args = JSON.parse(argsStr)
    const tool = toolRegistry[name]
    if (!tool) return { error: `未知工具: ${name}` }
    return await tool.execute(args)
  } catch (e) {
    console.error('工具调用执行失败:', e)
    return { error: `工具调用失败: ${e.message}` }
  }
}
