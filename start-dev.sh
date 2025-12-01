#!/bin/bash

echo "🚀 启动智能翻译工作流应用..."

# 检查 Node.js 版本
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt "16" ]; then
    echo "❌ 需要 Node.js 16.0 或更高版本"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，使用示例配置"
    cp .env.example .env
    echo "📝 请编辑 .env 文件配置 Dify API 密钥"
fi

# 启动后端服务器
echo "🔧 启动后端服务器 (端口 3001)..."
npm run server &
BACKEND_PID=$!

# 等待后端启动
sleep 3

# 启动前端开发服务器
echo "🎨 启动前端开发服务器 (端口 3000)..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ 应用启动成功！"
echo "📊 前端地址: http://localhost:3000"
echo "🔧 后端地址: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止服务"

# 等待用户中断
wait $FRONTEND_PID

# 清理进程
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null

echo "👋 服务已停止"