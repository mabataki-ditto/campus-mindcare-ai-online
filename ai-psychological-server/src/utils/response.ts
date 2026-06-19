interface ApiResponse<T = any> {
  code: number
  msg: string
  data: T
  success?: boolean
}

export function success<T>(data: T, msg = '操作成功'): ApiResponse<T> {
  return { code: 200, msg, data, success: true }
}

export function fail(msg = '操作失败', code = 500): ApiResponse<null> {
  return { code, msg, data: null, success: false }
}

export function unauthorized(msg = '登录过期，请重新登录'): ApiResponse<null> {
  return { code: -1, msg, data: null, success: false }
}
