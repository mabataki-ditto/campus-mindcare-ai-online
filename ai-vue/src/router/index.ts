import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const staticRoutes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/components/layouts/FrontendLayout.vue'),
    children: [
      {
        path: '',
        name: 'Home',
        component: () => import('@/views/frontend/home.vue'),
        meta: { title: '首页' }
      },
      {
        path: 'consultation',
        name: 'FrontendConsultation',
        component: () => import('@/views/frontend/consultation.vue'),
        meta: { title: 'AI心理陪伴' }
      },
      {
        path: 'emotion-diary',
        name: 'EmotionDiary',
        component: () => import('@/views/frontend/emotionDiary.vue'),
        meta: { title: '心情记录' }
      },
      {
        path: 'knowledge',
        name: 'FrontendKnowledge',
        component: () => import('@/views/frontend/knowledge.vue'),
        meta: { title: '知识库' }
      },
      {
        path: 'knowledge/article/:id',
        name: 'ArticleDetail',
        component: () => import('@/views/frontend/articleDetail.vue'),
        props: true,
        meta: { title: '文章详情' }
      }
    ]
  },
  {
    path: '/auth',
    component: () => import('@/components/layouts/AuthLayout.vue'),
    children: [
      {
        path: 'login',
        name: 'Login',
        component: () => import('@/views/auth/login.vue'),
        meta: { title: '登录' }
      },
      {
        path: 'register',
        name: 'Register',
        component: () => import('@/views/auth/register.vue'),
        meta: { title: '注册' }
      }
    ]
  },
  {
    path: '/main',
    name: 'main',
    component: () => import('@/components/layouts/BacKEndLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/backend/dashboard.vue'),
        meta: { title: '数据分析', icon: 'PieChart' }
      },
      {
        path: 'knowledge',
        name: 'Knowledge',
        component: () => import('@/views/backend/knowledge.vue'),
        meta: { title: '知识文章', icon: 'ChatLineSquare' }
      },
      {
        path: 'consultation',
        name: 'Consultation',
        component: () => import('@/views/backend/consultation.vue'),
        meta: { title: 'AI陪伴记录', icon: 'Message' }
      },
      {
        path: 'emotional',
        name: 'Emotional',
        component: () => import('@/views/backend/emotional.vue'),
        meta: { title: '心情档案', icon: 'User' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/not-found.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes: staticRoutes
})

export default router