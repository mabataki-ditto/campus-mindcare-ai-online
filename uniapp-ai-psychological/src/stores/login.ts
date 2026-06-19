import { defineStore } from "pinia";
import { localCache } from "@/utils/cache";
import { LOGIN_TOKEN, USER_INFO } from "@/global/constants";

interface IUserInfo {
  id?: number
  username?: string
  nickname?: string
  userType?: number
  avatar?: string
  [key: string]: any
}

const useLoginStore = defineStore("login", {
  state: () => ({ token: "", userInfo: {} as IUserInfo }),
  actions: {
    setToken(token: string) {
      this.token = token;
      localCache.setCache(LOGIN_TOKEN, token);
    },
    setUserInfo(userInfo: any) {
      this.userInfo = { ...userInfo };
      localCache.setCache(USER_INFO, userInfo);
    },
    loginAction(token: string, userInfo: IUserInfo) {
      this.setToken(token);
      this.setUserInfo(userInfo);
      uni.switchTab({ url: "/pages/home/index" });
    },
    loadLocalCache() {
      const t = localCache.getCache(LOGIN_TOKEN);
      if (t) this.token = t;
      const u = localCache.getCache(USER_INFO);
      if (u) this.userInfo = { ...u };
    },
    logout() {
      this.token = "";
      this.userInfo = {};
      localCache.removeCache(LOGIN_TOKEN);
      localCache.removeCache(USER_INFO);
      uni.reLaunch({ url: "/pages/auth/login" });
    },
  },
});
export default useLoginStore;
