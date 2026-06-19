# 校园AI心理健康咨询系统 - API接口文档

## 1. 项目概述

校园AI心理健康咨询系统是一个集成了知识文章、心理咨询、情绪日记、数据分析等功能的Web平台。本文档描述了系统的所有 RESTful API 接口。

**技术栈**：Vue 3 + TypeScript + Element Plus + Node.js + Express + Prisma + MySQL

**基础配置**：
- Base URL：`/api`
- 请求超时：`30000ms`（30秒）
- 统一响应格式：JSON

---

## 2. 通用说明

### 2.1 请求头

```
Content-Type: application/json
Authorization: Bearer {token}  // 需要认证的接口
```

### 2.2 响应格式

**成功响应**：
```json
{
  "code": 200,
  "data": {},
  "message": "success"
}
```

**错误响应**：
```json
{
  "code": 400,
  "message": "错误信息描述"
}
```

### 2.3 状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误 |
| 401 | 未授权，需要登录 |
| 403 | 权限不足 |
| 404 | 资源不存在 |
| 500 | 服务器内部错误 |

---

## 3. 用户认证模块

### 3.1 用户登录

**接口地址**：`POST /user/login`

**请求参数**：
```json
{
  "username": "string",  // 必填，用户名
  "password": "string"   // 必填，密码
}
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "id": 1,
      "username": "admin",
      "nickname": "管理员",
      "userType": 1
    }
  },
  "message": "登录成功"
}
```

---

### 3.2 用户注册

**接口地址**：`POST /user/add`

**请求参数**：
```json
{
  "username": "string",   // 必填，用户名
  "password": "string",   // 必填，密码
  "email": "string",      // 选填，邮箱
  "nickname": "string",   // 选填，昵称
  "phone": "string",      // 选填，手机号
  "gender": 0,            // 选填，性别 0-未知 1-男 2-女
  "userType": 0           // 选填，用户类型 0-普通用户 1-管理员
}
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "userId": 1
  },
  "message": "注册成功"
}
```

---

### 3.3 用户登出

**接口地址**：`POST /user/logout`

**请求头**：需要 Authorization

**响应数据**：
```json
{
  "code": 200,
  "message": "登出成功"
}
```

---

## 4. 知识文章模块

### 4.1 获取分类树

**接口地址**：`GET /knowledge/category/tree`

**响应数据**：
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "categoryName": "心理健康",
      "children": []
    }
  ]
}
```

---

### 4.2 分页查询文章

**接口地址**：`GET /knowledge/article/page`

**请求参数**（Query）：
```
currentPage=1        // 当前页码，默认1
size=10              // 每页条数，默认10
title=搜索关键词      // 选填，文章标题
categoryId=1         // 选填，分类ID
status=1             // 选填，状态 0-草稿 1-已发布 2-已下线
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": 1,
        "title": "如何缓解焦虑情绪",
        "categoryId": 1,
        "authorName": "张医生",
        "readCount": 256,
        "status": 1,
        "createdAt": "2026-01-15T10:30:00.000Z",
        "updatedAt": "2026-01-15T10:30:00.000Z"
      }
    ],
    "total": 100,
    "currentPage": 1,
    "size": 10
  }
}
```

---

### 4.3 获取文章详情

**接口地址**：`GET /knowledge/article/{id}`

**路径参数**：
- `id`：文章ID

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "id": 1,
    "title": "如何缓解焦虑情绪",
    "content": "文章内容...",
    "categoryId": 1,
    "authorName": "张医生",
    "coverUrl": "https://example.com/cover.jpg",
    "readCount": 256,
    "status": 1,
    "createdAt": "2026-01-15T10:30:00.000Z",
    "updatedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

---

### 4.4 创建文章

**接口地址**：`POST /knowledge/article`

**请求头**：需要 Authorization（管理员权限）

**请求参数**：
```json
{
  "title": "文章标题",
  "content": "文章内容",
  "categoryId": 1,
  "coverUrl": "封面图片URL",
  "status": 0
}
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "id": 1
  },
  "message": "创建成功"
}
```

---

### 4.5 更新文章

**接口地址**：`PUT /knowledge/article/{id}`

**请求头**：需要 Authorization（管理员权限）

**路径参数**：
- `id`：文章ID

**请求参数**：
```json
{
  "title": "更新后的标题",
  "content": "更新后的内容",
  "categoryId": 1,
  "coverUrl": "封面图片URL"
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "更新成功"
}
```

---

### 4.6 修改文章状态

**接口地址**：`PUT /knowledge/article/{id}/status`

**请求头**：需要 Authorization（管理员权限）

**路径参数**：
- `id`：文章ID

**请求参数**：
```json
{
  "status": 1  // 0-草稿 1-已发布 2-已下线
}
```

**响应数据**：
```json
{
  "code": 200,
  "message": "状态修改成功"
}
```

---

### 4.7 删除文章

**接口地址**：`DELETE /knowledge/article/{id}`

**请求头**：需要 Authorization（管理员权限）

**路径参数**：
- `id`：文章ID

**响应数据**：
```json
{
  "code": 200,
  "message": "删除成功"
}
```

---

## 5. 心理咨询模块

### 5.1 创建咨询会话

**接口地址**：`POST /psychological-chat/session/start`

**请求头**：需要 Authorization

**请求参数**：
```json
{
  "userId": 1  // 选填，用户ID（未登录可不传）
}
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "sessionId": "uuid-string",
    "createdAt": "2026-01-15T10:30:00.000Z"
  }
}
```

---

### 5.2 获取会话列表

**接口地址**：`GET /psychological-chat/sessions`

**请求参数**（Query）：
```
userId=1            // 选填，用户ID
currentPage=1       // 当前页码
size=10             // 每页条数
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "sessionId": "uuid-string",
        "userId": 1,
        "lastMessageTime": "2026-01-15T10:30:00.000Z",
        "messageCount": 10,
        "status": 1
      }
    ],
    "total": 20,
    "currentPage": 1,
    "size": 10
  }
}
```

---

### 5.3 获取会话消息记录

**接口地址**：`GET /psychological-chat/sessions/{sessionId}/messages`

**路径参数**：
- `sessionId`：会话ID

**响应数据**：
```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "sessionId": "uuid-string",
      "senderType": 0,  // 0-用户 1-AI
      "content": "我最近感到很焦虑",
      "createdAt": "2026-0 -15T10:30:00.000Z"
    },
    {
      "id": 2,
      "sessionId": "uuid-string",
      "senderType": 1,
      "content": "我理解你的感受，能详细说说吗？",
      "createdAt": "2026-01-15T10:31:00.000Z"
    }
  ]
}
```

---

### 5.4 发送消息

**接口地址**：`POST /psychological-chat/sessions/{sessionId}/messages`

**路径参数**：
- `sessionId`：会话ID

**请求参数**：
```json
{
  "senderType": 0,      // 0-用户 1-AI
  "content": "消息内容"
}
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "messageId": 1,
    "aiResponse": "AI回复内容"  // 如果senderType为0，会返回AI回复
  }
}
```

---

### 5.5 删除会话

**接口地址**：`DELETE /psychological-chat/sessions/{sessionId}`

**请求头**：需要 Authorization

**路径参数**：
- `sessionId`：会话ID

**响应数据**：
```json
{
  "code": 200,
  "message": "删除成功"
}
```

---

### 5.6 获取会话情绪分析

**接口地址**：`GET /psychological-chat/session/{sessionId}/emotion`

**请求参数**（Query）：
```
forceRefresh=true   // 选填，是否强制刷新分析
```

**路径参数**：
- `sessionId`：会话ID

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "sessionId": "uuid-string",
    "emotionScore": 6.5,
    "emotionLabel": "轻度焦虑",
    "keywords": ["焦虑", "压力", "失眠"],
    "suggestion": "建议进行放松训练",
    "analyzedAt": "2026-01-15T10:30:00.000Z"
  }
}
```

---

## 6. 情绪日记模块

### 6.1 添加情绪日记

**接口地址**：`POST /emotion-diary`

**请求头**：需要 Authorization

**请求参数**：
```json
{
  "moodScore": 7,           // 必填，心情评分 1-10
  "moodLabel": "愉悦",      // 必填，情绪标签
  "content": "今天心情不错" // 必填，日记内容
}
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "id": 1
  },
  "message": "添加成功"
}
```

---

### 6.2 获取情绪日记列表（管理员）

**接口地址**：`GET /emotion-diary/admin/page`

**请求头**：需要 Authorization（管理员权限）

**请求参数**（Query）：
```
currentPage=1
size=10
userId=1           // 选填，用户ID
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "records": [
      {
        "id": 1,
        "userId": 1,
        "username": "user001",
        "moodScore": 7,
        "moodLabel": "愉悦",
        "content": "今天心情不错",
        "createdAt": "2026-01-15T10:30:00.000Z"
      }
    ],
    "total": 50,
    "currentPage": 1,
    "size": 10
  }
}
```

---

### 6.3 删除情绪日记（管理员）

**接口地址**：`DELETE /emotion-diary/admin/{id}`

**请求头**：需要 Authorization（管理员权限）

**路径参数**：
- `id`：日记ID

**响应数据**：
```json
{
  "code": 200,
  "message": "删除成功"
}
```

---

## 7. 文件上传模块

### 7.1 上传文件

**接口地址**：`POST /file/upload`

**请求头**：
```
Content-Type: multipart/form-data
Authorization: Bearer {token}
```

**请求参数**（FormData）：
```
file: File对象           // 必填，文件
businessType: "ARTICLE"  // 必填，业务类型
businessId: "1"          // 必填，业务ID
businessField: "cover"   // 必填，业务字段（如：cover-封面）
```

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "fileId": 1,
    "url": "https://example.com/uploads/xxx.jpg",
    "filename": "cover.jpg",
    "size": 102400
  }
}
```

---

## 8. 数据分析模块

### 8.1 获取数据概览

**接口地址**：`GET /data-analytics/overview`

**请求头**：需要 Authorization（管理员权限）

**响应数据**：
```json
{
  "code": 200,
  "data": {
    "totalUsers": 1250,
    "totalArticles": 85,
    "totalSessions": 3420,
    "totalDiaries": 2580,
    "todayNewUsers": 12,
    "todayActiveSessions": 68,
    "averageMoodScore": 6.8,
    "topEmotions": [
      { "label": "焦虑", "count": 320 },
      { "label": "愉悦", "count": 280 },
      { "label": "平静", "count": 250 }
    ]
  }
}
```

---

## 9. 数据模型

### 9.1 用户模型（User）

```typescript
interface User {
  id: number
  username: string
  password: string  // 加密存储
  email?: string
  nickname?: string
  phone?: string
  gender: 0 | 1 | 2  // 0-未知 1-男 2-女
  userType: 0 | 1    // 0-普通用户 1-管理员
  createdAt: Date
  updatedAt: Date
}
```

---

### 9.2 文章模型（Article）

```typescript
interface Article {
  id: number
  title: string
  content: string
  categoryId: number
  authorId: number
  authorName: string
  coverUrl?: string
  readCount: number
  status: 0 | 1 | 2  // 0-草稿 1-已发布 2-已下线
  createdAt: Date
  updatedAt: Date
}
```

---

### 9.3 咨询会话模型（Session）

```typescript
interface Session {
  sessionId: string  // UUID
  userId?: number
  lastMessageTime: Date
  messageCount: number
  status: 0 | 1      // 0-进行中 1-已结束
  createdAt: Date
  updatedAt: Date
}
```

---

### 9.4 消息模型（Message）

```typescript
interface Message {
  id: number
  sessionId: string
  senderType: 0 | 1  // 0-用户 1-AI
  content: string
  createdAt: Date
}
```

---

### 9.5 情绪日记模型（EmotionDiary）

```typescript
interface EmotionDiary {
  id: number
  userId: number
  moodScore: number  // 1-10
  moodLabel: string
  content: string
  createdAt: Date
}
```

---

## 10. 错误码对照表

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 10001 | 用户名或密码错误 | 检查登录信息 |
| 10002 | Token 过期 | 重新登录 |
| 10003 | 权限不足 | 联系管理员 |
| 20001 | 文章不存在 | 检查文章ID |
| 20002 | 分类不存在 | 检查分类ID |
| 30001 | 会话不存在 | 检查会话ID |
| 30002 | 消息发送失败 | 稍后重试 |
| 40001 | 文件格式不支持 | 检查文件类型 |
| 40002 | 文件大小超限 | 压缩后上传 |
| 50001 | AI 服务异常 | 稍后重试 |

---

## 11. 技术实现说明

### 11.1 SSE 流式响应（AI 对话）

AI 对话采用 SSE（Server-Sent Events）实现实时流式响应，在小程序端降级为 HTTP 轮询：

**Web 端**：
```typescript
const eventSource = new EventSource(`/api/psychological-chat/stream/${sessionId}`)
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data)
  // 处理流式数据
}
```

**小程序端**：
```typescript
// 降级为轮询
setInterval(() => {
  getSessionDetail(sessionId).then(messages => {
    // 获取最新消息
  })
}, 2000)
```

---

### 11.2 JWT 鉴权

系统使用 JWT（JSON Web Token）进行身份验证：

1. 用户登录成功后，服务端返回 token
2. 前端将 token 存储在 localStorage
3. 后续请求在 Header 中携带：`Authorization: Bearer {token}`
4. 服务端验证 token 有效性和权限

---

### 11.3 文件上传说明

- 支持的图片格式：jpg、png、gif、webp
- 文件大小限制：5MB
- 上传后文件存储在 OSS 或本地存储
- 返回可访问的 URL

---

## 12. 开发环境配置

### 12.1 前端开发服务器

```bash
npm install
npm run dev
```

### 12.2 后端开发服务器

```bash
cd server
npm install
npx prisma migrate dev
npm run dev
```

### 12.3 环境变量配置

创建 `.env` 文件：

```env
# 数据库配置
DATABASE_URL="mysql://user:password@localhost:3306/ai_psychology"

# JWT 配置
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"

# AI 服务配置
GEMINI_API_KEY="your-gemini-api-key"

# 文件上传配置
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880
```

---

## 13. 接口调用示例

### 13.1 JavaScript/TypeScript

```typescript
// 登录示例
const login = async (username: string, password: string) => {
  const response = await fetch('/api/user/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ username, password })
  })
  const result = await response.json()
  if (result.code === 200) {
    localStorage.setItem('token', result.data.token)
  }
  return result
}

// 获取文章列表示例
const getArticles = async (page: number = 1, size: number = 10) => {
  const token = localStorage.getItem('token')
  const response = await fetch(`/api/knowledge/article/page?currentPage=${page}&size=${size}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  return await response.json()
}
```

---

### 13.2 Axios 封装示例

```typescript
import axios from 'axios'

const request = axios.create({
  baseURL: '/api',
  timeout: 30000
})

// 请求拦截器
request.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
request.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      // 跳转到登录页
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default request
```

---

## 14. 更新日志

### v1.0.0（2026-01-15）
- 初始版本发布
- 实现用户认证、知识文章、心理咨询、情绪日记、数据分析等核心功能
- 支持 Web 端和移动端

---

## 15. 联系方式

- 项目地址：https://gitee.com/mabataki777777/campus-mindcare-AI
- 技术支持：18176309203
- 邮箱：2350995770@qq.com

---

**文档版本**：v1.0.0  
**最后更新**：2026-01-15  
**维护者**：何钧燕
