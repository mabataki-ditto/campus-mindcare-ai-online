import { Router, Request, Response } from 'express'
import prisma from '../utils/prisma'
import { success, fail } from '../utils/response'
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth'
import { deleteArticleIndex, syncArticleRagIndex } from '../rag/index.service'

const router = Router()

// GET /api/knowledge/category/tree — 一级分类列表（用于后台文章编辑的分类下拉框）
router.get('/category/tree', optionalAuthMiddleware, async (_req: Request, res: Response) => {
  try {
    // 只查启用的顶级分类（parentId=0），前端目前不需要子分类
    const categories = await prisma.knowledgeCategory.findMany({
      where: { status: 1, parentId: 0 },
      orderBy: { sort: 'asc' }
    })

    const list = categories.map((category) => ({
      id: category.id,
      categoryName: category.categoryName,
      parentId: category.parentId
    }))

    return res.json(success(list, '查询成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// GET /api/knowledge/article/page — 文章分页列表（前台浏览 + 后台管理 + RAG 检索共用）
router.get('/article/page', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    // 兼容多种分页参数命名（前台用 currentPage/size，后台用 pageNum/pageSize）
    const page = Number(req.query.currentPage || req.query.pageNum || 1)
    const size = Number(req.query.size || req.query.pageSize || 10)
    const title = req.query.title as string
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined
    const status = req.query.status !== undefined && req.query.status !== '' ? Number(req.query.status) : undefined
    const keyword = req.query.keyword as string
    const sortField = req.query.sortField as string
    const sortDirection = (req.query.sortDirection as string) || 'desc'

    // 构建查询条件：status/categoryId/title/keyword 可独立或组合筛选
    const where: Record<string, any> = {}
    if (status !== undefined) where.status = status
    if (categoryId) where.categoryId = categoryId

    // keyword 搜索：同时匹配标题和内容，与 title 独立组合
    if (keyword) {
      const orConditions: any[] = [{ title: { contains: keyword } }, { content: { contains: keyword } }]
      if (title) {
        // 有关键词又有标题时：keyword 匹配标题或内容，且标题也包含 title
        where.AND = [{ title: { contains: title } }, { OR: orConditions }]
      } else {
        where.OR = orConditions
      }
    } else if (title) {
      where.title = { contains: title }
    }

    // 排序：支持按阅读量或创建时间，默认按创建时间倒序
    const orderBy: any = {}
    if (sortField === 'readCount') {
      orderBy.readCount = sortDirection === 'asc' ? 'asc' : 'desc'
    } else {
      orderBy.createdAt = 'desc'
    }

    // 并行查询数据列表和总数，避免两次串行请求
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

    // 格式化返回：只暴露列表页需要的字段，content 不返回（避免大文本传输）
    const formattedRecords = records.map((article) => ({
      id: article.id,
      title: article.title,
      coverImage: article.coverImage,
      categoryId: article.categoryId,
      categoryName: article.category?.categoryName || '',
      authorName: article.authorName || 'Admin',
      readCount: article.readCount,
      status: article.status,
      ragIndexStatus: (article as any).ragIndexStatus || 'PENDING',
      ragIndexedAt: (article as any).ragIndexedAt,
      ragIndexError: (article as any).ragIndexError,
      updatedAt: article.updatedAt
    }))

    return res.json(success({ records: formattedRecords, total }, '查询成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// GET /api/knowledge/article/:id — 文章详情（浏览时自动 +1 阅读量）
router.get('/article/:id', optionalAuthMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    // 查询详情的同时递增阅读量（原子操作，避免并发问题）
    const article = await prisma.knowledgeArticle.update({
      where: { id: Number(id) },
      data: { readCount: { increment: 1 } },
      include: { category: { select: { categoryName: true } } }
    })

    // 权限控制：非管理员不能查看已下线或草稿状态的文章
    if (article.status !== 1 && req.user?.userType !== 2) {
      return res.json(fail('该文章已下线', 404))
    }

    return res.json(
      success(
        {
          id: article.id,
          title: article.title,
          content: article.content,
          summary: article.summary,
          coverImage: article.coverImage,
          categoryName: article.category?.categoryName || '',
          authorName: article.authorName,
          readCount: article.readCount,
          updatedAt: article.updatedAt,
          tagArray: article.tags ? article.tags.split(',').filter(Boolean) : [] // 逗号分隔的 tags → 数组
        },
        '查询成功'
      )
    )
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// POST /api/knowledge/article — 创建文章（仅管理员）
router.post('/article', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { title, content, summary, coverImage, categoryId, tags, authorName } = req.body

    if (!title || !content || !categoryId) {
      return res.json(fail('标题、内容和分类不能为空'))
    }

    // 作者名：前端传入优先，否则从当前登录用户信息中获取，最终兜底 'Admin'
    let finalAuthorName = authorName
    if (!finalAuthorName && req.user) {
      const user = await prisma.user.findUnique({
        where: { id: req.user.userId }
      })
      finalAuthorName = user?.nickname || user?.username || 'Admin'
    }

    const article = await prisma.knowledgeArticle.create({
      data: {
        title,
        content,
        summary,
        coverImage,
        categoryId: Number(categoryId),
        tags,
        authorName: finalAuthorName || 'Admin'
      }
    })

    return res.json(success({ id: article.id }, '创建成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// PUT /api/knowledge/article/:id — 更新文章内容（仅管理员）
router.put('/article/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { title, content, summary, coverImage, categoryId, tags } = req.body

    const article = await prisma.knowledgeArticle.update({
      where: { id: Number(id) },
      data: {
        title,
        content,
        summary,
        coverImage,
        categoryId: categoryId ? Number(categoryId) : undefined,
        tags
      }
    })

    syncArticleRagIndex(article.id, article.status)

    return res.json(success(null, '更新成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// PUT /api/knowledge/article/:id/status — 修改文章状态：发布/下线（仅管理员）
router.put('/article/:id/status', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const article = await prisma.knowledgeArticle.update({
      where: { id: Number(id) },
      data: { status: Number(status) }
    })

    syncArticleRagIndex(article.id, article.status)

    return res.json(success(null, 'Status updated successfully'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

// DELETE /api/knowledge/article/:id — 删除文章（仅管理员）
router.delete('/article/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    try {
      await deleteArticleIndex(Number(id))
    } catch (error: any) {
      console.error(`删除文章索引失败 articleId=${id}:`, error.message)
    }

    await prisma.knowledgeArticle.delete({ where: { id: Number(id) } })

    return res.json(success(null, '删除成功'))
  } catch (err: any) {
    return res.json(fail(err.message))
  }
})

export { router as knowledgeRouter }
