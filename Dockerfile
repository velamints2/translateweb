# 多阶段构建：前端构建
FROM node:18-alpine as frontend-build

WORKDIR /app

# 复制package文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建前端
RUN npm run build

# 后端服务
FROM node:18-alpine

WORKDIR /app

# 复制package文件到根目录
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制server代码
COPY server ./server

# 复制构建结果
COPY --from=frontend-build /app/dist ./dist

# 暴露端口
EXPOSE 3001

# 启动服务
CMD ["node", "server/index.js"]