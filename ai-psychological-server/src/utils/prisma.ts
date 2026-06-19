import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'

if (!process.env.DATABASE_PASSWORD) {
  console.warn('⚠️ DATABASE_PASSWORD 未配置，使用默认密码。请在 .env 中设置！')
}

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST || 'localhost',
  port: Number(process.env.DATABASE_PORT) || 3306,
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '12345',
  database: process.env.DATABASE_NAME || 'ai_psychological',
  connectionLimit: 5
})

const prisma = new PrismaClient({ adapter })

export default prisma