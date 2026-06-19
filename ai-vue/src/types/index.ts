export interface IUserInfo {
  id: number
  username: string
  userType: number
}

export interface ILoginResponse {
  token: string
  userInfo: IUserInfo
}

export interface IUserMenu {
  id: number
  name: string
  type: number
  url: string
  icon: string
  permission?: string
  children?: IUserMenu[]
}

export interface IApiResponse<T = any> {
  code: number
  data: T
  msg?: string
}