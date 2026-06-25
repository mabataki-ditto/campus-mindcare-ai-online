import { Router, Request, Response } from "express"; // Express 路由和类型
import bcrypt from "bcryptjs"; // 密码加密库，用于哈希和比对密码
import jwt from "jsonwebtoken"; // JWT 库，用于签发和验证 token
import prisma from "../utils/prisma"; // Prisma 客户端，用于数据库操作
import { success, fail } from "../utils/response"; // 统一响应工具函数
import { authMiddleware } from "../middleware/auth"; // JWT 认证中间件
import { config } from "../config"; // 配置文件，包含 jwtSecret 和过期时间

const router = Router();

/**
 * @swagger
 * /user/login:
 *   post:
 *     tags: [用户认证]
 *     summary: 用户登录
 *     description: 验证用户名密码，返回 JWT token 及用户信息
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code: { type: number, example: 200 }
 *                 data:
 *                   type: object
 *                   properties:
 *                     token: { type: string }
 *                     userInfo: { $ref: '#/components/schemas/User' }
 *                     menus: { type: array, items: { type: object } }
 *                 message: { type: string, example: 登录成功 }
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    // 参数校验：用户名和密码不能为空
    if (!username || !password) {
      return res.json(fail("用户名和密码不能为空"));
    }

    // 查询用户：根据用户名查找
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.json(fail("用户名或密码错误")); // 用户不存在，返回模糊错误提示
    }

    // 密码比对：bcrypt.compare 比对明文密码和数据库中的哈希密码
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.json(fail("用户名或密码错误")); // 密码错误，返回模糊错误提示
    }

    // 状态检查：账户是否被禁用
    if (user.status === 0) {
      return res.json(fail("账户已被禁用"));
    }

    // 签发 JWT token：payload 包含 userId、username、userType
    // expiresIn 设置过期时间（如 7d），过期后需要重新登录
    const token = jwt.sign(
      { userId: user.id, username: user.username, userType: user.userType },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn } as jwt.SignOptions,
    );

    // 管理员查询菜单权限：userType === 2 才需要查询菜单
    let menus: any[] = [];
    if (user.userType === 2) {
      // 多表联查：User → UserRole → Role → RoleMenu → Menu
      // 查询用户的所有角色，以及每个角色关联的所有菜单
      const userRoles = await prisma.userRole.findMany({
        where: { userId: user.id },
        include: {
          role: {
            include: {
              roleMenus: {
                include: { menu: true }, // 嵌套加载菜单详情
              },
            },
          },
        },
      });

      // 用 Map 去重：同一用户可能多个角色，菜单可能有重复
      const menuSet = new Map<number, any>();
      for (const ur of userRoles) {
        for (const rm of ur.role.roleMenus) {
          if (!menuSet.has(rm.menu.id)) {
            menuSet.set(rm.menu.id, {
              id: rm.menu.id,
              parentId: rm.menu.parentId,
              name: rm.menu.name,
              type: rm.menu.type, // 1=目录, 2=菜单, 3=按钮
              icon: rm.menu.icon,
              path: rm.menu.path,
              component: rm.menu.component,
              permission: rm.menu.permission, // 权限码，用于按钮权限控制
              sort: rm.menu.sort,
              children: [],
            });
          }
        }
      }
      menus = Array.from(menuSet.values());

      // 构建菜单树：将扁平数组转成树形结构（parentId === 0 是顶级菜单）
      const menuTree = menus.filter((m) => m.parentId === 0);
      const buildTree = (parents: any[]) => {
        for (const parent of parents) {
          // 找到当前菜单的所有子菜单
          parent.children = menus.filter((m) => m.parentId === parent.id);
          // 递归构建子菜单的子菜单
          buildTree(parent.children);
        }
      };
      buildTree(menuTree);
      menus = menuTree;
    }

    // 返回登录成功响应：token + userInfo + menus
    return res.json(
      success(
        {
          token,
          userInfo: {
            id: user.id,
            username: user.username,
            nickname: user.nickname,
            userType: user.userType, // 前端路由守卫根据 userType 判断权限
            avatar: user.avatar,
            riskLevel: user.riskLevel,
          },
          menus, // 管理员才有菜单数据，前端动态生成路由
        },
        "登录成功",
      ),
    );
  } catch (err: any) {
    return res.json(fail(err.message));
  }
});


router.post("/add", async (req: Request, res: Response) => {
  try {
    const { username, password, email, nickname, phone, gender, userType } =
      req.body;

    // 参数校验：用户名和密码必填
    if (!username || !password) {
      return res.json(fail("用户名和密码不能为空"));
    }

    // 检查用户名是否已存在
    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.json(fail("用户名已存在"));
    }

    // 密码加密：bcrypt.hash 生成哈希密码，saltRounds=10
    // 加密后存入数据库，不存明文密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 注册接口强制 userType=1（普通用户），防止越权创建管理员
    const safeUserType = 1;

    // 创建用户：写入数据库
    const user = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        nickname: nickname || username, // 昵称默认为用户名
        phone,
        gender: gender || 0,
        userType: safeUserType,
      },
    });

    // 分配默认角色：查找 code='user' 的角色，关联到新用户
    const defaultRole = await prisma.role.findFirst({
      where: { code: "user" },
    });
    if (defaultRole) {
      await prisma.userRole.create({
        data: { userId: user.id, roleId: defaultRole.id },
      });
    }

    return res.json(success({ userId: user.id }, "注册成功"));
  } catch (err: any) {
    return res.json(fail(err.message));
  }
});

/**
 * @swagger
 * /user/logout:
 *   post:
 *     tags: [用户认证]
 *     summary: 用户登出
 *     description: 登出当前用户（前端需清除 token）
 *     responses:
 *       200:
 *         description: 登出成功
 */
router.post("/logout", authMiddleware, async (req: Request, res: Response) => {
  return res.json(success(null, "登出成功"));
});

export { router as userRouter };
