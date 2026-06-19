import * as pdfjsLib from 'pdfjs-dist'

// 设置 PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.mjs', import.meta.url).toString()

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
 * 将图片文件转为 base64（用于 DeepSeek Vision）
 */
export async function imageToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * 根据文件类型选择解析方式
 */
export async function parseFile(file) {
  const type = file.type

  if (type === 'application/pdf') {
    const text = await parsePDF(file)
    return { type: 'text', content: text }
  }

  if (type.startsWith('image/')) {
    const base64 = await imageToBase64(file)
    return { type: 'image', content: base64 }
  }

  throw new Error('不支持的文件格式，仅支持 PDF 和图片')
}
