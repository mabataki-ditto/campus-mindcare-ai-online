import dotenv from 'dotenv'
dotenv.config()

export const config = {
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || (() => {
    console.warn('⚠️ JWT_SECRET 未配置，使用随机密钥。请在 .env 中设置 JWT_SECRET！')
    return require('crypto').randomBytes(32).toString('hex')
  })(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '2d',
  // DeepSeek API 配置
  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat'
  },
  embedding: {
    apiKey: process.env.EMBEDDING_API_KEY || '',
    baseUrl: process.env.EMBEDDING_BASE_URL || '',
    model: process.env.EMBEDDING_MODEL || '',
    dimension: Number(process.env.EMBEDDING_DIMENSION || 1024)
  },
  qdrant: {
    url: process.env.QDRANT_URL || 'http://localhost:6333',
    apiKey: process.env.QDRANT_API_KEY || '',
    collection: process.env.QDRANT_COLLECTION || 'campus_mindcare_knowledge'
  },
  rag: {
    topK: Number(process.env.RAG_TOP_K || 8),
    minScore: Number(process.env.RAG_MIN_SCORE || 0.35),
    maxContextChars: Number(process.env.RAG_MAX_CONTEXT_CHARS || 5000)
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxSize: Number(process.env.MAX_FILE_SIZE || 5242880)
  }
}
