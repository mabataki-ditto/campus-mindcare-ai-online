import * as pdfjsLib from 'pdfjs-dist'
// 使用 ?url 后缀让 Vite 正确处理 worker 文件，避免 MIME 类型错误
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/**
 * 解析 PDF 文件，提取文本内容
 */
export async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
  let fullText = ''

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const pageText = textContent.items.map((item) => item.str).join(' ')
    fullText += `\n--- 第${i}页 ---\n${pageText}`
  }

  return fullText.trim()
}

/**
 * 解析文件，目前仅支持 PDF
 */
export async function parseFile(file) {
  if (file.type === 'application/pdf') {
    const text = await parsePDF(file)
    return { type: 'text', content: text }
  }

  throw new Error('不支持的文件格式，仅支持 PDF')
}
