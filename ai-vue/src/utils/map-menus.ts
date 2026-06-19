import type { RouteRecordRaw } from 'vue-router'
import type { IUserMenu } from '@/types'

export let firstMenu: IUserMenu | null = null

export function mapMenusToRoutes(userMenus: IUserMenu[]): RouteRecordRaw[] {
  const localRoutes: RouteRecordRaw[] = []
  
  const modules = import.meta.glob('../router/main/**/*.ts', { eager: true })
  for (const path in modules) {
    const module = modules[path] as { default: RouteRecordRaw }
    if (module.default) {
      localRoutes.push(module.default)
    }
  }
  
  const routes: RouteRecordRaw[] = []
  for (const menu of userMenus) {
    if (menu.children) {
      for (const submenu of menu.children) {
        const route = localRoutes.find((r) => r.path === submenu.url)
        if (route) {
          if (!routes.find((r) => r.path === menu.url)) {
            routes.push({ path: menu.url, redirect: route.path })
          }
          routes.push(route)
        }
        if (!firstMenu && route) {
          firstMenu = submenu
        }
      }
    } else {
      const route = localRoutes.find((r) => r.path === menu.url)
      if (route) {
        routes.push(route)
      }
      if (!firstMenu && route) {
        firstMenu = menu
      }
    }
  }
  return routes
}

export function mapMenusToPermissions(userMenus: IUserMenu[]): string[] {
  const permissions: string[] = []
  
  function recurseGetPermission(menus: IUserMenu[]) {
    for (const item of menus) {
      if (item.type === 3 && item.permission) {
        permissions.push(item.permission)
      }
      if (item.children) {
        recurseGetPermission(item.children)
      }
    }
  }
  recurseGetPermission(userMenus)
  
  return permissions
}

export function mapPathToMenu(path: string, userMenus: IUserMenu[]): IUserMenu | undefined {
  for (const menu of userMenus) {
    if (menu.children) {
      for (const submenu of menu.children) {
        if (submenu.url === path) {
          return submenu
        }
      }
    } else {
      if (menu.url === path) {
        return menu
      }
    }
  }
}

export function mapPathToBreadcrumbs(path: string, userMenus: IUserMenu[]): IUserMenu[] {
  const breadcrumbs: IUserMenu[] = []
  
  for (const menu of userMenus) {
    if (menu.children) {
      for (const submenu of menu.children) {
        if (submenu.url === path) {
          breadcrumbs.push(menu)
          breadcrumbs.push(submenu)
        }
      }
    } else {
      if (menu.url === path) {
        breadcrumbs.push(menu)
      }
    }
  }
  return breadcrumbs
}