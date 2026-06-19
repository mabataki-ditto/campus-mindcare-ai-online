import { Request, Response, NextFunction } from 'express'
import { fail } from '../utils/response'

// 统一错误处理中间件
export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error('服务器错误:', err.message)
  res.status(500).json(fail(err.message || '服务器内部错误', 500))
}
