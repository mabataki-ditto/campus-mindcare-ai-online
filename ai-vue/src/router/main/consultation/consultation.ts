import type { RouteRecordRaw } from 'vue-router'

const consultationRoute: RouteRecordRaw = {
  path: '/main/consultation',
  name: 'Consultation',
  component: () => import('@/views/backend/consultation.vue'),
  meta: {
    title: 'AI陪伴记录',
    icon: 'Message'
  }
}

export default consultationRoute