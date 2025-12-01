#!/bin/bash

# 配置助手脚本
# 用于快速配置 .env 文件

echo "================================"
echo "🚀 翻译系统配置助手"
echo "================================"
echo ""

# 检查 .env 文件是否存在
if [ -f .env ]; then
    echo "✅ .env 文件已存在"
    echo ""
else
    echo "❌ .env 文件不存在，正在创建..."
    cp .env.example.local-agent .env 2>/dev/null || echo "未找到模板文件"
    echo "✅ .env 文件已创建"
    echo ""
fi

# 显示当前配置
echo "📋 当前配置状态："
echo "-----------------------------------"

# 检查各个配置项
if grep -q "ANTHROPIC_API_KEY=sk-ant-api03-your-api-key-here" .env 2>/dev/null; then
    echo "⚠️  ANTHROPIC_API_KEY: 未配置（需要替换）"
    NEED_CONFIG=true
elif grep -q "ANTHROPIC_API_KEY=$" .env 2>/dev/null; then
    echo "⚠️  ANTHROPIC_API_KEY: 未配置（值为空）"
    NEED_CONFIG=true
else
    echo "✅ ANTHROPIC_API_KEY: 已配置"
fi

if grep -q "FEISHU_APP_ID=$" .env 2>/dev/null; then
    echo "⚠️  FEISHU_APP_ID: 未配置（可选）"
else
    echo "✅ FEISHU_APP_ID: 已配置"
fi

if grep -q "USE_LOCAL_AGENT=true" .env 2>/dev/null; then
    echo "✅ 模式: 本地Agent"
else
    echo "ℹ️  模式: Dify API"
fi

echo "-----------------------------------"
echo ""

# 提供配置指引
if [ "$NEED_CONFIG" = true ]; then
    echo "📝 配置步骤："
    echo ""
    echo "1️⃣  获取 Claude API 密钥"
    echo "   访问: https://console.anthropic.com/"
    echo "   • 注册/登录账号"
    echo "   • 点击 'API Keys'"
    echo "   • 创建新密钥"
    echo "   • 复制密钥（格式: sk-ant-api03-...）"
    echo ""
    echo "2️⃣  配置 .env 文件"
    echo "   打开 .env 文件，找到这一行："
    echo "   ANTHROPIC_API_KEY=sk-ant-api03-your-api-key-here"
    echo ""
    echo "   替换为您的真实密钥："
    echo "   ANTHROPIC_API_KEY=sk-ant-api03-xxxxx"
    echo ""
    echo "3️⃣  启动服务"
    echo "   npm run server"
    echo ""
    echo "4️⃣  启动前端（新终端）"
    echo "   npm run dev"
    echo ""
    echo "5️⃣  访问应用"
    echo "   http://localhost:5173"
    echo ""
else
    echo "🎉 配置完成！可以启动服务了："
    echo ""
    echo "启动后端："
    echo "  npm run server"
    echo ""
    echo "启动前端（新终端）："
    echo "  npm run dev"
    echo ""
    echo "访问应用："
    echo "  http://localhost:5173"
    echo ""
fi

echo "================================"
echo "💡 提示："
echo "• 飞书配置是可选的，不影响核心功能"
echo "• 详细说明请查看: ENV-CONFIG.md"
echo "• 使用手册请查看: 产品使用说明.html"
echo "================================"


