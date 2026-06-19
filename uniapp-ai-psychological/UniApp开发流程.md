# UniApp 小程序项目开发流程

## 环境准备

确保已安装：
- **Node.js**（建议 18+ 版本）
- **微信开发者工具**（用于微信小程序开发）
- **HBuilderX**（可选，UniApp 官方 IDE）

验证：
```bash
node -v
npm -v
```

---

## 第一步：创建项目

### 方式一：通过 HBuilderX 创建（推荐新手）

1. 打开 HBuilderX
2. 点击 `文件` → `新建` → `项目`
3. 选择 `uni-app` → `uni-app 项目`
4. 选择模板：`默认模板` 或 `Vue3 版本`
5. 输入项目名称，点击创建

### 方式二：通过命令行创建（推荐开发者）

```bash
# 1. 创建项目（使用 Vue3 + TypeScript + Vite 模板）
npx degit dcloudio/uni-preset-vue#vite-ts uniapp-ai-psychological

cd uniapp-ai-psychological

# 2. 安装依赖
npm install
```

---

## 第二步：安装核心依赖

```bash
# 状态管理
npm install pinia

# 网络请求库（适配小程序）
npm install luch-request

# 样式预处理
npm install sass

# 国际化（可选）
npm install vue-i18n
```

---

## 第三步：配置项目

### 1. 配置 vite.config.ts

```typescript
import { defineConfig } from "vite";
import uni from "@dcloudio/vite-plugin-uni";
import path from "path";

export default defineConfig({
  plugins: [uni()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});
```

### 2. 配置 tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "preserve",
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.vue"]
}
```

---

## 第四步：创建项目目录结构

```bash
mkdir src
mkdir src/pages
mkdir src/api
mkdir src/stores
mkdir src/utils
mkdir src/composables
mkdir src/config
mkdir src/global
mkdir src/static
mkdir src/static/icons
```

最终结构：
```
uniapp-ai-psychological/
├── src/
│   ├── api/              # API 接口
│   │   ├── user.ts
│   │   ├── consultation.ts
│   │   ├── emotion-diary.ts
│   │   ├── knowledge.ts
│   │   └── ai.ts
│   ├── composables/      # 组合式函数
│   │   ├── useConsultationStream.ts
│   │   ├── useConsultationEmotion.ts
│   │   └── useConsultationSessions.ts
│   ├── config/           # 配置文件
│   │   └── index.js
│   ├── global/           # 全局常量
│   │   └── constants.js
│   ├── pages/            # 页面
│   │   ├── home/
│   │   │   └── index.vue
│   │   ├── consultation/
│   │   │   └── index.vue
│   │   ├── emotion/
│   │   │   └── diary.vue
│   │   ├── knowledge/
│   │   │   ├── index.vue
│   │   │   └── detail.vue
│   │   ├── mine/
│   │   │   └── index.vue
│   │   └── auth/
│   │   │   ├── login.vue
│   │   │   └── register.vue
│   ├── static/           # 静态资源
│   │   └── icons/
│   ├── stores/           # 状态管理
│   │   └── login.ts
│   ├── utils/            # 工具函数
│   │   ├── request.ts    # 网络请求
│   │   ├── cache.ts      # 本地缓存
│   │   └── sse.ts        # SSE 流式请求
│   ├── App.vue           # 应用入口
│   ├── main.ts           # 主入口
│   ├── pages.json        # 页面配置
│   ├── manifest.json     # 应用配置
│   └── uni.scss          # 全局样式
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## 第五步：配置 pages.json（页面路由）

`src/pages.json`：

```json
{
  "pages": [
    {
      "path": "pages/home/index",
      "style": {
        "navigationBarTitleText": "首页",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/consultation/index",
      "style": {
        "navigationBarTitleText": "AI 陪伴",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/emotion/diary",
      "style": {
        "navigationBarTitleText": "情绪日记"
      }
    },
    {
      "path": "pages/knowledge/index",
      "style": {
        "navigationBarTitleText": "知识库"
      }
    },
    {
      "path": "pages/mine/index",
      "style": {
        "navigationBarTitleText": "我的",
        "navigationStyle": "custom"
      }
    },
    {
      "path": "pages/auth/login",
      "style": {
        "navigationBarTitleText": "登录",
        "navigationStyle": "custom"
      }
    }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "white",
    "navigationBarTitleText": "校园AI心理陪伴",
    "navigationBarBackgroundColor": "#4A90D9",
    "backgroundColor": "#F5F5F5"
  },
  "tabBar": {
    "color": "#909399",
    "selectedColor": "#4A90D9",
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
        "iconPath": "static/icons/book.png",
        "selectedIconPath": "static/icons/book-active.png"
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

---

## 第六步：配置 manifest.json（应用配置）

`src/manifest.json`：

```json
{
  "name": "校园AI心理陪伴",
  "appid": "",
  "description": "基于AI的心理健康陪伴应用",
  "versionName": "1.0.0",
  "versionCode": "100",
  "transformPx": true,
  "mp-weixin": {
    "appid": "你的微信小程序AppID",
    "setting": {
      "urlCheck": false,
      "es6": true,
      "enhance": true,
      "minified": true
    },
    "usingComponents": true
  },
  "h5": {
    "devServer": {
      "port": 5174,
      "proxy": {
        "/api": {
          "target": "http://localhost:3000",
          "changeOrigin": true
        }
      }
    },
    "router": {
      "mode": "hash"
    }
  },
  "vueVersion": "3"
}
```

---

## 第七步：创建入口文件

### main.ts

`src/main.ts`：

```typescript
import { createSSRApp } from "vue";
import { createPinia } from 'pinia'
import App from "./App.vue";

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia()
  app.use(pinia)
  return {
    app,
  };
}
```

### App.vue

`src/App.vue`：

```vue
<script setup lang="ts">
import { onLaunch } from "@dcloudio/uni-app";
import useLoginStore from "@/stores/login";

const loginStore = useLoginStore();

onLaunch(() => {
  // 应用启动时加载本地缓存
  loginStore.loadLocalCache();
});
</script>

<style>
/* 全局样式 */
page {
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

/* 安全区域底部间距 */
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* 图片自适应 */
image {
  width: 100%;
  height: auto;
}
</style>
```

---

## 第八步：创建配置文件

`src/config/index.js`：

```javascript
// 开发环境
const DEV_BASE_URL = 'http://localhost:3000'

// 生产环境
const PROD_BASE_URL = 'https://your-domain.com'

// 根据环境选择 baseURL
export const BASE_URL = process.env.NODE_ENV === 'development' ? DEV_BASE_URL : PROD_BASE_URL

// 请求超时时间
export const TIME_OUT = 10000
```

---

## 第九步：创建全局常量

`src/global/constants.js`：

```javascript
// 本地存储 key
export const LOGIN_TOKEN = 'login_token'
export const USER_INFO = 'user_info'

// 其他常量
export const APP_NAME = '校园AI心理陪伴'
```

---

## 第十步：创建工具函数

### 网络请求封装

`src/utils/request.ts`：

```typescript
import Request from "luch-request";
import { BASE_URL, TIME_OUT } from "@/config";
import { LOGIN_TOKEN } from "@/global/constants";

const http = new Request({
  baseURL: BASE_URL,
  timeout: TIME_OUT,
  header: {},
});

// 请求拦截器
http.interceptors.request.use(
  (config) => {
    const token = uni.getStorageSync(LOGIN_TOKEN);
    if (token) {
      config.header = config.header || {};
      config.header["token"] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
http.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data.code === 200) return data.data;
    // 未登录，跳转登录页
    if (data.code === -1) {
      uni.removeStorageSync(LOGIN_TOKEN);
      uni.reLaunch({ url: "/pages/auth/login" });
      return Promise.reject(data);
    }
    uni.showToast({ title: data.msg || "请求失败", icon: "none" });
    return Promise.reject(data);
  },
  (error) => {
    uni.showToast({ title: "网络异常", icon: "none" });
    return Promise.reject(error);
  }
);

export default http;
```

### 本地缓存封装

`src/utils/cache.ts`：

```typescript
export const localCache = {
  setCache(key: string, value: any) {
    uni.setStorageSync(key, value);
  },
  getCache(key: string) {
    return uni.getStorageSync(key);
  },
  removeCache(key: string) {
    uni.removeStorageSync(key);
  },
  clearCache() {
    uni.clearStorageSync();
  }
};
```

---

## 第十一步：创建状态管理

`src/stores/login.ts`：

```typescript
import { defineStore } from "pinia";
import { localCache } from "@/utils/cache";
import { LOGIN_TOKEN, USER_INFO } from "@/global/constants";

const useLoginStore = defineStore("login", {
  state: () => ({
    token: "",
    userInfo: {} as any
  }),
  actions: {
    setToken(token: string) {
      this.token = token;
      localCache.setCache(LOGIN_TOKEN, token);
    },
    setUserInfo(userInfo: any) {
      this.userInfo = { ...userInfo };
      localCache.setCache(USER_INFO, userInfo);
    },
    loginAction(token: string, userInfo: any) {
      this.setToken(token);
      this.setUserInfo(userInfo);
      uni.switchTab({ url: "/pages/home/index" });
    },
    loadLocalCache() {
      const t = localCache.getCache(LOGIN_TOKEN);
      if (t) this.token = t;
      const u = localCache.getCache(USER_INFO);
      if (u) this.userInfo = { ...u };
    },
    logout() {
      this.token = "";
      this.userInfo = {};
      localCache.removeCache(LOGIN_TOKEN);
      localCache.removeCache(USER_INFO);
      uni.reLaunch({ url: "/pages/auth/login" });
    }
  }
});

export default useLoginStore;
```

---

## 第十二步：创建 API 接口

`src/api/user.ts`：

```typescript
import http from "@/utils/request";

// 登录
export function login(data: { username: string; password: string }) {
  return http.post("/api/user/login", data);
}

// 注册
export function register(data: { username: string; password: string; nickname?: string }) {
  return http.post("/api/user/register", data);
}

// 获取用户信息
export function getUserInfo() {
  return http.get("/api/user/info");
}

// 更新用户信息
export function updateUserInfo(data: any) {
  return http.put("/api/user/update", data);
}
```

---

## 第十三步：创建页面

### 首页示例

`src/pages/home/index.vue`：

```vue
<template>
  <view class="home-page">
    <view class="header">
      <text class="title">校园AI心理陪伴</text>
    </view>
    <view class="content">
      <!-- 页面内容 -->
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";

// 页面逻辑
</script>

<style scoped lang="scss">
.home-page {
  padding: 20rpx;

  .header {
    padding: 40rpx;
    background: #4A90D9;

    .title {
      color: #fff;
      font-size: 36rpx;
    }
  }
}
</style>
```

### 登录页示例

`src/pages/auth/login.vue`：

```vue
<template>
  <view class="login-page">
    <view class="form">
      <input v-model="username" placeholder="请输入用户名" />
      <input v-model="password" type="password" placeholder="请输入密码" />
      <button @click="handleLogin">登录</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { login } from "@/api/user";
import useLoginStore from "@/stores/login";

const loginStore = useLoginStore();
const username = ref("");
const password = ref("");

const handleLogin = async () => {
  if (!username.value || !password.value) {
    uni.showToast({ title: "请填写完整信息", icon: "none" });
    return;
  }

  try {
    const res = await login({
      username: username.value,
      password: password.value
    });
    loginStore.loginAction(res.token, res.userInfo);
  } catch (err) {
    console.error(err);
  }
};
</script>

<style scoped lang="scss">
.login-page {
  padding: 100rpx 40rpx;

  input {
    margin-bottom: 30rpx;
    padding: 20rpx;
    border: 1rpx solid #ddd;
    border-radius: 10rpx;
  }

  button {
    background: #4A90D9;
    color: #fff;
  }
}
</style>
```

---

## 第十四步：配置启动脚本

`package.json`：

```json
{
  "scripts": {
    "dev:h5": "uni",
    "dev:mp-weixin": "uni -p mp-weixin",
    "build:h5": "uni build",
    "build:mp-weixin": "uni build -p mp-weixin",
    "type-check": "vue-tsc --noEmit"
  }
}
```

---

## 第十五步：运行项目

### 开发环境

```bash
# H5 端开发
npm run dev:h5

# 微信小程序开发
npm run dev:mp-weixin
```

### 生产构建

```bash
# 构建 H5
npm run build:h5

# 构建微信小程序
npm run build:mp-weixin
```

---

## 第十六步：微信小程序调试

1. 运行 `npm run dev:mp-weixin`
2. 打开**微信开发者工具**
3. 导入项目：选择 `dist/dev/mp-weixin` 目录
4. 输入 AppID（在 manifest.json 中配置）
5. 开始调试

---

## 开发顺序总结

| 顺序 | 步骤 | 说明 |
|:----:|------|------|
| 1 | 创建项目 | `npx degit` 或 HBuilderX |
| 2 | 安装依赖 | pinia、luch-request、sass 等 |
| 3 | 配置 vite | `vite.config.ts` |
| 4 | 配置 TypeScript | `tsconfig.json` |
| 5 | 创建目录结构 | pages、api、stores、utils 等 |
| 6 | 配置页面路由 | `pages.json` |
| 7 | 配置应用信息 | `manifest.json` |
| 8 | 创建入口文件 | `main.ts`、`App.vue` |
| 9 | 创建配置文件 | `config/index.js` |
| 10 | 创建全局常量 | `global/constants.js` |
| 11 | 创建工具函数 | `utils/request.ts`、`cache.ts` |
| 12 | 创建状态管理 | `stores/login.ts` |
| 13 | 创建 API 接口 | `api/*.ts` |
| 14 | 创建页面 | `pages/**/*.vue` |
| 15 | 配置启动脚本 | `package.json` scripts |
| 16 | 运行调试 | `npm run dev:mp-weixin` |

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev:h5` | H5 端开发 |
| `npm run dev:mp-weixin` | 微信小程序开发 |
| `npm run build:mp-weixin` | 构建微信小程序 |
| `npm run build:h5` | 构建 H5 |

---

## 项目依赖说明

### 生产依赖

| 包名 | 用途 |
|------|------|
| `@dcloudio/uni-app` | UniApp 核心框架 |
| `@dcloudio/uni-mp-weixin` | 微信小程序适配 |
| `pinia` | 状态管理 |
| `luch-request` | 网络请求（适配小程序） |
| `sass` | CSS 预处理器 |
| `vue` | Vue 3 |

### 开发依赖

| 包名 | 用途 |
|------|------|
| `@dcloudio/vite-plugin-uni` | UniApp Vite 插件 |
| `@dcloudio/types` | UniApp 类型定义 |
| `typescript` | TypeScript 编译器 |
| `vite` | 构建工具 |
| `vue-tsc` | Vue TypeScript 检查 |

---

## UniApp 特殊语法说明

### 条件编译

```vue
<!-- 仅在 H5 端显示 -->
<!-- #ifdef H5 -->
<view class="h5-only">H5 专属内容</view>
<!-- #endif -->

<!-- 仅在微信小程序端显示 -->
<!-- #ifdef MP-WEIXIN -->
<view class="wx-only">微信小程序专属内容</view>
<!-- #endif -->
```

### UniApp API

```typescript
// 页面跳转
uni.navigateTo({ url: '/pages/detail/index' })
uni.switchTab({ url: '/pages/home/index' })  // 跳转 tabBar 页面
uni.redirectTo({ url: '/pages/login/index' }) // 关闭当前页面跳转

// 提示
uni.showToast({ title: '成功', icon: 'success' })
uni.showLoading({ title: '加载中' })

// 本地存储
uni.setStorageSync('key', 'value')
uni.getStorageSync('key')

// 获取系统信息
uni.getSystemInfoSync()
```

---

## 注意事项

1. **tabBar 页面必须使用 `uni.switchTab` 跳转**
2. **小程序不支持 DOM 操作**，只能使用 UniApp 提供的组件
3. **网络请求域名需要在小程序后台配置**（开发环境可关闭校验）
4. **图片使用 `image` 组件**，不是 `img`
5. **样式单位推荐使用 `rpx`**（自适应不同屏幕）