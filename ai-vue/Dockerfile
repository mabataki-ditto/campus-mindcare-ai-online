# 前端构建阶段：安装依赖并生成 dist。
FROM node:24-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 前端运行阶段：使用 Nginx 托管静态文件。
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
