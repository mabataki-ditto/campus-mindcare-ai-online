# 校园AI心理陪伴平台 — UniApp 开发流程

## 项目现状

- **Web 前端技术栈**：Vue 3 + TypeScript/JavaScript + Element Plus + Vite + Pinia
- **后端技术栈**：Node.js + Express + TypeScript + Prisma + MySQL + JWT
- **AI 集成**：DeepSeek API，SSE 流式输出，Function Calling（工具调用）
- **核心模块**：AI 咨询对话、情绪日记、知识库、后台管理（数据分析、知识文章、AI陪伴记录、心情档案）
- **已有后端接口**：40 个 API（用户、咨询、预警、日记、知识库、文件上传、AI代理、系统管理）

### UniApp 开发目标

将现有 Web 平台的**前台用户功能**迁移到 UniApp，实现一套代码编译到微信小程序、H5、App 多端运行。

| 功能模块             | Web 前台 | UniApp 移动端 | 说明                 |
| -------------------- | -------- | ------------- | -------------------- |
| 登录/注册            | ✅       | ✅            | 移植                 |
| AI 心理陪伴对话      | ✅       | ✅            | 核心功能，需适配 SSE |
| 情绪日记             | ✅       | ✅            | 移植                 |
| 知识库浏览           | ✅       | ✅            | 移植                 |
| 文章详情             | ✅       | ✅            | 移植                 |
| 后台管理             | ✅       | ❌            | 仅 Web 端            |
| 情绪预警卡片         | ✅       | ✅            | 移植                 |
| 文件上传（PDF/图片） | ✅       | ✅            | 适配 uni API         |

---

## 一、技术方案选型

### 1.1 UniApp 创建方式

| 方案                       | 优点                         | 缺点                     |
| -------------------------- | ---------------------------- | ------------------------ |
| **HBuilderX 创建（推荐）** | 官方工具、开箱即用、调试方便 | 需安装 HBuilderX         |
| **CLI 创建**               | 命令行、可集成到现有项目     | 配置繁琐、调试需额外配置 |

**决策**：使用 **HBuilderX** 创建独立 UniApp 项目，与现有 Web 项目并行开发，共享后端 API。

### 1.2 UniApp Vue 版本

| 版本              | 说明                                                |
| ----------------- | --------------------------------------------------- |
| **Vue 3（推荐）** | 与现有 Web 项目技术栈一致，组合式 API，代码风格统一 |
| Vue 2             | 生态成熟但已不推荐新项目使用                        |

**决策**：使用 **Vue 3 + TypeScript** 模式，与现有项目保持一致。

### 1.3 UI 框架选型

| 框架         | 优点                         | 缺点           | 推荐度     |
| ------------ | ---------------------------- | -------------- | ---------- |
| **uni-ui**   | 官方维护、兼容性好、组件丰富 | 样式较基础     | ⭐⭐⭐⭐⭐ |
| uView UI     | 样式精美、文档详细           | Vue 3 版本收费 | ⭐⭐⭐     |
| nutui-uniapp | 京东出品、设计规范           | 社区较小       | ⭐⭐⭐     |
| ThorUI       | 组件丰富                     | 部分收费       | ⭐⭐       |

**决策**：使用 **uni-ui** 作为基础组件库，关键页面自定义样式。

### 1.4 项目结构策略

| 策略                 | 说明                                                   |
| -------------------- | ------------------------------------------------------ | --------------------------- |
| **独立项目（推荐）** | UniApp 单独一个项目目录，与 Web 项目并行，共享后端 API |
| monorepo 共享代码    | 在同一仓库管理，共享 composables/utils/types           | 复杂度高，UniApp 编译限制多 |

**决策**：创建独立的 UniApp 项目 `ai-psychological-uniapp`，手动复用 Web 项目的 composables、utils、types 代码。

---

## 二、项目初始化

### 2.1 创建 UniApp 项目

#### 方式一：HBuilderX（推荐）

1. 下载安装 [HBuilderX](https://www.dcloud.io/hbuilderx.html)
2. 菜单：文件 → 新建 → 项目
3. 选择 `uni-app`，模板选择 `Vue3` + `TypeScript`
4. 项目名：`ai-psychological-uniapp`
5. 创建完成

#### 方式二：CLI 创建

```bash
npx degit dcloudio/uni-preset-vue#vite-ts ai-psychological-uniapp
cd ai-psychological-uniapp
npm install
```

### 2.2 安装依赖

```bash
# 核心依赖
npm install pinia pinia-plugin-unistorage   # 状态管理 + 持久化
npm install @dcloudio/uni-ui                # 官方 UI 组件库

# HTTP 请求（UniApp 不用 axios，用 uni.request）
npm install luch-request                    # 基于 uni.request 的请求库，API 类似 axios

# 工具库
npm install dayjs                           # 日期处理（与 Web 项目一致）

# Markdown 渲染
npm install mp-html                         # 小程序富文本/Markdown 渲染组件
```

### 2.3 目录结构

```
ai-psychological-uniapp/
├── src/
│   ├── api/                        # API 接口定义
│   │   ├── user.ts                 # 用户接口
│   │   ├── consultation.ts         # 心理咨询接口
│   │   ├── emotion-diary.ts        # 情绪日记接口
│   │   ├── knowledge.ts            # 知识库接口
│   │   └── ai.ts                   # AI 对话接口
│   ├── components/                 # 公共组件
│   │   ├── consultation/           # AI 咨询组件
│   │   │   ├── ChatInputBox.vue
│   │   │   ├── ChatMessageList.vue
│   │   │   ├── ChatPanel.vue
│   │   │   ├── AlertCard.vue
│   │   │   └── EmotionPanel.vue
│   │   ├── NavBar.vue
│   │   └── MarkdownRenderer.vue
│   ├── composables/                # 组合式函数（从 Web 项目移植）
│   │   ├── useConsultationStream.ts
│   │   ├── useConsultationSessions.ts
│   │   ├── useConsultationEmotion.ts
│   │   └── useToolCalls.ts
│   ├── config/
│   │   └── index.ts                # 配置（BASE_URL 等）
│   ├── pages/                      # 页面（对应 pages.json）
│   │   ├── auth/
│   │   │   ├── login.vue
│   │   │   └── register.vue
│   │   ├── home/
│   │   │   └── index.vue           # 首页
│   │   ├── consultation/
│   │   │   └── index.vue           # AI 对话页
│   │   ├── emotion/
│   │   │   └── diary.vue           # 情绪日记
│   │   ├── knowledge/
│   │   │   ├── index.vue           # 知识库列表
│   │   │   └── detail.vue          # 文章详情
│   │   └── mine/
│   │       └── index.vue           # 我的
│   ├── static/                     # 静态资源
│   │   ├── images/
│   │   └── icons/
│   ├── stores/                     # Pinia 状态管理
│   │   ├── login.ts
│   │   └── main.ts
│   ├── utils/
│   │   ├── request.ts              # HTTP 请求封装（基于 luch-request）
│   │   ├── cache.ts                # 本地缓存（基于 uni.setStorage）
│   │   ├── format.ts               # 格式化工具
│   │   └── sse.ts                  # SSE 流式请求封装
│   ├── App.vue
│   ├── main.ts
│   ├── manifest.json               # UniApp 应用配置
│   ├── pages.json                  # 页面路由配置
│   └── uni.scss                    # 全局样式变量
├── index.html
├── tsconfig.json
├── vite.config.ts
└── package.json
```

---

## 三、核心配置

### 3.1 pages.json — 页面路由与 TabBar

```json
{
  "pages": [
    { "path": "pages/home/index", "style": { "navigationBarTitleText": "首页" } },
    { "path": "pages/consultation/index", "style": { "navigationBarTitleText": "AI陪伴" } },
    { "path": "pages/emotion/diary", "style": { "navigationBarTitleText": "情绪日记" } },
    { "path": "pages/knowledge/index", "style": { "navigationBarTitleText": "知识库" } },
    { "path": "pages/knowledge/detail", "style": { "navigationBarTitleText": "文章详情" } },
    { "path": "pages/mine/index", "style": { "navigationBarTitleText": "我的" } },
    { "path": "pages/auth/login", "style": { "navigationBarTitleText": "登录" } },
    { "path": "pages/auth/register", "style": { "navigationBarTitleText": "注册" } }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "校园AI心理陪伴",
    "navigationBarBackgroundColor": "#FFFFFF",
    "backgroundColor": "#F5F5F5"
  },
  "tabBar": {
    "color": "#999999",
    "selectedColor": "#4A90D9",
    "borderStyle": "black",
    "backgroundColor": "#FFFFFF",
    "list": [
      {
        "pagePath": "pages/home/index",
        "text": "首页",
        "iconPath": "static/icons/home.png",
        "selectedIconPath": "static/icons/home-active.png"
      },
      {
        "pagePath": "pages/consultation/index",
        "text": "AI陪伴",
        "iconPath": "static/icons/chat.png",
        "selectedIconPath": "static/icons/chat-active.png"
      },
      {
        "pagePath": "pages/emotion/diary",
        "text": "日记",
        "iconPath": "static/icons/diary.png",
        "selectedIconPath": "static/icons/diary-active.png"
      },
      {
        "pagePath": "pages/knowledge/index",
        "text": "知识库",
        "iconPath": "static/icons/knowledge.png",
        "selectedIconPath": "static/icons/knowledge-active.png"
      },
      {
        "pagePath": "pages/mine/index",
        "text": "我的",
        "iconPath": "static/icons/mine.png",
        "selectedIconPath": "static/icons/mine-active.png"
      }
    ]
  }
}
```

### 3.2 manifest.json — 应用配置

```json
{
  "name": "校园AI心理陪伴",
  "appid": "__UNI__XXXXXXX",
  "description": "校园AI心理健康陪伴平台",
  "versionName": "1.0.0",
  "versionCode": "100",
  "transformPx": false,
  "mp-weixin": {
    "appid": "你的微信小程序appid",
    "setting": {
      "urlCheck": false,
      "es6": true,
      "minified": true
    },
    "usingComponents": true,
    "optimization": {
      "subPackages": true
    }
  },
  "h5": {
    "devServer": {
      "proxy": {
        "/api": {
          "target": "http://localhost:3000",
          "changeOrigin": true
        }
      }
    }
  }
}
```

### 3.3 环境变量配置

UniApp 通过 `import.meta.env` 读取环境变量，需在 `vite.config.ts` 中配置：

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()],
  define: {
    'process.env': {}
  }
})
```

在 `src/config/index.ts` 中统一管理：

```ts
// 基础地址 — 根据编译平台动态切换
const BASE_URL = (() => {
  // #ifdef H5
  return '/api'
  // #endif
  // #ifndef H5
  return 'http://localhost:3000/api' // 小程序/App 直连后端
  // #endif
})()

export { BASE_URL }
```

### 3.4 uni.scss — 全局样式变量

```scss
// 主题色（与 Web 项目保持一致）
$primary-color: #4a90d9;
$success-color: #67c23a;
$warning-color: #e6a23c;
$danger-color: #f56c6c;
$info-color: #909399;

// 文字颜色
$text-primary: #303133;
$text-regular: #606266;
$text-secondary: #909399;
$text-placeholder: #c0c4cc;

// 背景色
$bg-color: #f5f5f5;
$bg-white: #ffffff;

// 圆角
$border-radius-sm: 4px;
$border-radius-md: 8px;
$border-radius-lg: 16px;
```

---

## 四、核心模块适配

### 4.1 HTTP 请求封装

Web 项目使用 axios，UniApp 需改用 `luch-request`（API 几乎一致）：

```ts
// src/utils/request.ts
import Request from 'luch-request'
import { BASE_URL } from '@/config'
import { useLoginStore } from '@/stores/login'
import { LOGIN_TOKEN } from '@/global/constants'

const http = new Request({
  baseURL: BASE_URL,
  timeout: 30000,
  header: {}
})

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    const token = uni.getStorageSync(LOGIN_TOKEN)
    if (token) {
      config.header = config.header || {}
      config.header['token'] = token // 与 Web 项目一致，用 'token' 字段
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code === 200 || data.success) {
      return data.data
    }
    if (data.code === -1) {
      // token 过期，跳转登录
      uni.removeStorageSync(LOGIN_TOKEN)
      uni.reLaunch({ url: '/pages/auth/login' })
      return Promise.reject(data)
    }
    uni.showToast({ title: data.msg || '请求失败', icon: 'none' })
    return Promise.reject(data)
  },
  (error) => {
    uni.showToast({ title: '网络异常', icon: 'none' })
    return Promise.reject(error)
  }
)

export default http
```

### 4.2 本地缓存适配

Web 项目使用 `localStorage`，UniApp 需改用 `uni.setStorage`：

```ts
// src/utils/cache.ts
class LocalCache {
  setCache(key: string, value: any) {
    uni.setStorageSync(key, JSON.stringify(value))
  }

  getCache(key: string) {
    const value = uni.getStorageSync(key)
    if (value) {
      try {
        return JSON.parse(value)
      } catch {
        // 兼容非 JSON 字符串（如 token 可能带引号）
        return typeof value === 'string' ? value.replace(/^"|"$/g, '') : value
      }
    }
    return null
  }

  removeCache(key: string) {
    uni.removeStorageSync(key)
  }

  clearCache() {
    uni.clearStorageSync()
  }
}

export default new LocalCache()
```

### 4.3 SSE 流式请求适配（关键难点）

Web 项目使用 `@microsoft/fetch-event-source`，**小程序不支持 EventSource / fetch**，需使用 `uni.request` 的 `enableChunked` 或 `requestTask` 实现流式传输。

#### 方案一：uni.request + enableChunked（推荐，微信小程序基础库 2.20+）

```ts
// src/utils/sse.ts
interface SSEOptions {
  url: string
  data: any
  onMessage: (text: string) => void
  onDone: () => void
  onError: (err: any) => void
}

export function requestSSE(options: SSEOptions) {
  const token = uni.getStorageSync('login_token')

  const requestTask = uni.request({
    url: options.url,
    method: 'POST',
    header: {
      'Content-Type': 'application/json',
      token: token?.replace(/^"|"$/g, '') || ''
    },
    data: options.data,
    enableChunked: true, // 关键：开启分块传输
    success: () => {
      options.onDone()
    },
    fail: (err) => {
      options.onError(err)
    }
  })

  // 监听分块数据
  requestTask.onChunkedData((res) => {
    // res.data 是 ArrayBuffer，需解码
    const text = arrayBufferToString(res.data)
    // 解析 SSE 格式：data: {...}\n\n
    const lines = text.split('\n')
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const jsonStr = line.slice(6).trim()
        if (jsonStr === '[DONE]') {
          options.onDone()
          return
        }
        try {
          const parsed = JSON.parse(jsonStr)
          const delta = parsed.choices?.[0]?.delta
          if (delta?.content) {
            options.onMessage(delta.content)
          }
        } catch {
          // JSON 不完整，跳过
        }
      }
    }
  })

  return requestTask
}

function arrayBufferToString(buffer: ArrayBuffer): string {
  // #ifdef MP-WEIXIN
  const encoding = 'utf-8'
  const decoder = new (globalThis as any).TextDecoder(encoding)
  return decoder.decode(new Uint8Array(buffer))
  // #endif
  // #ifdef H5
  return new TextDecoder().decode(new Uint8Array(buffer))
  // #endif
}
```


### 4.4 AI 对话流式逻辑移植

从 Web 项目的 `useConsultationStream.js` 移植，核心改造点：

```ts
// src/composables/useConsultationStream.ts
import { ref } from 'vue'
import { requestSSE, requestNonStream } from '@/utils/sse'
import { BASE_URL } from '@/config'
import { toolDefinitions, executeToolCall } from './useToolCalls'

export function useConsultationStream() {
  const messages = ref<any[]>([])
  const currentReply = ref('')
  const isStreaming = ref(false)

  async function sendMessage(userMessage: string, attachedFile?: any) {
    isStreaming.value = true
    currentReply.value = ''

    // 构建消息
    messages.value.push({ role: 'user', content: userMessage })

    // 使用 SSE 流式请求
    const requestTask = requestSSE({
      url: `${BASE_URL}/ai/chat`,
      data: {
        messages: messages.value,
        tools: toolDefinitions,
        toolChoice: 'auto',
        stream: true
      },
      onMessage: (text) => {
        currentReply.value += text
      },
      onDone: () => {
        if (currentReply.value) {
          messages.value.push({ role: 'assistant', content: currentReply.value })
        }
        isStreaming.value = false
      },
      onError: (err) => {
        console.error('SSE 错误', err)
        isStreaming.value = false
        // 降级为非流式
        fallbackNonStream(userMessage)
      }
    })

    return requestTask
  }

  async function fallbackNonStream(userMessage: string) {
    try {
      const res = await requestNonStream(`${BASE_URL}/ai/chat`, {
        messages: messages.value,
        stream: false
      })
      const content = res.choices?.[0]?.message?.content || ''
      messages.value.push({ role: 'assistant', content })
      currentReply.value = content
    } catch (e) {
      uni.showToast({ title: 'AI 服务暂时不可用', icon: 'none' })
    } finally {
      isStreaming.value = false
    }
  }

  return { messages, currentReply, isStreaming, sendMessage }
}
```

### 4.5 文件上传适配

Web 项目使用 `<input type="file">`，UniApp 需改用 `uni.chooseImage` / `uni.chooseFile`：

```ts
// src/composables/useFileUpload.ts
export function useFileUpload() {
  /**
   * 选择图片
   */
  function chooseImage(count = 1) {
    return new Promise<string[]>((resolve, reject) => {
      uni.chooseImage({
        count,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => resolve(res.tempFilePaths),
        fail: reject
      })
    })
  }

  /**
   * 选择文件（PDF 等）— 仅 App 端支持
   * 小程序端不支持选择 PDF，需引导用户截图或拍照
   */
  function chooseFile() {
    // #ifdef APP-PLUS
    return new Promise((resolve, reject) => {
      uni.chooseFile({
        count: 1,
        extension: ['.pdf'],
        success: (res) => resolve(res.tempFilePaths[0]),
        fail: reject
      })
    })
    // #endif
    // #ifdef MP-WEIXIN
    uni.showToast({ title: '小程序暂不支持PDF，请截图上传', icon: 'none' })
    return Promise.reject('小程序不支持选择PDF')
    // #endif
  }

  /**
   * 上传文件到后端
   */
  function uploadFile(filePath: string, businessType = 'REPORT') {
    const token = uni.getStorageSync('login_token')?.replace(/^"|"$/g, '')
    return new Promise((resolve, reject) => {
      uni.uploadFile({
        url: `${BASE_URL}/file/upload`,
        filePath,
        name: 'file',
        header: { token },
        formData: { businessType },
        success: (res) => {
          const data = JSON.parse(res.data)
          if (data.code === 200) {
            resolve(data.data)
          } else {
            reject(data)
          }
        },
        fail: reject
      })
    })
  }

  return { chooseImage, chooseFile, uploadFile }
}
```

### 4.6 Markdown 渲染适配

Web 项目使用 `v-html` + DOMPurify，小程序不支持 `v-html`，需使用 `mp-html` 组件：

```vue
<!-- 小程序端 Markdown 渲染 -->
<template>
  <mp-html :content="htmlContent" />
</template>

<script setup>
import { computed } from 'vue'
// 需先将 Markdown 转为 HTML
import { marked } from 'marked'

const props = defineProps<{ markdown: string }>()
const htmlContent = computed(() => {
  return marked(props.markdown || '')
})
</script>
```

### 4.7 拨打电话适配

Web 项目使用 `<a href="tel:xxx">`，UniApp 使用 `uni.makePhoneCall`：

```ts
function callHotline(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone })
}

// 预警卡片中使用
callHotline('400-161-9995') // 24小时心理援助热线
```

---

## 五、页面开发

### 5.1 登录页

```vue
<!-- pages/auth/login.vue -->
<template>
  <view class="login-page">
    <view class="logo-section">
      <image src="/static/images/logo.png" class="logo" />
      <text class="title">校园AI心理陪伴</text>
    </view>

    <view class="form-section">
      <uni-easyinput v-model="form.username" placeholder="请输入用户名" />
      <uni-easyinput v-model="form.password" type="password" placeholder="请输入密码" />

      <button class="login-btn" @tap="handleLogin" :loading="loading">登 录</button>

      <view class="link-row">
        <text class="link" @tap="goRegister">没有账号？立即注册</text>
      </view>
    </view>
  </view>
</template>
```

**与 Web 项目的差异**：

- `el-input` → `uni-easyinput`
- `el-button` → `button`
- `router.push` → `uni.navigateTo` / `uni.switchTab`
- 登录成功后跳转 TabBar 页用 `uni.switchTab`

### 5.2 首页

```vue
<!-- pages/home/index.vue -->
<template>
  <view class="home-page">
    <!-- 顶部问候 -->
    <view class="greeting-section">
      <text class="greeting">{{ greetingText }}</text>
      <text class="subtitle">今天心情如何？</text>
    </view>

    <!-- 快捷入口 -->
    <view class="quick-actions">
      <view class="action-card" @tap="goConsultation">
        <image src="/static/icons/chat-active.png" class="action-icon" />
        <text>AI 陪伴</text>
      </view>
      <view class="action-card" @tap="goDiary">
        <image src="/static/icons/diary-active.png" class="action-icon" />
        <text>情绪日记</text>
      </view>
      <view class="action-card" @tap="goKnowledge">
        <image src="/static/icons/knowledge-active.png" class="action-icon" />
        <text>知识库</text>
      </view>
    </view>

    <!-- 最近日记 -->
    <view class="recent-section">
      <text class="section-title">最近日记</text>
      <view v-for="diary in recentDiaries" :key="diary.id" class="diary-card">
        <text class="diary-mood">{{ diary.moodLabel }}</text>
        <text class="diary-content">{{ diary.content }}</text>
      </view>
    </view>
  </view>
</template>
```

### 5.3 AI 对话页

```vue
<!-- pages/consultation/index.vue -->
<template>
  <view class="consultation-page">
    <!-- 会话列表 / 对话界面切换 -->
    <view v-if="!currentSessionId" class="session-list">
      <view class="session-header">
        <text class="title">AI 心理陪伴</text>
        <button size="mini" @tap="createNewSession">新对话</button>
      </view>
      <view v-for="session in sessions" :key="session.id" class="session-item" @tap="enterSession(session)">
        <text class="session-title">{{ session.sessionTitle }}</text>
        <text class="session-preview">{{ session.sessionPreview }}</text>
      </view>
    </view>

    <!-- 对话界面 -->
    <view v-else class="chat-view">
      <!-- 消息列表 -->
      <scroll-view scroll-y class="message-list" :scroll-into-view="scrollToId">
        <view v-for="msg in messages" :key="msg.id" :id="`msg-${msg.id}`">
          <!-- 用户消息 -->
          <view v-if="msg.senderType === 1" class="msg-row user">
            <view class="msg-bubble user-bubble">{{ msg.content }}</view>
          </view>
          <!-- AI 消息 -->
          <view v-else class="msg-row ai">
            <image src="/static/images/robot-avatar.png" class="ai-avatar" />
            <view class="msg-bubble ai-bubble">
              <mp-html :content="renderMarkdown(msg.content)" />
            </view>
          </view>
        </view>
        <!-- 流式输出中 -->
        <view v-if="isStreaming" class="msg-row ai">
          <image src="/static/images/robot-avatar.png" class="ai-avatar" />
          <view class="msg-bubble ai-bubble">
            <mp-html :content="renderMarkdown(currentReply)" />
            <text class="typing-indicator">▍</text>
          </view>
        </view>
      </scroll-view>

      <!-- 输入框 -->
      <view class="input-bar">
        <view class="attach-btn" @tap="handleAttach">
          <uni-icons type="image" size="24" />
        </view>
        <input
          v-model="inputText"
          class="chat-input"
          placeholder="说点什么..."
          confirm-type="send"
          @confirm="handleSend"
        />
        <button class="send-btn" @tap="handleSend" :disabled="!inputText.trim() || isStreaming">发送</button>
      </view>

      <!-- 预警卡片 -->
      <AlertCard
        v-if="alertState.visible"
        :riskLevel="alertState.riskLevel"
        :reason="alertState.reason"
        @close="alertState.visible = false"
      />
    </view>
  </view>
</template>
```

### 5.4 情绪日记页

```vue
<!-- pages/emotion/diary.vue -->
<template>
  <view class="diary-page">
    <!-- 心情评分 -->
    <view class="mood-section">
      <text class="section-label">今天心情如何？</text>
      <view class="mood-slider">
        <uni-rate v-model="form.moodScore" :max="10" size="28" />
        <text class="mood-score">{{ form.moodScore }} / 10</text>
      </view>
    </view>

    <!-- 主要情绪 -->
    <view class="emotion-section">
      <text class="section-label">主要情绪</text>
      <view class="emotion-tags">
        <view
          v-for="emotion in emotionOptions"
          :key="emotion"
          :class="['tag', form.dominantEmotion === emotion ? 'tag-active' : '']"
          @tap="form.dominantEmotion = emotion"
        >
          {{ emotion }}
        </view>
      </view>
    </view>

    <!-- 日记内容 -->
    <view class="content-section">
      <textarea v-model="form.diaryContent" placeholder="记录今天的心情..." class="diary-textarea" />
    </view>

    <!-- 睡眠 & 压力 -->
    <view class="metrics-row">
      <view class="metric-item">
        <text>睡眠质量</text>
        <uni-rate v-model="form.sleepQuality" :max="5" size="20" />
      </view>
      <view class="metric-item">
        <text>压力等级</text>
        <uni-rate v-model="form.stressLevel" :max="5" size="20" />
      </view>
    </view>

    <button class="submit-btn" @tap="handleSubmit" :loading="submitting">保存日记</button>
  </view>
</template>
```

### 5.5 知识库页

```vue
<!-- pages/knowledge/index.vue -->
<template>
  <view class="knowledge-page">
    <!-- 搜索栏 -->
    <uni-search-bar v-model="keyword" placeholder="搜索文章" @confirm="handleSearch" />

    <!-- 分类标签 -->
    <scroll-view scroll-x class="category-scroll">
      <view
        v-for="cat in categories"
        :key="cat.id"
        :class="['category-tag', selectedCategory === cat.id ? 'active' : '']"
        @tap="selectCategory(cat.id)"
      >
        {{ cat.categoryName }}
      </view>
    </scroll-view>

    <!-- 文章列表 -->
    <scroll-view scroll-y class="article-list" @scrolltolower="loadMore">
      <view v-for="article in articles" :key="article.id" class="article-card" @tap="goDetail(article.id)">
        <image v-if="article.coverImage" :src="getImageUrl(article.coverImage)" class="cover" mode="aspectFill" />
        <view class="article-info">
          <text class="article-title">{{ article.title }}</text>
          <text class="article-meta">{{ article.categoryName }} · {{ article.readCount }}次阅读</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>
```

---

## 六、Web 项目代码移植对照表

| Web 项目文件                                   | UniApp 对应文件                                | 改造要点                                                       |
| ---------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------- |
| `src/service/request/index.ts` (axios)         | `src/utils/request.ts` (luch-request)          | API 一致，底层从 axios 换为 uni.request                        |
| `src/utils/cache.ts` (localStorage)            | `src/utils/cache.ts` (uni.setStorage)          | API 替换，逻辑不变                                             |
| `src/stores/login/login.ts`                    | `src/stores/login.ts`                          | Pinia 直接复用，持久化用 pinia-plugin-unistorage               |
| `src/composables/useConsultationStream.js`     | `src/composables/useConsultationStream.ts`     | SSE 实现替换，逻辑框架不变                                     |
| `src/composables/useConsultationSessions.js`   | `src/composables/useConsultationSessions.ts`   | 几乎直接复用                                                   |
| `src/composables/useConsultationEmotion.js`    | `src/composables/useConsultationEmotion.ts`    | 几乎直接复用                                                   |
| `src/composables/useToolCalls.js`              | `src/composables/useToolCalls.ts`              | 几乎直接复用                                                   |
| `src/composables/useFileParser.js`             | `src/composables/useFileUpload.ts`             | PDF 解析在小程序受限，改为图片上传为主                         |
| `src/service/frontend/frontend.ts`             | `src/api/*.ts`                                 | 接口定义直接复用，底层请求换为 luch-request                    |
| `src/components/consultation/AlertCard.vue`    | `src/components/consultation/AlertCard.vue`    | Element Plus → uni-ui，`<a href="tel:">` → `uni.makePhoneCall` |
| `src/components/consultation/ChatPanel.vue`    | `src/pages/consultation/index.vue`             | 拆分为页面，Element Plus → 原生/uni-ui                         |
| `src/components/consultation/ChatInputBox.vue` | `src/components/consultation/ChatInputBox.vue` | `<input>` → `<input>` + `confirm-type="send"`                  |
| `src/components/MarkdownRenderer.vue`          | `mp-html` 组件                                 | `v-html` → `mp-html`，需 marked 转 HTML                        |
| `src/views/frontend/home.vue`                  | `src/pages/home/index.vue`                     | Element Plus → uni-ui + 自定义样式                             |
| `src/views/frontend/emotionDiary.vue`          | `src/pages/emotion/diary.vue`                  | Element Plus → uni-ui                                          |
| `src/views/frontend/knowledge.vue`             | `src/pages/knowledge/index.vue`                | Element Plus → uni-ui                                          |
| `src/views/frontend/articleDetail.vue`         | `src/pages/knowledge/detail.vue`               | `v-html` → `mp-html`                                           |
| `src/views/auth/login.vue`                     | `src/pages/auth/login.vue`                     | Element Plus → uni-ui                                          |
| `src/views/auth/register.vue`                  | `src/pages/auth/register.vue`                  | Element Plus → uni-ui                                          |

---

## 七、平台差异与条件编译

UniApp 使用条件编译处理平台差异：

```ts
// #ifdef H5
// 仅 H5 端执行的代码
// #endif

// #ifdef MP-WEIXIN
// 仅微信小程序执行的代码
// #endif

// #ifdef APP-PLUS
// 仅 App 端执行的代码
// #endif

// #ifndef MP-WEIXIN
// 除微信小程序外都执行
// #endif
```

### 关键差异处理

| 功能          | H5                         | 微信小程序                         | App                                |
| ------------- | -------------------------- | ---------------------------------- | ---------------------------------- |
| SSE 流式      | `fetch` + `ReadableStream` | `uni.request` + `enableChunked`    | `uni.request` + `enableChunked`    |
| 文件选择      | `<input type="file">`      | `uni.chooseImage`（仅图片）        | `uni.chooseFile`（支持 PDF）       |
| 本地存储      | `localStorage`             | `uni.setStorage`                   | `uni.setStorage`                   |
| 拨打电话      | `<a href="tel:">`          | `uni.makePhoneCall`                | `uni.makePhoneCall`                |
| Markdown 渲染 | `v-html` + DOMPurify       | `mp-html` 组件                     | `mp-html` 组件                     |
| 路由跳转      | `router.push`              | `uni.navigateTo` / `uni.switchTab` | `uni.navigateTo` / `uni.switchTab` |
| 网络请求      | `axios` / `fetch`          | `uni.request`                      | `uni.request`                      |
| API 代理      | Vite proxy `/api`          | 直连后端完整 URL                   | 直连后端完整 URL                   |

---

## 八、开发任务清单

### Phase 1：项目初始化与基础架构

- [ ] 使用 HBuilderX 创建 UniApp Vue3 + TypeScript 项目
- [ ] 安装依赖：pinia、luch-request、uni-ui、dayjs、mp-html
- [ ] 配置 `pages.json`（页面路由 + TabBar）
- [ ] 配置 `manifest.json`（微信小程序 appid、H5 代理）
- [ ] 封装 HTTP 请求 `src/utils/request.ts`（luch-request，与 Web 项目拦截器逻辑一致）
- [ ] 封装本地缓存 `src/utils/cache.ts`（uni.setStorage）
- [ ] 封装 SSE 流式请求 `src/utils/sse.ts`
- [ ] 配置 Pinia + 持久化插件
- [ ] 配置全局样式 `uni.scss`

### Phase 2：认证与用户模块

- [ ] 登录页 `pages/auth/login.vue`
- [ ] 注册页 `pages/auth/register.vue`
- [ ] 登录状态管理 `stores/login.ts`
- [ ] 路由守卫（未登录跳转登录页）

### Phase 3：AI 对话核心功能

- [ ] 移植 `useConsultationStream.ts`（SSE 流式对话）
- [ ] 移植 `useToolCalls.ts`（Function Calling）
- [ ] 移植 `useConsultationSessions.ts`（会话管理）
- [ ] 移植 `useConsultationEmotion.ts`（情绪分析）
- [ ] 对话页面 `pages/consultation/index.vue`
- [ ] 消息列表组件 `ChatMessageList.vue`
- [ ] 输入框组件 `ChatInputBox.vue`
- [ ] 预警卡片组件 `AlertCard.vue`
- [ ] 情绪面板组件 `EmotionPanel.vue`
- [ ] 测试：SSE 流式对话正常、预警触发正常

### Phase 4：情绪日记模块

- [ ] 日记页面 `pages/emotion/diary.vue`
- [ ] 日记列表展示
- [ ] 日记创建/提交
- [ ] 心情评分、情绪标签、睡眠压力指标

### Phase 5：知识库模块

- [ ] 知识库列表页 `pages/knowledge/index.vue`
- [ ] 文章详情页 `pages/knowledge/detail.vue`
- [ ] 分类筛选、搜索功能
- [ ] Markdown 渲染（mp-html）

### Phase 6：首页与个人中心

- [ ] 首页 `pages/home/index.vue`（快捷入口 + 最近日记）
- [ ] 个人中心 `pages/mine/index.vue`（用户信息、退出登录）

### Phase 7：多端调试与优化

- [ ] H5 端调试与适配
- [ ] 微信小程序端调试与适配
- [ ] SSE 流式在小程序的兼容性测试
- [ ] 性能优化：长列表虚拟滚动、图片懒加载
- [ ] 小程序包体积优化（分包加载）
- [ ] UI 细节打磨、动画效果

---

## 九、关键注意事项

### 9.1 SSE 流式兼容性

- 微信小程序基础库 **2.20.0+** 才支持 `enableChunked`
- 低版本需降级为非流式请求（`stream: false`）
- App 端 SSE 兼容性较好
- H5 端可使用原生 `fetch` + `ReadableStream`

### 9.2 小程序限制

- **包体积**：主包 ≤ 2MB，总包 ≤ 20MB，需配置分包
- **网络请求**：必须配置合法域名（`request 合法域名`），开发时可关闭校验
- **不支持 DOM 操作**：不能用 `document.createElement`、`innerHTML` 等
- **不支持 `v-html`**：富文本渲染需用 `mp-html` 或 `rich-text` 组件
- **PDF 选择**：小程序端不支持选择 PDF 文件，需引导用户截图上传

### 9.3 后端接口兼容

- UniApp 小程序/App 端直连后端，**后端需配置 CORS** 允许跨域
- 小程序请求域名需在微信公众平台配置
- Token 传递方式与 Web 一致：`header.token` 字段
- 响应格式与 Web 一致：`{ code: 200, msg, data, success }`

### 9.4 代码复用原则

- **composables**：尽量直接复用，仅替换平台 API（localStorage → uni.setStorage）
- **API 定义**：接口路径和参数与 Web 项目完全一致
- **业务逻辑**：与 Web 项目保持一致，仅 UI 层适配
- **类型定义**：直接复用 Web 项目的 `src/types/`

### 9.5 安全性

- 生产环境 API Key 由后端代理，前端不暴露
- 小程序端请求走 HTTPS
- Token 存储使用 `uni.setStorageSync`，退出时清除

### 9.6 调试技巧

- HBuilderX 内置调试器，支持断点调试
- 微信开发者工具：`console.log` 输出、网络请求查看
- 真机调试：HBuilderX → 运行 → 运行到小程序模拟器/真机
- 条件编译：用 `#ifdef` 隔离平台特有代码，避免跨平台报错

---

## 十、开发环境搭建清单

| 工具           | 用途            | 安装方式                                                                            |
| -------------- | --------------- | ----------------------------------------------------------------------------------- |
| HBuilderX      | UniApp 开发 IDE | [官网下载](https://www.dcloud.io/hbuilderx.html)                                    |
| 微信开发者工具 | 小程序预览调试  | [官网下载](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html) |
| Node.js 18+    | 依赖安装        | [官网下载](https://nodejs.org/)                                                     |
| 后端服务       | API 接口        | `e:\vueProject\ai-psychological-server`，`npm run dev`                              |

### 开发启动步骤

1. 启动后端服务：`cd ai-psychological-server && npm run dev`
2. HBuilderX 打开 UniApp 项目
3. 运行 → 运行到浏览器（H5 调试）
4. 运行 → 运行到小程序模拟器 → 微信开发者工具（小程序调试）
5. 修改代码 → 保存 → 自动热更新
