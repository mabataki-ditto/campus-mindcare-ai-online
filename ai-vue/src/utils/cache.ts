enum CacheType {
  Local,
  Session
}

class Cache {
  private storage: Storage

  constructor(type: CacheType) {
    this.storage = type === CacheType.Local ? localStorage : sessionStorage
  }

  setCache<T>(key: string, value: T): void {
    if (value !== null && value !== undefined) {
      this.storage.setItem(key, JSON.stringify(value))
    }
  }

  getCache<T>(key: string): T | null {
    const value = this.storage.getItem(key)
    if (value) {
      return JSON.parse(value) as T
    }
    return null
  }

  removeCache(key: string): void {
    this.storage.removeItem(key)
  }

  clear(): void {
    this.storage.clear()
  }
}

const localCache = new Cache(CacheType.Local)
const sessionCache = new Cache(CacheType.Session)

export { localCache, sessionCache }
export type { Cache }