import type { IUserMenu } from '@/types'

const staticMenus: IUserMenu[] = [
  {
    id: 1,
    name: '数据分析',
    type: 2,
    url: '/main/dashboard',
    icon: 'PieChart'
  },
  {
    id: 2,
    name: '知识文章',
    type: 2,
    url: '/main/knowledge',
    icon: 'ChatLineSquare'
  },
  {
    id: 3,
    name: 'AI陪伴记录',
    type: 2,
    url: '/main/consultation',
    icon: 'Message'
  },
  {
    id: 4,
    name: '心情档案',
    type: 2,
    url: '/main/emotional',
    icon: 'User'
  }
]

export function getStaticMenus(): IUserMenu[] {
  return staticMenus
}