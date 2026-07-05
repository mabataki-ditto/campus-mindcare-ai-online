import crypto from 'crypto'

export interface TextChunk {
  chunkIndex: number
  content: string
  contentHash: string
}

const DEFAULT_CHUNK_SIZE = 700
const DEFAULT_OVERLAP = 100
const MIN_PARAGRAPH_LENGTH = 12

export function cleanArticleText(text: string) {
  return String(text || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function splitArticleIntoChunks(title: string, content: string, chunkSize = DEFAULT_CHUNK_SIZE, overlap = DEFAULT_OVERLAP): TextChunk[] {
  const cleaned = cleanArticleText(content)
  if (!cleaned) return []

  const paragraphs = cleaned
    .split(/\n+/)
    .map((item) => item.trim())
    .filter((item) => item.length >= MIN_PARAGRAPH_LENGTH)

  const chunks: string[] = []
  let current = ''

  for (const paragraph of paragraphs) {
    if (paragraph.length > chunkSize) {
      if (current) {
        chunks.push(current)
        current = ''
      }
      chunks.push(...splitLongText(paragraph, chunkSize, overlap))
      continue
    }

    const next = current ? `${current}\n${paragraph}` : paragraph
    if (next.length > chunkSize && current) {
      chunks.push(current)
      current = paragraph
    } else {
      current = next
    }
  }

  if (current) chunks.push(current)

  return chunks.map((chunk, index) => {
    const contentWithTitle = `文章标题：${title}\n片段内容：${chunk}`
    return {
      chunkIndex: index,
      content: contentWithTitle,
      contentHash: crypto.createHash('sha256').update(contentWithTitle).digest('hex')
    }
  })
}

function splitLongText(text: string, chunkSize: number, overlap: number) {
  const chunks: string[] = []
  const safeOverlap = Math.min(Math.max(overlap, 0), chunkSize - 1)
  const step = chunkSize - safeOverlap

  for (let start = 0; start < text.length; start += step) {
    chunks.push(text.slice(start, start + chunkSize))
  }

  return chunks
}
