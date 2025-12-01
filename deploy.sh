#!/bin/bash

# 翻译应用部署脚本
set -e

echo "🚀 开始部署翻译应用..."

# 检查Docker环境
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 构建并启动服务
echo "📦 构建Docker镜像..."
docker-compose build

echo "🛠️ 启动服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 健康检查
echo "🔍 检查服务状态..."
if curl -f http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 服务启动成功！"
    echo "🌍 应用访问地址: http://localhost:3001"
else
    echo "❌ 服务启动失败，请检查日志："
    docker-compose logs
    exit 1
fi

echo "🎉 部署完成！"