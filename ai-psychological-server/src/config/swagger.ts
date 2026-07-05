import swaggerJsdoc from 'swagger-jsdoc'
import { config } from './index'

// OpenAPI 全局配置。具体接口说明集中放在 src/docs/swagger/**/*.ts。
const options: swaggerJsdoc.Options = {
  definition: {
    // OpenAPI 版本，Swagger UI、Postman 和 Apifox 都会读取这个规范。
    openapi: '3.0.0',
    // 文档基础信息，展示在 Swagger UI 顶部。
    info: {
      title: '校园AI心理健康咨询系统 API',
      version: '1.0.0',
      description: '集成知识文章、心理咨询、情绪日记、数据分析等功能的 RESTful API',
      contact: {
        name: 'ditto',
        email: '2350995770@qq.com'
      }
    },
    // 接口基础地址。router 里的注释不用写 /api 前缀，因为这里统一配置。
    servers: [
      {
        url: `http://localhost:${config.port}/api`,
        description: '开发环境'
      },
      {
        url: '/api',
        description: '生产环境'
      }
    ],
    // 公共认证方式和通用数据模型，供各个接口文档复用。
    components: {
      securitySchemes: {
        // 登录接口返回 JWT token，在 Swagger 的 Authorize 中填写 Bearer <token>。
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: '请在登录后获取 token，格式：Bearer {token}'
        }
      },
      // 通用模型。接口注释可以通过下面的方式引用：
      // $ref: '#/components/schemas/SchemaName'
      schemas: {
        SuccessResponse: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 200 },
            data: { type: 'object' },
            message: { type: 'string', example: 'success' }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            code: { type: 'number', example: 400 },
            message: { type: 'string', example: '错误信息' }
          }
        },
        User: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            username: { type: 'string' },
            nickname: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            gender: { type: 'number', enum: [0, 1, 2], description: '0-未知 1-男 2-女' },
            userType: { type: 'number', enum: [1, 2], description: '1-普通用户 2-管理员' },
            avatar: { type: 'string' },
            riskLevel: { type: 'number' },
            status: { type: 'number', enum: [0, 1], description: '0-禁用 1-启用' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Article: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            title: { type: 'string' },
            content: { type: 'string' },
            summary: { type: 'string' },
            coverImage: { type: 'string' },
            categoryId: { type: 'number' },
            categoryName: { type: 'string' },
            authorName: { type: 'string' },
            readCount: { type: 'number' },
            status: { type: 'number', enum: [0, 1, 2], description: '0-草稿 1-已发布 2-已下线' },
            tags: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Session: {
          type: 'object',
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
            userId: { type: 'number' },
            lastMessageTime: { type: 'string', format: 'date-time' },
            messageCount: { type: 'number' },
            status: { type: 'number', enum: [0, 1], description: '0-进行中 1-已结束' }
          }
        },
        Message: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            sessionId: { type: 'string' },
            senderType: { type: 'number', enum: [0, 1], description: '0-用户 1-AI' },
            content: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        EmotionDiary: {
          type: 'object',
          properties: {
            id: { type: 'number' },
            userId: { type: 'number' },
            moodScore: { type: 'number', minimum: 1, maximum: 10 },
            moodLabel: { type: 'string' },
            content: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        }
      }
    },
    // 默认所有接口都需要 JWT 鉴权；公开接口可在注释里用 security: [] 覆盖。
    security: [{ bearerAuth: [] }]
  },
  // 扫描这些文件中的 JSDoc @swagger 注释。
  apis: ['./src/docs/swagger/**/*.ts']
}

// 生成后的 OpenAPI 文档对象，供 /api-docs 和 /api-docs.json 使用。
export const swaggerSpec = swaggerJsdoc(options)
