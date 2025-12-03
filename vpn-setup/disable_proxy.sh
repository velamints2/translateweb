#!/bin/bash

echo "⚪ 正在清除系统代理配置..."

# 1. 清除当前会话环境变量
unset http_proxy
unset https_proxy
unset ftp_proxy
unset all_proxy
unset no_proxy

# 2. 删除 /etc/profile.d/ 配置
if [ -f /etc/profile.d/proxy.sh ]; then
    echo "🗑️  删除 /etc/profile.d/proxy.sh..."
    rm /etc/profile.d/proxy.sh
fi

# 3. 清除 NPM 代理
if command -v npm &> /dev/null; then
    echo "📦 清除 NPM 代理..."
    npm config delete proxy
    npm config delete https-proxy
fi

# 4. 清除 Git 代理
if command -v git &> /dev/null; then
    echo "🔧 清除 Git 代理..."
    git config --global --unset http.proxy
    git config --global --unset https.proxy
fi

# 5. 清除 APT 代理
if [ -f /etc/apt/apt.conf.d/95proxy ]; then
    echo "📦 清除 APT 代理..."
    rm /etc/apt/apt.conf.d/95proxy
fi

echo "✅ 代理已清除！"
echo "👉 请运行 'source /etc/profile' 或重新登录"
