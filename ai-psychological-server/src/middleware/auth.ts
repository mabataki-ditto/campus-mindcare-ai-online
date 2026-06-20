import { Request, Response, NextFunction } from "express"; // Express 类型定义
import jwt from "jsonwebtoken"; // JWT 库，用于签发和验证 token
import { unauthorized, fail } from "../utils/response"; // 统一响应工具函数
import { config } from "../config"; // 配置文件，包含 jwtSecret

// 扩展 Express 的 Request 类型，添加 user 属性
// 这样后续中间件和路由可以通过 req.user 访问用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number; // 用户 ID
        username: string; // 用户名
        userType: number; // 用户类型：1=普通用户，2=管理员
      };
    }
  }
}

/**
 * JWT 认证中间件
 * 从请求头的 token 字段读取 JWT，验证有效性后解析用户信息
 * 验证通过：将用户信息挂载到 req.user，调用 next() 放行
 * 验证失败：返回 unauthorized 错误响应
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // 从请求头获取 token（前端 Axios 拦截器自动注入）
  const token = req.headers["token"] as string;

  // 没有 token，拒绝访问
  if (!token) {
    return res.status(401).json(unauthorized("未提供认证令牌"));
  }

  try {
    // 验证 token：检查签名是否正确、是否过期
    // jwt.verify 会用 jwtSecret 解密 token，返回 payload（用户信息）
    const decoded = jwt.verify(token, config.jwtSecret) as {
      userId: number;
      username: string;
      userType: number;
    };
    // 将解析出的用户信息挂载到 req.user，后续路由可以使用
    req.user = decoded;
    next(); // 放行，继续执行下一个中间件或路由处理函数
  } catch {
    // token 无效（伪造的、过期、签名错误）
    return res.status(401).json(unauthorized("登录过期，请重新登录"));
  }
}

/**
 * 可选认证中间件
 * 有 token 则解析挂载 req.user，无 token 也放行
 * 用于需要同时支持登录和未登录访问的公开接口（如知识库查询）
 */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.headers["token"] as string;

  if (token) {
    try {
      const decoded = jwt.verify(token, config.jwtSecret) as {
        userId: number;
        username: string;
        userType: number;
      };
      req.user = decoded;
    } catch {
      // token 无效也放行，只是不挂载 user 信息
    }
  }
  next();
}

/**
 * 管理员权限校验中间件
 * 必须在 authMiddleware 之后使用，依赖 req.user
 * 校验 userType 是否为 2（管理员）
 */
export function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // authMiddleware 已验证 token 并挂载 req.user
  // userType !== 2 表示不是管理员，拒绝访问
  if (req.user?.userType !== 2) {
    return res.status(403).json(fail("无管理员权限", 403));
  }
  next(); // 是管理员，放行
}
