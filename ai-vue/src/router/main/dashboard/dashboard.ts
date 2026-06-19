import type { RouteRecordRaw } from 'vue-router'

const dashboardRoute: RouteRecordRaw = {
  path: '/main/dashboard',
  name: 'Dashboard',
  component: () => import('@/views/backend/dashboard.vue'),
  meta: {
    title: '数据分析',
    icon: 'PieChart'
  }
}

export default dashboardRoute