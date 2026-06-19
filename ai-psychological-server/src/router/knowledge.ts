import { Router, Request, Response } from 'express'
import prisma from '../utils/prisma'
import { success, fail } from '../utils/response'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

const router = Router()

/**
 * @swagger
 * /knowledge/category/tree:
 *   get:
 *     tags: [知识文章]
 *     summary: 获取文章分类树
 *     description: 返回树形结构的文章分类
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: number, example: 200 }
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: number }
 *                       categoryName: { type: string }
 *                       parentId: { type: number }
 *                       children: { type: array }
 */
router.get('/category/tree', authMiddleware, async (req: Request, res: Response) => {
  try {
    const categories = await prisma.knowledgeCategory.findMany({
      where: { status: 1 },
      orderBy: { sort: 'asc' }
    })

    // 构建树形结构
    const tree = categories
      .filter(c => c.parentId === 0)
      .map(c => ({
        id: c.id,
        categoryName: c.categoryName,
        parentId: c.parentId,
        children: categories
          .filter(child => child.parentId === c.id)
          .map(child => ({
            id: child.id,
            categoryName: child.categoryName,
            parentId: child.parentId,
            children: []
          }))
      }))

    return res.json(success(tree, '查询成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

/**
 * @swagger
 * /knowledge/article/page:
 *   get:
 *     tags: [知识文章]
 *     summary: 分页查询文章
 *     parameters:
 *       - in: query
 *         name: currentPage
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: number, default: 10 }
 *       - in: query
 *         name: title
 *         schema: { type: string }
 *         description: 文章标题关键词
 *       - in: query
 *         name: categoryId
 *         schema: { type: number }
 *       - in: query
 *         name: status
 *         schema: { type: number, enum: [0, 1, 2] }
 *         description: 0-草稿 1-已发布 2-已下线
 *     responses:
 *       200:
 *         description: 查询成功
 */
router.get('/article/page', authMiddleware, async (req: Request, res: Response) => {
  try {
    const page = Number(req.query.currentPage || req.query.pageNum || 1)
    const size = Number(req.query.size || req.query.pageSize || 10)
    const title = req.query.title as string
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined
    const status = req.query.status !== undefined && req.query.status !== '' ? Number(req.query.status) : undefined
    const keyword = req.query.keyword as string
    const sortField = req.query.sortField as string
    const sortDirection = (req.query.sortDirection as string) || 'desc'

    const where: Record<string, any> = {}
    if (status !== undefined) where.status = status
    if (categoryId) where.categoryId = categoryId
    // keyword 搜索：同时匹配标题和内容，与 title 独立组合
    if (keyword) {
      const orConditions: any[] = [
        { title: { contains: keyword } },
        { content: { contains: keyword } }
      ]
      if (title) {
        // 有关键词又有标题时：keyword 匹配标题或内容，且标题也包含 title
        where.AND = [
          { title: { contains: title } },
          { OR: orConditions }
        ]
      } else {
        where.OR = orConditions
      }
    } else if (title) {
      where.title = { contains: title }
    }

    const orderBy: any = {}
    if (sortField === 'readCount') {
      orderBy.readCount = sortDirection === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    const [records, total] = await Promise.all([
      prisma.knowledgeArticle.findMany({
        where,
        include: { category: { select: { categoryName: true } } },
        orderBy,
        skip: (page - 1) * size,
        take: size
      }),
      prisma.knowledgeArticle.count({ where })
    ])

    const formattedRecords = records.map((article) => ({
      id: article.id,
      title: article.title,
      coverImage: article.coverImage,
      categoryId: article.categoryId,
      categoryName: article.category?.categoryName || '',
      authorName: article.authorName || '管理员',
      readCount: article.readCount,
      status: article.status,
      updatedAt: article.updatedAt
    }))

    return res.json(success({ records: formattedRecords, total }, '查询成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// GET /api/knowledge/article/:id — 文章详情
router.get('/article/:id', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const article = await prisma.knowledgeArticle.update({
      where: { id: Number(id) },
      data: { readCount: { increment: 1 } },
      include: { category: { select: { categoryName: true } } }
    })

    // 非管理员不能查看已下线或草稿状态的文章
    if (article.status !== 1 && req.user?.userType !== 2) {
      return res.json(fail('该文章已下线', 404))
    }

    return res.json(success({
      id: article.id,
      title: article.title,
      content: article.content,
      summary: article.summary,
      coverImage: article.coverImage,
      categoryName: article.category?.categoryName || '',
      authorName: article.authorName,
      readCount: article.readCount,
      updatedAt: article.updatedAt,
      tagArray: article.tags ? article.tags.split(',').filter(Boolean) : []
    }, '查询成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// POST /api/knowledge/article — 创建文章
router.post('/article', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, content, summary, coverImage, categoryId, tags, authorName } = req.body

    if (!title || !content || !categoryId) {
      return res.json(fail('标题、内容和分类不能为空'))
    }

    // 获取当前用户信息作为默认作者
    let finalAuthorName = authorName
    if (!finalAuthorName && req.user) {
      const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
      finalAuthorName = user?.nickname || user?.username || '管理员'
    }

    const article = await prisma.knowledgeArticle.create({
      data: { title, content, summary, coverImage, categoryId: Number(categoryId), tags, authorName: finalAuthorName || '管理员' }
    })

    return res.json(success({ id: article.id }, '创建成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// PUT /api/knowledge/article/:id — 更新文章
router.put('/article/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, content, summary, coverImage, categoryId, tags } = req.body

    await prisma.knowledgeArticle.update({
      where: { id: Number(id) },
      data: { title, content, summary, coverImage, categoryId: categoryId ? Number(categoryId) : undefined, tags }
    })

    return res.json(success(null, '更新成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// PUT /api/knowledge/article/:id/status — 变更文章状态
router.put('/article/:id/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    await prisma.knowledgeArticle.update({
      where: { id: Number(id) },
      data: { status: Number(status) }
    })

    return res.json(success(null, '状态更新成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// DELETE /api/knowledge/article/:id — 删除文章
router.delete('/article/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    await prisma.knowledgeArticle.delete({ where: { id: Number(id) } })

    return res.json(success(null, '删除成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

export { router as knowledgeRouter }
