/**
 * 全局路由守卫
 * 实现基于角色的访问控制（RBAC）
 *
 * 权限规则：
 * 1. 管理端（/main）需要 userType === 2 且有 token
 * 2. 普通用户只能访问用户端（/）和认证页（/auth）
 * 3. 未登录用户只能访问用户端和认证页
 */

import router from '@/router'
import useLoginStore from '@/stores/login/login'
import { localCache } from '@/utils/cache'
import type { IUserInfo } from '@/types'
import { LOGIN_TOKEN, USER_INFO } from '@/global/constants'
import { firstMenu } from '@/utils/map-menus'

router.beforeEach((to, _from, next) => {
  // 从本地缓存获取 token 和用户信息
  const token = localCache.getCache<string>(LOGIN_TOKEN)
  const userInfo = localCache.getCache<IUserInfo>(USER_INFO)

  // 判断是否为管理端路由
  const isMainRoute = to.path.startsWith('/main')

  // ==================== 需要认证的路由 ====================
  if (to.meta.requiresAuth || isMainRoute) {
    // 无 token -> 重定向到登录页
    if (!token) {
      return next('/auth/login')
    }

    // 确保 Pinia store 已加载本地缓存数据
    const loginStore = useLoginStore()
    if (!loginStore.userMenus.length) {
      loginStore.loadLocalCache()
    }

    // 直接访问 /main -> 重定向到第一个菜单项
    if (to.path === '/main') {
      if (firstMenu) {
        return next(firstMenu.url)
      }
    }

    // 权限判断：只有管理员（userType === 2）才能进入管理端
    const userType = Number(userInfo?.userType)
    if (userType === 2) {
      next() // 管理员放行
    } else {
      next('/') // 普通用户重定向到首页
    }
  } else {
    // ==================== 不需要认证的路由 ====================

    // 已登录用户的特殊处理
    if (token && userInfo) {
      const userType = Number(userInfo.userType)

      if (userType === 2) {
        // 管理员访问认证页 -> 重定向到管理后台
        if (to.path.startsWith('/auth')) {
          if (firstMenu) {
            return next(firstMenu.url)
          }
          return next('/main/dashboard')
        }
      } else {
        // 普通用户访问管理端/认证页/后台入口 -> 重定向到首页
        if (to.path.startsWith('/back') || to.path.startsWith('/main') || to.path.startsWith('/auth')) {
          return next('/')
        }
      }
    }

    // /back 路径 -> 重定向到登录页（兼容旧路径）
    if (to.path.startsWith('/back')) {
      return next('/auth/login')
    }

    // 其他情况放行
    next()
  }
})
