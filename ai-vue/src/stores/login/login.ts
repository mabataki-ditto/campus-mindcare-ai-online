import { defineStore } from 'pinia'
import type { IUserInfo, IUserMenu } from '@/types'
import { localCache } from '@/utils/cache'
import { LOGIN_TOKEN, USER_INFO, USER_MENUS, USER_PERMISSIONS } from '@/global/constants'
import router from '@/router'
import { mapMenusToPermissions } from '@/utils/map-menus'
import { getStaticMenus } from '@/config/menus'

interface ILoginState {
  token: string
  userInfo: IUserInfo | null
  userMenus: IUserMenu[]
  permissions: string[]
}

const useLoginStore = defineStore('login', {
  state: (): ILoginState => ({
    token: '',
    userInfo: null,
    userMenus: [],
    permissions: []
  }),
  actions: {
    setToken(token: string) {
      this.token = token
      localCache.setCache(LOGIN_TOKEN, token)
    },
    setUserInfo(userInfo: IUserInfo) {
      this.userInfo = userInfo
      localCache.setCache(USER_INFO, userInfo)
    },
    setUserMenus(userMenus: IUserMenu[]) {
      this.userMenus = userMenus
      localCache.setCache(USER_MENUS, userMenus)

      const permissions = mapMenusToPermissions(userMenus)
      this.permissions = permissions
      localCache.setCache(USER_PERMISSIONS, permissions)
    },
    loginAction(token: string, userInfo: IUserInfo) {
      this.setToken(token)
      this.setUserInfo(userInfo)

      const staticMenus = getStaticMenus()
      this.setUserMenus(staticMenus)

      const userType = Number(userInfo.userType)
      if (userType === 2) {
        router.push('/main/dashboard')
      } else {
        router.push('/')
      }
    },
    loadLocalCache() {
      const token = localCache.getCache<string>(LOGIN_TOKEN)
      const userInfo = localCache.getCache<IUserInfo>(USER_INFO)
      const userMenus = localCache.getCache<IUserMenu[]>(USER_MENUS)

      if (token && userInfo) {
        this.token = token
        this.userInfo = userInfo

        if (userMenus && userMenus.length > 0) {
          this.userMenus = userMenus
          const permissions = mapMenusToPermissions(userMenus)
          this.permissions = permissions
          localCache.setCache(USER_PERMISSIONS, permissions)
        } else {
          const staticMenus = getStaticMenus()
          this.setUserMenus(staticMenus)
        }
      }
    },
    logout() {
      this.token = ''
      this.userInfo = null
      this.userMenus = []
      this.permissions = []

      localCache.removeCache(LOGIN_TOKEN)
      localCache.removeCache(USER_INFO)
      localCache.removeCache(USER_MENUS)
      localCache.removeCache(USER_PERMISSIONS)

      router.push('/auth/login')
    }
  }
})

export default useLoginStore
