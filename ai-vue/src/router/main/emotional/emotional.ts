import type { RouteRecordRaw } from 'vue-router'

const emotionalRoute: RouteRecordRaw = {
  path: '/main/emotional',
  name: 'Emotional',
  component: () => import('@/views/backend/emotional.vue'),
  meta: {
    title: '心情档案',
    icon: 'User'
  }
}

export default emotionalRoute