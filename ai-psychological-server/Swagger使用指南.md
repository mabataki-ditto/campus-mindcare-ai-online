# Swagger API 文档使用指南

## 1. 安装依赖

在后端项目根目录执行：

```bash
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

## 2. 启动服务

```bash
npm run dev
```

## 3. 访问 Swagger UI

服务启动后,在浏览器打开：

```
http://localhost:3000/api-docs
```

你会看到一个可交互的 API 文档界面,包含所有接口的详细信息。

## 4. 在 Swagger UI 中测试接口

### 4.1 登录获取 Token

1. 展开 `用户认证` 分组
2. 点击 `POST /user/login`
3. 点击 `Try it out` 按钮
4. 输入测试账号：
   ```json
   {
     "username": "admin",
     "password": "123456"
   }
   ```
5. 点击 `Execute` 执行
6. 在 Response 中复制返回的 `token` 值

### 4.2 设置全局 Token

1. 点击页面右上角的 `Authorize` 按钮（锁图标）
2. 在弹窗中输入：`Bearer {你的token}`
   - 注意：`Bearer` 后面有一个空格
   - 例如：`Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
3. 点击 `Authorize` 确认
4. 点击 `Close` 关闭弹窗

现在所有接口都会自动带上这个 token，可以直接测试需要登录的接口。

### 4.3 测试其他接口

设置好 token 后，就可以测试任意接口：

1. 展开想要测试的接口
2. 点击 `Try it out`
3. 填写参数（Query 参数、Path 参数或 Body）
4. 点击 `Execute`
5. 查看 Response 返回结果

## 5. 导出 OpenAPI JSON（可选）

如果需要导入到 Postman 或其他工具：

访问：`http://localhost:3000/api-docs.json`

将返回的 JSON 保存为文件，然后在 Postman 中 Import → 选择该文件即可。

## 6. 为新接口添加 Swagger 注释

当你新增接口时，在路由定义前添加 JSDoc 注释即可自动生成文档。

### 示例：添加一个 GET 接口

```typescript
/**
 * @swagger
 * /knowledge/article/{id}:
 *   get:
 *     tags: [知识文章]
 *     summary: 获取文章详情
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: number }
 *         description: 文章ID
 *     responses:
 *       200:
 *         description: 查询成功
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Article'
 */
router.get('/article/:id', authMiddleware, async (req, res) => {
  // 接口实现
})
```

### 示例：添加一个 POST 接口

```typescript
/**
 * @swagger
 * /knowledge/article:
 *   post:
 *     tags: [知识文章]
 *     summary: 创建文章
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, content, categoryId]
 *             properties:
 *               title: { type: string, example: 测试文章 }
 *               content: { type: string }
 *               categoryId: { type: number }
 *               status: { type: number, enum: [0, 1, 2] }
 *     responses:
 *       200:
 *         description: 创建成功
 */
router.post('/article', authMiddleware, adminMiddleware, async (req, res) => {
  // 接口实现
})
```

### 示例：文件上传接口

```typescript
/**
 * @swagger
 * /file/upload:
 *   post:
 *     tags: [文件上传]
 *     summary: 上传文件
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               businessType:
 *                 type: string
 *     responses:
 *       200:
 *         description: 上传成功
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  // 接口实现
})
```

## 7. Swagger 注释语法说明

### 基本结构

```yaml
/**
 * @swagger
 * /路径:
 *   请求方法:
 *     tags: [分组名]              # 接口分组
 *     summary: 接口简介           # 简短描述
 *     description: 详细说明       # 可选，详细描述
 *     security: []              # 可选，不需要认证时添加
 *     parameters: [...]         # 请求参数
 *     requestBody: {...}        # 请求体（POST/PUT）
 *     responses: {...}          # 响应
 */
```

### Query 参数

```yaml
parameters:
  - in: query
    name: page
    schema: { type: number, default: 1 }
    description: 页码
  - in: query
    name: keyword
    schema: { type: string }
    required: false
```

### Path 参数

```yaml
parameters:
  - in: path
    name: id
    required: true
    schema: { type: number }
    description: 资源ID
```

### 请求体（JSON）

```yaml
requestBody:
  required: true
  content:
    application/json:
      schema:
        type: object
        required: [field1, field2]
        properties:
          field1: { type: string, example: 示例值 }
          field2: { type: number, minimum: 1, maximum: 10 }
```

### 响应

```yaml
responses:
  200:
    description: 成功
    content:
      application/json:
        schema:
          type: object
          properties:
            code: { type: number }
            data: { type: object }
  400:
    description: 请求错误
```

### 引用已定义的 Schema

```yaml
schema:
  $ref: '#/components/schemas/User'
```

Schema 在 `src/config/swagger.ts` 的 `components.schemas` 中定义。

## 8. 常见问题

### Q: 添加注释后没有显示？

A: 重启服务 `npm run dev`，Swagger 会重新扫描路由文件。

### Q: 如何标记接口不需要登录？

A: 在接口注释中添加 `security: []`：

```typescript
/**
 * @swagger
 * /user/login:
 *   post:
 *     security: []  # 不需要 token
 *     ...
 */
```

### Q: 如何修改文档标题和描述？

A: 编辑 `src/config/swagger.ts` 中的 `info` 部分。

### Q: 如何添加新的数据模型（Schema）？

A: 在 `src/config/swagger.ts` 的 `components.schemas` 中添加：

```typescript
NewModel: {
  type: 'object',
  properties: {
    id: { type: 'number' },
    name: { type: string }
  }
}
```

## 9. 生产环境配置

生产环境可以选择关闭 Swagger 文档，在 `src/index.ts` 中添加环境判断：

```typescript
// 仅开发环境启用 Swagger
if (process.env.NODE_ENV !== 'production') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec))
}
```

## 10. 与 Postman 对比

| 功能 | Swagger UI | Postman |
|------|-----------|---------|
| 在线文档 | ✅ 自动生成 | ❌ 需手动维护 |
| 接口测试 | ✅ 支持 | ✅ 功能更强 |
| 分享给前端 | ✅ 一个链接搞定 | ❌ 需导出 JSON |
| 自动化测试 | ❌ 不支持 | ✅ 支持 |
| 环境变量 | ❌ 不支持 | ✅ 支持 |

**建议**：
- 开发时用 Swagger UI 快速测试和查看文档
- 复杂的测试场景（环境切换、自动化）用 Postman
- 可以从 Swagger 导出 JSON 导入到 Postman，两者结合使用

---

**完成配置后，你的 API 文档就会实时更新，前端同学访问 `http://localhost:3000/api-docs` 就能看到最新的接口文档！**
