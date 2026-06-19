class LocalCache {
  setCache(key: string, value: any) {
    if (value !== null && value !== undefined)
      uni.setStorageSync(key, JSON.stringify(value));
  }

  getCache(key: string) {
    const value = uni.getStorageSync(key);
    if (value) {
      try {
        return JSON.parse(value);
      } catch {
        // JSON 解析失败，尝试去除可能的引号包裹
        if (typeof value === "string") {
          const trimmed = value.replace(/^"|"$/g, "");
          // 如果去除引号后是有效 JSON，再次尝试解析
          try { return JSON.parse(trimmed); } catch { return trimmed; }
        }
        return value;
      }
    }
    return null;
  }

  removeCache(key: string) {
    uni.removeStorageSync(key);
  }
  clear() {
    uni.clearStorageSync();
  }
}
const localCache = new LocalCache();
export { localCache };
