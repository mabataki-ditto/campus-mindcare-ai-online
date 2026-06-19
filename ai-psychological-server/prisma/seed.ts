import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

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

async function main() {
  console.log('开始种子数据初始化...')

  // 检查管理员是否存在
  const existingAdmin = await prisma.user.findUnique({ where: { username: 'admin' } })
  if (!existingAdmin) {
    const adminPassword = await bcrypt.hash('admin123', 10)
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: adminPassword,
        nickname: '管理员',
        email: 'admin@example.com',
        userType: 2,
        status: 1
      }
    })
    console.log('管理员账号创建成功:', admin.username)
  } else {
    console.log('管理员账号已存在')
  }

  // 检查普通用户是否存在
  const existingUser = await prisma.user.findUnique({ where: { username: 'student1' } })
  if (!existingUser) {
    const userPassword = await bcrypt.hash('user123', 10)
    const user = await prisma.user.create({
      data: {
        username: 'student1',
        password: userPassword,
        nickname: '小明',
        email: 'student1@example.com',
        userType: 1,
        status: 1
      }
    })
    console.log('普通用户账号创建成功:', user.username)
  } else {
    console.log('普通用户账号已存在')
  }

  // 检查角色是否存在
  const existingAdminRole = await prisma.role.findUnique({ where: { code: 'admin' } })
  if (!existingAdminRole) {
    const adminRole = await prisma.role.create({
      data: { name: '管理员', code: 'admin', desc: '系统管理员角色', status: 1 }
    })
    console.log('管理员角色创建成功:', adminRole.name)
  }

  const existingUserRole = await prisma.role.findUnique({ where: { code: 'user' } })
  if (!existingUserRole) {
    const userRole = await prisma.role.create({
      data: { name: '普通用户', code: 'user', desc: '普通用户角色', status: 1 }
    })
    console.log('普通用户角色创建成功:', userRole.name)
  }

  // 获取用户和角色
  const admin = await prisma.user.findUnique({ where: { username: 'admin' } })
  const student = await prisma.user.findUnique({ where: { username: 'student1' } })
  const adminRole = await prisma.role.findUnique({ where: { code: 'admin' } })
  const userRole = await prisma.role.findUnique({ where: { code: 'user' } })

  // 分配角色
  if (admin && adminRole) {
    const existingUserRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } }
    })
    if (!existingUserRole) {
      await prisma.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } })
      console.log('管理员角色分配成功')
    }
  }

  if (student && userRole) {
    const existingUserRole = await prisma.userRole.findUnique({
      where: { userId_roleId: { userId: student.id, roleId: userRole.id } }
    })
    if (!existingUserRole) {
      await prisma.userRole.create({ data: { userId: student.id, roleId: userRole.id } })
      console.log('普通用户角色分配成功')
    }
  }

  // 创建菜单
  const menuData = [
    { name: '数据分析', type: 1, icon: 'Odometer', path: '/main/dashboard', sort: 1, parentId: 0 },
    { name: '知识文章', type: 1, icon: 'Reading', path: '/main/knowledge', sort: 2, parentId: 0 },
    { name: 'AI陪伴记录', type: 1, icon: 'ChatDotRound', path: '/main/consultation', sort: 3, parentId: 0 },
    { name: '心情档案', type: 1, icon: 'Sunrise', path: '/main/emotional', sort: 4, parentId: 0 }
  ]

  for (const menu of menuData) {
    const existing = await prisma.menu.findFirst({ where: { name: menu.name } })
    if (!existing) {
      await prisma.menu.create({ data: menu })
      console.log('菜单创建成功:', menu.name)
    }
  }

  // 分配菜单给管理员角色
  if (adminRole) {
    const allMenus = await prisma.menu.findMany()
    for (const menu of allMenus) {
      const existing = await prisma.roleMenu.findUnique({
        where: { roleId_menuId: { roleId: adminRole.id, menuId: menu.id } }
      })
      if (!existing) {
        await prisma.roleMenu.create({ data: { roleId: adminRole.id, menuId: menu.id } })
      }
    }
    console.log('菜单分配成功')
  }

  // 创建知识库分类
  const categories = [
    { categoryName: '情绪管理', sort: 1, parentId: 0, status: 1 },
    { categoryName: '压力应对', sort: 2, parentId: 0, status: 1 },
    { categoryName: '人际关系', sort: 3, parentId: 0, status: 1 },
    { categoryName: '学业心理', sort: 4, parentId: 0, status: 1 },
    { categoryName: '自我成长', sort: 5, parentId: 0, status: 1 }
  ]

  for (const cat of categories) {
    const existing = await prisma.knowledgeCategory.findFirst({ where: { categoryName: cat.categoryName } })
    if (!existing) {
      await prisma.knowledgeCategory.create({ data: cat })
      console.log('分类创建成功:', cat.categoryName)
    }
  }

  console.log('\n种子数据初始化完成！')
  console.log('可用账号：')
  console.log('管理员: admin / admin123')
  console.log('普通用户: student1 / user123')
}

main()
  .catch((e) => {
    console.error('种子数据初始化失败:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })