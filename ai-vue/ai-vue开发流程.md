# AI-Vue 项目开发流程

## 一、项目初始化

### 1. 创建 Vite + Vue3 项目

```bash
npm create vite@latest ai-vue -- --template vue-ts
cd ai-vue
```

### 2. 安装核心依赖

```bash
# UI 框架
npm install element-plus @element-plus/icons-vue

# 状态管理 & 路由
npm install pinia vue-router

# 网络请求
npm install axios

# 图表
npm install echarts

# 富文本编辑器
npm install @wangeditor/editor @wangeditor/editor-for-vue

# 工具库
npm install dayjs dompurify pdfjs-dist @microsoft/fetch-event-source
```

### 3. 安装开发依赖

```bash
# 代码规范
npm install -D eslint prettier eslint-config-prettier eslint-plugin-prettier eslint-plugin-vue @eslint/js globals

# TypeScript
npm install -D typescript vue-tsc @types/node

# Sass
npm install -D sass

# 自动导入（Element Plus 按需引入）
npm install -D unplugin-auto-import unplugin-vue-components

# PWA
npm install -D vite-plugin-pwa

# 移动端适配
npm install -D amfe-flexible postcss-pxtorem
```

---

## 二、项目配置

### 1. Vite 配置 (`vite.config.ts`)

```ts
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      vue(),
      // Element Plus 按需自动导入
      AutoImport({
        resolvers: [ElementPlusResolver({ importStyle: 'css' })],
        imports: ['vue', 'vue-router', 'pinia'],
        dts: 'src/auto-imports.d.ts'
      }),
      Components({
        resolvers: [ElementPlusResolver({ importStyle: 'css' })],
        dts: 'src/components.d.ts'
      })
    ],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) }
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, '/api')
        }
      }
    },
    build: {
      rollupOptions: {
        output: {
          // 手动代码分块
          manualChunks(id) {
            if (id.includes('element-plus')) return 'element-plus'
            if (id.includes('echarts')) return 'echarts'
            if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/') || id.includes('node_modules/pinia/')) return 'vendor'
          }
        }
      }
    }
  }
})
```

### 2. TypeScript 配置 (`tsconfig.json`)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
}
```

### 3. 环境变量

**`.env.development`**
```
VITE_API_BASE_URL=http://localhost:3000
VITE_FILE_BASE_URL=http://localhost:3000
VITE_DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
VITE_DEEPSEEK_API_KEY=your-api-key
VITE_DEEPSEEK_MODEL=deepseek-chat
```

**`.env.production`**
```
VITE_API_BASE_URL=https://your-production-api.com
VITE_FILE_BASE_URL=https://your-production-api.com
```

---

## 三、项目骨架搭建（按顺序）

### 第1步：入口文件和全局样式

```
src/
├── main.ts                    # 应用入口
├── App.vue                    # 根组件
├── assets/css/reset.css       # 全局样式重置
└── env.d.ts                   # 环境类型声明
```

**`main.ts`** — 注册插件、挂载应用：
```ts
import { createApp } from 'vue'
import './assets/css/reset.css'
import App from './App.vue'
import router from './router'
import registerStore from './stores'
import { registerIcons } from '@/global/register-icons'
import 'element-plus/dist/index.css'
import './router/guard'

const app = createApp(App)
registerIcons(app)
app.use(router)
registerStore(app)
app.mount('#app')
```

**`App.vue`** — 只放 `<router-view />`

---

### 第2步：类型定义

```
src/types/index.ts
```

定义全局接口：`IUserInfo`、`ILoginResponse`、`IUserMenu`、`IApiResponse`

---

### 第3步：全局常量和配置

```
src/global/constants.ts        # 缓存 key 常量
src/global/register-icons.ts   # Element Plus 图标全局注册
src/config/index.js            # 项目配置（fileBaseUrl 等）
src/config/menus.ts            # 静态菜单配置
```

---

### 第4步：工具函数

```
src/utils/
├── cache.ts          # localStorage/sessionStorage 封装
├── format.ts         # 格式化工具
├── formatDate.ts     # 日期格式化（dayjs）
└── map-menus.ts      # 菜单映射（菜单→路由、菜单→权限、菜单→面包屑）
```

---

### 第5步：网络请求封装

```
src/service/
├── config.ts              # BASE_URL、TIME_OUT 配置
├── index.ts               # 创建 HYRequest 实例
├── request/
│   ├── index.ts           # HYRequest 类（axios 二次封装）
│   └── type.ts            # 请求相关类型定义
├── admin/admin.ts         # 后台管理接口
└── frontend/frontend.ts   # 前台用户接口
```

封装顺序：
1. `request/type.ts` → 定义 `HYRequestInterceptors`、`HYRequestConfig` 接口
2. `request/index.ts` → `HYRequest` 类（拦截器、token 注入、错误处理）
3. `config.ts` → 环境变量读取 BASE_URL
4. `index.ts` → 创建默认 `hyRequest` 实例并导出
5. `admin.ts` / `frontend.ts` → 按模块封装具体 API

---

### 第6步：状态管理

```
src/stores/
├── index.ts           # 创建 pinia + 注册 store + loadLocalCache
└── login/login.ts     # 登录状态（token、userInfo、userMenus、permissions）
```

`stores/index.ts` 关键逻辑：
```ts
const pinia = createPinia()
function registerStore(app: App) {
  app.use(pinia)
  const loginStore = useLoginStore()
  loginStore.loadLocalCache()  // 刷新时从缓存恢复登录状态
}
```

---

### 第7步：路由配置

```
src/router/
├── index.ts                           # 静态路由 + createRouter
├── guard.ts                           # 全局路由守卫（RBAC 权限控制）
└── main/                              # 动态路由模块
    ├── consultation/consultation.ts
    ├── dashboard/dashboard.ts
    ├── emotional/emotional.ts
    └── knowledge/knowledge.ts
```

路由结构：
- `/` → 前台布局（FrontendLayout）→ 首页、AI咨询、心情记录、知识库
- `/auth` → 认证布局（AuthLayout）→ 登录、注册
- `/main` → 后台布局（BacKendLayout）→ 数据分析、知识文章、AI陪伴记录、心情档案

---

### 第8步：布局组件

```
src/components/
├── FrontendLayout.vue     # 前台布局（NavBar + 内容区）
├── AuthLayout.vue         # 认证页布局（居中卡片）
├── BacKEndLayout.vue      # 后台布局（Sidebar + NavBar + 内容区）
├── NavBar.vue             # 顶部导航栏
├── Sidebar.vue            # 侧边栏菜单
└── PageHead.vue           # 页面头部
```

---

### 第9步：通用业务组件

```
src/components/
├── TableSearch.vue              # 表格搜索组件
├── ArticleDialog.vue            # 文章新增/编辑弹窗
├── RichTextEditor.vue           # 富文本编辑器（wangEditor）
├── MarkdownRenderer.vue         # Markdown 渲染（DOMPurify 防XSS）
└── consultation/                # AI 对话模块组件
    ├── ChatPanel.vue            # 对话面板（组合所有子组件）
    ├── ChatMessageList.vue      # 消息列表（自动滚底）
    ├── ChatInputBox.vue         # 输入框
    ├── SessionList.vue          # 会话列表
    ├── EmotionPanel.vue         # 情绪分析面板
    ├── AlertCard.vue            # 预警卡片（Teleport + 定时器）
    ├── AssistantCard.vue        # AI助手卡片
    └── ConsultationSidebar.vue  # 对话侧边栏
```

---

### 第10步：Composables（组合式函数）

```
src/composables/
├── usePagination.js              # 通用分页逻辑
├── useTableSearch.js             # 表格搜索逻辑（分页+搜索+删除）
├── useDialogForm.js              # 弹窗表单逻辑
├── useConsultationStream.js      # AI 对话流式请求（SSE + AbortController）
├── useConsultationSessions.js    # 会话管理
├── useConsultationEmotion.js     # 情绪分析
├── useSSEStream.js               # SSE 流解析器（async generator）
├── useStreamRound.js             # 单轮流式请求（DeepSeek API）
├── useToolCallLoop.js            # 工具调用循环
├── useToolCalls.js               # 工具注册与执行
└── useFileParser.js              # 文件解析（PDF/图片）
```

---

### 第11步：页面视图

```
src/views/
├── frontend/               # 前台页面
│   ├── home.vue            # 首页
│   ├── consultation.vue    # AI 心理陪伴
│   ├── emotionDiary.vue    # 心情记录
│   ├── knowledge.vue       # 知识库列表
│   └── articleDetail.vue   # 文章详情
├── backend/                # 后台页面
│   ├── dashboard.vue       # 数据分析（ECharts）
│   ├── knowledge.vue       # 知识文章管理
│   ├── consultation.vue    # AI 陪伴记录管理
│   └── emotional.vue       # 心情档案管理
├── auth/                   # 认证页面
│   ├── login.vue           # 登录
│   └── register.vue        # 注册
└── not-found.vue           # 404 页面
```

---

## 四、开发顺序总结

```
1. 项目初始化 + 安装依赖
2. Vite / TS / ESLint / Prettier 配置
3. 环境变量 (.env)
4. 类型定义 (types/)
5. 全局常量 + 配置 (global/, config/)
6. 工具函数 (utils/)
7. 网络请求封装 (service/)
8. 状态管理 (stores/)
9. 路由配置 + 守卫 (router/)
10. 布局组件 (components/*Layout.vue, NavBar, Sidebar)
11. 通用业务组件 (components/)
12. Composables (composables/)
13. 页面视图 (views/)
```

---

## 五、启动与构建

```bash
# 开发
npm run dev

# 构建
npm run build

# 预览构建产物
npm run preview

# 代码检查
npm run lint

# 代码格式化
npm run format
```
