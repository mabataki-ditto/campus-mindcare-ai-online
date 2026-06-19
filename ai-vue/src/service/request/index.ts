import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import type { HYRequestConfig } from './type'
import { ElMessage } from 'element-plus'
import { localCache } from '@/utils/cache'
import { LOGIN_TOKEN, USER_INFO } from '@/global/constants'
import router from '@/router'

class HYRequest {
  private instance: AxiosInstance

  constructor(config: HYRequestConfig) {
    this.instance = axios.create(config)

    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localCache.getCache(LOGIN_TOKEN)
        if (token) {
          config.headers['token'] = token
        }
        return config
      },
      (err: any) => {
        return Promise.reject(err)
      }
    )

    this.instance.interceptors.response.use(
      (res: AxiosResponse) => {
        const { data } = res
        if (data.code === 200 || data.success) {
          return data.data
        } else {
          if (data.code === -1 || res.status === 401) {
            ElMessage.error(data.msg || data.message || '登录过期，请重新登录')
            localCache.removeCache(LOGIN_TOKEN)
            localCache.removeCache(USER_INFO)
            router.push('/auth/login')
          } else {
            ElMessage.error(data.msg || data.message || '请求失败')
          }
          return Promise.reject(data)
        }
      },
      (err: any) => {
        // 处理 HTTP 错误状态码（后端返回 401/403/500 等）
        if (err.response?.status === 401) {
          ElMessage.error('登录过期，请重新登录')
          localCache.removeCache(LOGIN_TOKEN)
          localCache.removeCache(USER_INFO)
          router.push('/auth/login')
        } else if (err.response?.status === 403) {
          ElMessage.error('无权限访问')
        } else {
          ElMessage.error(err.response?.data?.msg || '网络请求失败')
        }
        return Promise.reject(err)
      }
    )

    if (config.interceptors) {
      this.instance.interceptors.request.use(
        config.interceptors.requestSuccessFn,
        config.interceptors.requestFailureFn
      )
      this.instance.interceptors.response.use(
        config.interceptors.responseSuccessFn,
        config.interceptors.responseFailureFn
      )
    }
  }

  request<T>(config: HYRequestConfig<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.instance
        .request<any, T>(config)
        .then((res) => {
          resolve(res)
        })
        .catch((err) => {
          reject(err)
        })
    })
  }

  get<T>(config: HYRequestConfig<T>): Promise<T> {
    return this.request<T>({ ...config, method: 'GET' })
  }

  post<T>(config: HYRequestConfig<T>): Promise<T> {
    return this.request<T>({ ...config, method: 'POST' })
  }

  put<T>(config: HYRequestConfig<T>): Promise<T> {
    return this.request<T>({ ...config, method: 'PUT' })
  }

  delete<T>(config: HYRequestConfig<T>): Promise<T> {
    return this.request<T>({ ...config, method: 'DELETE' })
  }

  patch<T>(config: HYRequestConfig<T>): Promise<T> {
    return this.request<T>({ ...config, method: 'PATCH' })
  }
}

export default HYRequest