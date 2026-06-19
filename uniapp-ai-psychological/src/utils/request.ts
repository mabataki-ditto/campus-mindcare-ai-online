import Request from "luch-request";
import { BASE_URL, TIME_OUT } from "@/config";
import { LOGIN_TOKEN } from "@/global/constants";

const http = new Request({
  baseURL: BASE_URL,
  timeout: TIME_OUT,
  header: {},
});

http.interceptors.request.use(
  (config) => {
    const token = uni.getStorageSync(LOGIN_TOKEN);
    if (token) {
      config.header = config.header || {};
      config.header["token"] =
        typeof token === "string" ? token.replace(/^"|"$/g, "") : token;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

http.interceptors.response.use(
  (response) => {
    const data = response.data;
    if (data.code === 200 || data.success) return data.data;
    if (data.code === -1) {
      uni.removeStorageSync(LOGIN_TOKEN);
      uni.reLaunch({ url: "/pages/auth/login" });
      return Promise.reject(data);
    }
    uni.showToast({
      title: data.msg || data.message || "请求失败",
      icon: "none",
    });
    return Promise.reject(data);
  },
  (error) => {
    uni.showToast({ title: "网络异常", icon: "none" });
    return Promise.reject(error);
  },
);

export default http;
