/**
 * 工具调用模块（Tool Calling）
 *
 * 职责：
 * 1. 声明可被 AI 调用的工具（toolDefinitions，发给 DeepSeek）
 * 2. 实现工具的具体执行逻辑（triggerAlert / searchKnowledgeBase）
 * 3. 通过 toolRegistry 注册表统一管理工具，新增工具无需改 executeToolCall
 *
 * 设计模式：注册表模式（Registry Pattern）
 *   - toolDefinitions：对外声明（给 AI 看）
 *   - toolRegistry：对内实现（给前端自己用）
 *   - executeToolCall：统一执行入口，只做"查表 → 执行"，对工具名称无感知
 */
import { reactive } from 'vue'
import hyRequest from '@/service'

// ==================== 预警状态（跨组件共享） ====================

// 使用函数延迟初始化，避免模块导入时立即创建 reactive 副作用
let _alertState = null
export const getAlertState = () => {
  if (!_alertState) {
    _alertState = reactive({
      visible: false, // 是否显示预警卡片
      riskLevel: 0, // 风险等级：1=关注, 2=预警, 3=危机
      reason: '' // 触发原因
    })
  }
  return _alertState
}

// 兼容旧代码的直接访问方式：通过 Proxy 代理到 getAlertState()
// 这样 alertState.visible = true 等写法仍可使用，同时享受延迟初始化
export const alertState = new Proxy(
  {},
  {
    get(_, key) {
      return getAlertState()[key]
    },
    set(_, key, value) {
      getAlertState()[key] = value
      return true
    }
  }
)

// ==================== 工具声明（发给 DeepSeek 的 tools 字段） ====================
//
// 这里的定义是给 AI 看的"工具说明书"：
//   - name:        工具唯一标识，AI 返回 tool_calls 时用这个名字
//   - description: AI 据此判断"该不该调"（语义匹配）
//   - parameters:  JSON Schema，约束 AI 生成参数的格式
//
// AI 根据用户输入语义匹配 description，自主决定是否调用、传什么参数。
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

export const alertToolDefinitions = toolDefinitions.filter((tool) => tool.function.name === 'triggerAlert')

// ==================== 工具执行实现 ====================

/**
 * 触发危机预警
 *
 * 执行流程：
 * 1. 更新响应式 alertState → 前端 AlertCard 组件自动弹出
 * 2. 上报后端 /psychological-chat/alert 持久化预警事件（供管理员查看）
 * 3. 返回结果给 AI，AI 会据此在后续回复中安抚用户
 *
 * @param {number} riskLevel - 风险等级 1/2/3
 * @param {string} reason    - 触发原因
 * @returns {{success: boolean, message: string}} 返回给 AI 的工具结果
 */
async function triggerAlert(riskLevel, reason) {
  // 1. 更新前端响应式状态 → 触发预警卡片显示
  alertState.visible = true
  alertState.riskLevel = riskLevel
  alertState.reason = reason

  // 2. 上报后端持久化预警事件（失败不阻塞，仅记录日志）
  try {
    await hyRequest.post({
      url: '/psychological-chat/alert',
      data: { riskLevel, reason, timestamp: Date.now() }
    })
  } catch (e) {
    console.error('预警记录上报失败', e)
  }

  // 3. 返回给 AI，AI 看到后会以温和方式安抚用户
  return { success: true, message: '预警已触发' }
}

/**
 * 知识库检索（RAG 核心）
 *
 * 执行流程：
 * 1. 调后端 /rag/retrieve 做向量语义检索
 * 2. 提取 chunk 片段作为事实依据
 * 3. 返回给 AI，AI 基于这些文章生成回答（减少幻觉）
 *
 * RAG 闭环：用户提问 → AI 决定检索 → 注入文章到上下文 → AI 有据可依地回答
 *
 * @param {string} query - 检索关键词（由 AI 从用户问题中提炼）
 * @returns {{found: boolean, articles?: Array, message?: string}}
 */
export async function searchKnowledgeBase(query) {
  try {
    const data = await hyRequest.post({
      url: '/rag/retrieve',
      data: { query, topK: 8 }
    })

    if (data?.records?.length > 0) {
      const articleMap = new Map()

      for (const record of data.records) {
        const current = articleMap.get(record.articleId)
        if (current) {
          current.contentParts.push(record.content)
          current.snippetParts.push(record.snippet)
          current.score = Math.max(current.score, record.score)
          continue
        }

        articleMap.set(record.articleId, {
          articleId: record.articleId,
          chunkId: record.chunkId,
          title: record.title,
          contentParts: [record.content],
          snippetParts: [record.snippet],
          score: record.score
        })

        if (articleMap.size >= 5) break
      }

      const groupedArticles = Array.from(articleMap.values())

      const references = groupedArticles.map((article, index) => ({
        index: index + 1,
        articleId: article.articleId,
        chunkId: article.chunkId,
        title: article.title,
        snippet: Array.from(new Set(article.snippetParts)).join(' ... '),
        score: article.score
      }))

      const articles = groupedArticles.map((article, index) => ({
        referenceIndex: index + 1,
        title: article.title,
        content: Array.from(new Set(article.contentParts)).join('\n\n'),
        score: article.score
      }))

      return { found: true, articles, references }
    }

    // 未检索到也明确告知，AI 会诚实回复"知识库暂无相关内容"
    return { found: false, references: [], message: '知识库中没有找到充分依据，请不要编造引用' }
  } catch (e) {
    return { found: false, references: [], message: '知识库检索失败，请不要声称已经查询知识库' }
  }
}

// ==================== 工具注册表（Registry Pattern 核心） ====================
//
// 注册表结构：{ 工具名: { execute: (args) => Promise<any> } }
//
// 扩展性收益：新增工具只需 3 步，零侵入主流程
//   1. 在 toolDefinitions 加声明（给 AI 看）
//   2. 写执行函数
//   3. 在 toolRegistry 注册一行
// executeToolCall 永远不用改。
const toolRegistry = {
  triggerAlert: {
    execute: (args) => triggerAlert(args.riskLevel, args.reason)
  },
  searchKnowledgeBase: {
    execute: (args) => searchKnowledgeBase(args.query)
  }
}

// ==================== 统一执行入口 ====================

/**
 * 执行工具调用（被 useToolCallLoop 调用）
 *
 * 只做三件事：解析参数 → 查注册表 → 执行
 * 对工具名称完全无感知，新增工具无需修改此函数。
 *
 * @param {Object} toolCall - DeepSeek 返回的工具调用对象
 *   { function: { name: string, arguments: string(JSON) } }
 * @returns {Promise<Object>} 工具执行结果，会被序列化为 role:'tool' 消息回填上下文
 */
export async function executeToolCall(toolCall) {
  const { name, arguments: argsStr } = toolCall.function
  try {
    const args = JSON.parse(argsStr) // AI 生成的是 JSON 字符串，需解析
    const tool = toolRegistry[name] // 查注册表
    if (!tool) return { error: `未知工具: ${name}` }
    return await tool.execute(args) // 执行对应工具
  } catch (e) {
    console.error('工具调用执行失败:', e)
    return { error: `工具调用失败: ${e.message}` }
  }
}
