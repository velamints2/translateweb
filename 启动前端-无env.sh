#!/bin/bash

# 无需.env文件启动前端
# 解决macOS扩展属性问题

echo "🚀 启动前端服务器（无需.env模式）..."
echo ""

cd /Users/macbookair/Documents/trae_projects/translate

# Vite不需要读取.env也能启动
# 所有必要配置都在vite.config.js中

npm run dev

echo ""
echo "✅ 前端服务器已启动"
echo "📍 访问地址: http://localhost:3000"

