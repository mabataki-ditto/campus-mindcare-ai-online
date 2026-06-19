import axios from 'axios'
import { ElMessage } from 'element-plus'

//创建axios实例
const service = axios.create({
  baseURL: '/api', //请求的前缀
  timeout: 30000 //请求超时时间
})

//请求拦截器
service.interceptors.request.use(
  (config) => {
    //在发送请求之前做些什么
    let token = localStorage.getItem('login/token') || localStorage.getItem('token')
    // localCache 存储时会 JSON.stringify，需要去掉引号
    if (token && token.startsWith('"') && token.endsWith('"')) {
      token = token.slice(1, -1)
    }
    if (token) {
      config.headers['token'] = token
    }
    return config
  },
  (error) => {
    //对请求错误做些什么
    return Promise.reject(error)
  }
)

//响应拦截器
service.interceptors.response.use(
  (response) => {
    //对响应数据做点什么
    const { data, config } = response
    //处理业务状态码
    if (data.code == 200) {
      return data.data
    } else {
      if (data.code == -1) {
        //-1代表超时
        if (!config.url?.includes('/login')) {
          //如果不是登录接口
          ElMessage.error(data.msg || '登录过期，请重新登录')

          //清除登录信息
          localStorage.removeItem('token')
          localStorage.removeItem('userInfo')
          window.location.href = '/auth/login'
        } else {
          ElMessage.error(data.msg || '登录过期，请重新登录')
        }
      } else {
        ElMessage.error(data.msg || '操作失败')
      }
      return Promise.reject(data)
    }
  },
  (error) => {
    //对响应错误做点什么
    return Promise.reject(error)
  }
)

export default service
