import type { RouteRecordRaw } from 'vue-router'

const knowledgeRoute: RouteRecordRaw = {
  path: '/main/knowledge',
  name: 'Knowledge',
  component: () => import('@/views/backend/knowledge.vue'),
  meta: {
    title: '知识文章',
    icon: 'ChatLineSquare'
  }
}

export default knowledgeRoute