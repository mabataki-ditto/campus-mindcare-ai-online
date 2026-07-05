import { config } from '../config'
import type { RagReference } from './retrieve.service'

export function buildRagPrompt(question: string, references: RagReference[]) {
  const context = references
    .map((item) => `[${item.index}] 标题：${item.title}\n片段：${item.content}`)
    .join('\n\n')
    .slice(0, config.rag.maxContextChars)

  return `你是校园心理健康知识问答助手。
请优先依据参考资料回答用户问题。
如果参考资料不足，不要编造，请说明当前知识库没有找到充分依据。
涉及自伤、自杀、严重危机表达时，必须建议用户立即联系专业人员或紧急援助。

参考资料：
${context || '未检索到可用资料。'}

用户问题：${question}

回答要求：
- 回答准确、简洁、温和。
- 不要声称自己已经完成诊断。
- 如果使用了参考资料，答案末尾列出引用编号，例如：参考来源：[1][2]。
- 如果没有参考资料，不要列出引用。`
}
