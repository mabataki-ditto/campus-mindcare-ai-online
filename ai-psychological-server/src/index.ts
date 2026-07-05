import express from 'express'
import cors from 'cors'
import path from 'path'
import swaggerUi from 'swagger-ui-express'
import { config } from './config'
import { swaggerSpec } from './config/swagger'
import { errorHandler } from './middleware/error'
import { userRouter } from './router/user'
import { consultationRouter } from './router/consultation'
import { emotionDiaryRouter } from './router/emotion-diary'
import { knowledgeRouter } from './router/knowledge'
import { fileRouter } from './router/file'
import { analyticsRouter } from './router/analytics'
import { aiRouter } from './router/ai'
import { ragRouter } from './router/rag'

const app = express()

// 基础中间件
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'token']
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// 静态文件服务（文件上传目录）
app.use('/uploads', express.static(path.join(__dirname, '..', config.upload.dir)))

// Swagger API 文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customSiteTitle: '校园AI心理健康系统 API 文档',
  customCss: '.swagger-ui .topbar { display: none }'
}))

// Swagger JSON
app.get('/api-docs.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json')
  res.send(swaggerSpec)
})

// API 路由
app.use('/api/user', userRouter)
app.use('/api/psychological-chat', consultationRouter)
app.use('/api/emotion-diary', emotionDiaryRouter)
app.use('/api/knowledge', knowledgeRouter)
app.use('/api/file', fileRouter)
app.use('/api/data-analytics', analyticsRouter)
app.use('/api/ai', aiRouter)
app.use('/api/rag', ragRouter)

// 健康检查

app.get('/api/health', (req, res) => {
  res.json({ code: 200, msg: '服务运行正常', data: { timestamp: new Date().toISOString() } })
})

// 错误处理
app.use(errorHandler)

// 启动服务
const server = app.listen(config.port, () => {
  console.log(`🚀 服务器已启动: http://localhost:${config.port}`)
  console.log(`📋 健康检查: http://localhost:${config.port}/api/health`)
  console.log(`📖 API 文档: http://localhost:${config.port}/api-docs`)
})

server.on('error', (error: any) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`❌ 端口 ${config.port} 已被占用，请修改 PORT 环境变量或关闭占用进程`)
  } else {
    console.error('❌ 服务器启动失败:', error.message)
  }
  process.exit(1)
})

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...')
  server.close(() => process.exit(0))
})

process.on('SIGINT', () => {
  console.log('收到 SIGINT 信号，正在关闭服务器...')
  server.close(() => process.exit(0))
})
