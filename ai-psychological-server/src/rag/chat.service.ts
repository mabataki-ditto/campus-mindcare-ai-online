import { config } from '../config'
import { buildRagPrompt } from './prompt'
import { retrieveKnowledge } from './retrieve.service'

export async function answerWithRag(question: string) {
  const references = await retrieveKnowledge(question)
  const prompt = buildRagPrompt(question, references.slice(0, 5))

  if (!config.deepseek.apiKey) {
    throw new Error('DeepSeek API Key 未配置')
  }

  const response = await fetch(`${config.deepseek.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.deepseek.apiKey}`
    },
    body: JSON.stringify({
      model: config.deepseek.model,
      messages: [
        { role: 'system', content: '你是专业、温和、谨慎的校园心理健康知识问答助手。' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      stream: false
    })
  })

  if (!response.ok) {
    throw new Error(`DeepSeek API 请求失败: ${response.status}`)
  }

  const data = (await response.json()) as any
  return {
    answer: data.choices?.[0]?.message?.content || '',
    references
  }
}
