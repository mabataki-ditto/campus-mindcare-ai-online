/**
 * @swagger
 * /health:
 *   get:
 *     tags: [System]
 *     summary: 健康检查
 *     security: []
 *     responses:
 *       200:
 *         description: 服务正常运行
 *
 * /user/login:
 *   post:
 *     tags: [User Auth]
 *     summary: 用户登录
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: admin }
 *               password: { type: string, example: "123456" }
 *     responses:
 *       200:
 *         description: 登录成功
 *
 * /user/add:
 *   post:
 *     tags: [User Auth]
 *     summary: 用户注册
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username: { type: string, example: student01 }
 *               password: { type: string, example: "123456" }
 *               email: { type: string, example: student01@example.com }
 *               nickname: { type: string, example: Student }
 *               phone: { type: string, example: "13800000000" }
 *               gender: { type: number, enum: [0, 1, 2], example: 0 }
 *     responses:
 *       200:
 *         description: 注册成功
 *
 * /user/logout:
 *   post:
 *     tags: [User Auth]
 *     summary: 用户登出
 *     responses:
 *       200:
 *         description: 登出成功
 *
 * /ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: DeepSeek 对话代理
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [role, content]
 *                   properties:
 *                     role: { type: string, example: user }
 *                     content:
 *                       oneOf:
 *                         - type: string
 *                         - type: array
 *               tools:
 *                 type: array
 *                 items: { type: object }
 *               toolChoice: { type: string, example: auto }
 *               stream: { type: boolean, default: true }
 *     responses:
 *       200:
 *         description: 对话响应或 SSE 流
 *
 * /data-analytics/overview:
 *   get:
 *     tags: [Data Analytics]
 *     summary: 获取看板总览数据
 *     responses:
 *       200:
 *         description: 查询成功
 *
 * /file/upload:
 *   post:
 *     tags: [File]
 *     summary: 上传文件
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               businessType: { type: string, example: ARTICLE }
 *               businessId: { type: string }
 *               businessField: { type: string, example: cover }
 *     responses:
 *       200:
 *         description: 上传成功
 *
 * /emotion-diary:
 *   post:
 *     tags: [Emotion Diary]
 *     summary: 添加情绪日记
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [moodScore]
 *             properties:
 *               moodScore: { type: number, minimum: 1, maximum: 10 }
 *               dominantEmotion: { type: string, example: 愉悦 }
 *               emotionTriggers: { type: string }
 *               diaryContent: { type: string }
 *               sleepQuality: { type: number }
 *               stressLevel: { type: number }
 *               diaryDate: { type: string, format: date }
 *     responses:
 *       200:
 *         description: 记录成功
 *
 * /emotion-diary/admin/page:
 *   get:
 *     tags: [Emotion Diary]
 *     summary: 管理端分页查询情绪日记
 *     parameters:
 *       - in: query
 *         name: currentPage
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: number, default: 10 }
 *       - in: query
 *         name: userId
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: 查询成功
 *
 * /emotion-diary/admin/{id}:
 *   delete:
 *     tags: [Emotion Diary]
 *     summary: 删除情绪日记
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: 删除成功
 *
 * /knowledge/category/tree:
 *   get:
 *     tags: [Knowledge]
 *     summary: 获取文章分类树
 *     security: []
 *     responses:
 *       200:
 *         description: 查询成功
 *
 * /knowledge/article/page:
 *   get:
 *     tags: [Knowledge]
 *     summary: 分页查询文章
 *     security: []
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
 *       - in: query
 *         name: categoryId
 *         schema: { type: number }
 *       - in: query
 *         name: status
 *         schema: { type: number, enum: [0, 1, 2] }
 *       - in: query
 *         name: keyword
 *         schema: { type: string }
 *       - in: query
 *         name: sortField
 *         schema: { type: string, example: readCount }
 *       - in: query
 *         name: sortDirection
 *         schema: { type: string, enum: [asc, desc], default: desc }
 *     responses:
 *       200:
 *         description: 查询成功
 *
 * /knowledge/article/{id}:
 *   get:
 *     tags: [Knowledge]
 *     summary: 获取文章详情
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: 查询成功
 *   put:
 *     tags: [Knowledge]
 *     summary: 更新文章
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: number }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title: { type: string }
 *               content: { type: string }
 *               summary: { type: string }
 *               coverImage: { type: string }
 *               categoryId: { type: number }
 *               tags: { type: string }
 *     responses:
 *       200:
 *         description: 更新成功
 *   delete:
 *     tags: [Knowledge]
 *     summary: 删除文章
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: 删除成功
 *
 * /knowledge/article:
 *   post:
 *     tags: [Knowledge]
 *     summary: 创建文章
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, categoryId]
 *             properties:
 *               title: { type: string, example: Article title }
 *               content: { type: string, example: Article content }
 *               summary: { type: string }
 *               coverImage: { type: string }
 *               categoryId: { type: number }
 *               tags: { type: string, example: mental,health }
 *               authorName: { type: string }
 *     responses:
 *       200:
 *         description: 创建成功
 *
 * /knowledge/article/{id}/status:
 *   put:
 *     tags: [Knowledge]
 *     summary: 更新文章状态
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: number }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: number, enum: [0, 1, 2], example: 1 }
 *     responses:
 *       200:
 *         description: 状态更新成功
 *
 * /psychological-chat/session/start:
 *   post:
 *     tags: [Psychological Chat]
 *     summary: 创建咨询会话
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               initialMessage: { type: string, example: 今天压力很大 }
 *               sessionTitle: { type: string, example: 新咨询 }
 *     responses:
 *       200:
 *         description: 创建成功
 *
 * /psychological-chat/sessions:
 *   get:
 *     tags: [Psychological Chat]
 *     summary: 分页查询咨询会话
 *     parameters:
 *       - in: query
 *         name: currentPage
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: number, default: 10 }
 *       - in: query
 *         name: userId
 *         schema: { type: number }
 *     responses:
 *       200:
 *         description: 查询成功
 *
 * /psychological-chat/sessions/{sessionId}:
 *   delete:
 *     tags: [Psychological Chat]
 *     summary: 删除咨询会话
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 删除成功
 *
 * /psychological-chat/sessions/{sessionId}/messages:
 *   get:
 *     tags: [Psychological Chat]
 *     summary: 获取会话消息
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: 查询成功
 *   post:
 *     tags: [Psychological Chat]
 *     summary: 保存会话消息
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [senderType, content]
 *             properties:
 *               senderType: { type: number, enum: [1, 2], example: 1 }
 *               content: { type: string, example: 你好 }
 *     responses:
 *       200:
 *         description: 保存成功
 *
 * /psychological-chat/session/{sessionId}/emotion:
 *   get:
 *     tags: [Psychological Chat]
 *     summary: 获取或刷新会话情绪分析
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: forceRefresh
 *         required: false
 *         schema: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: 查询成功
 *
 * /psychological-chat/alert:
 *   post:
 *     tags: [Alert]
 *     summary: 创建预警记录
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [riskLevel, reason]
 *             properties:
 *               sessionId: { type: string }
 *               riskLevel: { type: number, enum: [1, 2, 3], example: 2 }
 *               reason: { type: string, example: 检测到高风险表达 }
 *     responses:
 *       200:
 *         description: 创建成功
 *
 * /psychological-chat/alerts:
 *   get:
 *     tags: [Alert]
 *     summary: 分页查询预警记录
 *     parameters:
 *       - in: query
 *         name: currentPage
 *         schema: { type: number, default: 1 }
 *       - in: query
 *         name: size
 *         schema: { type: number, default: 10 }
 *       - in: query
 *         name: riskLevel
 *         schema: { type: number, enum: [1, 2, 3] }
 *       - in: query
 *         name: handled
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: 查询成功
 *
 * /psychological-chat/alerts/{id}/handle:
 *   put:
 *     tags: [Alert]
 *     summary: 处理预警
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: number }
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               handleNote: { type: string }
 *     responses:
 *       200:
 *         description: 处理成功
 */

export {}
