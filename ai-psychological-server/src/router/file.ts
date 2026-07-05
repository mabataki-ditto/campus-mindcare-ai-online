import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import { success, fail } from '../utils/response'
import { authMiddleware } from '../middleware/auth'
import { config } from '../config'

const router = Router()

// 允许上传的文件类型白名单
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]

// multer 存储配置
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const businessType = (req.body.businessType || 'other').toLowerCase()
    const dir = path.join(__dirname, '..', '..', config.upload.dir, businessType)
    // 如果目录不存在，自动创建（使用异步 fs.mkdir）
    try {
      await fs.access(dir)
    } catch {
      await fs.mkdir(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${uuidv4()}${ext}`)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: config.upload.maxSize },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}，仅允许 PDF 和常见文档格式`))
    }
  }
})


router.post('/upload', authMiddleware, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.json(fail('请选择文件'))
    }

    const businessType = (req.body.businessType || 'other').toLowerCase()
    const filePath = `/${config.upload.dir}/${businessType}/${req.file.filename}`

    return res.json(success({ filePath }, '上传成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

export { router as fileRouter }
