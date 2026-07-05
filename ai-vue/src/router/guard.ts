import router from '@/router'
import useLoginStore from '@/stores/login/login'
import { localCache } from '@/utils/cache'
import type { IUserInfo } from '@/types'
import { LOGIN_TOKEN, USER_INFO } from '@/global/constants'

router.beforeEach((to, _from, next) => {
  const token = localCache.getCache<string>(LOGIN_TOKEN)
  const userInfo = localCache.getCache<IUserInfo>(USER_INFO)
  const isMainRoute = to.path.startsWith('/main')

  // 管理端和显式要求鉴权的页面统一走登录与角色校验
  if (to.meta.requiresAuth || isMainRoute) {
    if (!token) {
      return next('/auth/login')
    }

    const loginStore = useLoginStore()
    if (!loginStore.userMenus.length) {
      loginStore.loadLocalCache()
    }
    const firstMenuUrl = loginStore.userMenus[0]?.url

    // 访问 /main 时，重定向到后台默认菜单页
    if (to.path === '/main' && firstMenuUrl) {
      return next(firstMenuUrl)
    }

    const userType = Number(userInfo?.userType)
    if (userType === 2) {
      return next()
    }

    return next('/')
  }

  // 已登录用户访问公开页面时，按角色做兜底跳转
  if (token && userInfo) {
    const userType = Number(userInfo.userType)

    if (userType === 2) {
      if (to.path.startsWith('/auth')) {
        const loginStore = useLoginStore()
        if (!loginStore.userMenus.length) {
          loginStore.loadLocalCache()
        }
        const firstMenuUrl = loginStore.userMenus[0]?.url

        // 管理员不再回到登录/注册页，直接进入后台
        return next(firstMenuUrl || '/main/dashboard')
      }
    } else if (to.path.startsWith('/back') || to.path.startsWith('/main') || to.path.startsWith('/auth')) {
      return next('/')
    }
  }

  // 兼容旧后台入口，统一导向当前登录页
  if (to.path.startsWith('/back')) {
    return next('/auth/login')
  }

  next()
})
