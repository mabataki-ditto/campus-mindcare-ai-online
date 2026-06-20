# 后端构建阶段：安装依赖、生成 Prisma Client、编译 TypeScript。
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
# 生成 Prisma Client 不需要连接真实数据库，提供占位连接串即可。
ENV DATABASE_URL="mysql://root:password@localhost:3306/ai_psychological"
COPY prisma.config.ts ./
RUN npx prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
# 单独编译 seed.ts 到 dist/prisma/seed.js
RUN npx tsc prisma/seed.ts --outDir dist/prisma --module commonjs --target ES2020 --esModuleInterop --skipLibCheck --moduleResolution node

# 后端运行阶段：只保留生产依赖和编译后的 dist。
FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV DATABASE_URL="mysql://root:password@localhost:3306/ai_psychological"

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY uploads/.gitkeep ./uploads/.gitkeep

EXPOSE 3000
CMD ["node", "dist/index.js"]
