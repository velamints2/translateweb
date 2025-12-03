#!/bin/bash

# 默认代理地址 (Clash 默认端口)
PROXY_HOST="127.0.0.1"
PROXY_PORT="7890"

# 如果传入了参数，则使用参数
if [ -n "$1" ]; then
    PROXY_HOST="$1"
fi
if [ -n "$2" ]; then
    PROXY_PORT="$2"
fi

PROXY_URL="http://${PROXY_HOST}:${PROXY_PORT}"
SOCKS_URL="socks5://${PROXY_HOST}:${PROXY_PORT}"

echo "🔵 正在配置系统代理指向: $PROXY_URL"

# 1. 设置当前会话的环境变量
export http_proxy="$PROXY_URL"
export https_proxy="$PROXY_URL"
export ftp_proxy="$PROXY_URL"
export all_proxy="$SOCKS_URL"
export no_proxy="localhost,127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,*.local"

# 2. 写入 /etc/profile.d/ 以便重启后生效 (需要 root 权限)
if [ -w /etc/profile.d ]; then
    echo "📝 写入 /etc/profile.d/proxy.sh (全局生效)..."
    cat > /etc/profile.d/proxy.sh <<EOF
export http_proxy="$PROXY_URL"
export https_proxy="$PROXY_URL"
export ftp_proxy="$PROXY_URL"
export all_proxy="$SOCKS_URL"
export no_proxy="localhost,127.0.0.1,::1,10.0.0.0/8,172.16.0.0/12,192.168.0.0/16,*.local"
EOF
    chmod +x /etc/profile.d/proxy.sh
else
    echo "⚠️  无权写入 /etc/profile.d，仅当前会话生效"
fi

# 3. 配置 NPM 代理
if command -v npm &> /dev/null; then
    echo "📦 配置 NPM 代理..."
    npm config set proxy "$PROXY_URL"
    npm config set https-proxy "$PROXY_URL"
fi

# 4. 配置 Git 代理
if command -v git &> /dev/null; then
    echo "🔧 配置 Git 代理..."
    git config --global http.proxy "$PROXY_URL"
    git config --global https.proxy "$PROXY_URL"
fi

# 5. 配置 APT 代理 (Ubuntu/Debian)
if [ -d /etc/apt/apt.conf.d ]; then
    echo "📦 配置 APT 代理..."
    echo "Acquire::http::Proxy \"$PROXY_URL\";" > /etc/apt/apt.conf.d/95proxy
    echo "Acquire::https::Proxy \"$PROXY_URL\";" >> /etc/apt/apt.conf.d/95proxy
fi

echo "✅ 代理配置完成！"
echo "👉 请运行 'source /etc/profile' 或重新登录以确保所有终端生效"
echo "👉 测试命令: curl -I https://www.google.com"
