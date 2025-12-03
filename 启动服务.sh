#!/bin/bash

# 颜色定义
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 确保在脚本所在目录运行
cd "$(dirname "$0")"

echo -e "${YELLOW}=================================================${NC}"
echo -e "${YELLOW}   智能翻译系统 - 一键启动助手 (带代理支持)   ${NC}"
echo -e "${YELLOW}=================================================${NC}"

# 1. 自动配置代理
echo -e "\n${GREEN}[1/4] 正在配置网络代理...${NC}"
if [ -f "./vpn-setup/enable_proxy.sh" ]; then
    chmod +x ./vpn-setup/enable_proxy.sh
    # 使用 source 确保环境变量在当前脚本生效
    source ./vpn-setup/enable_proxy.sh
else
    echo -e "${RED}❌ 找不到代理配置文件 ./vpn-setup/enable_proxy.sh${NC}"
fi

# 2. 网络连通性测试
echo -e "\n${GREEN}[2/4] 正在测试网络连接 (Google)...${NC}"
echo "正在尝试连接 https://www.google.com ..."
if curl -I -s --connect-timeout 5 https://www.google.com > /dev/null; then
    echo -e "${GREEN}✅ 网络连接成功！代理工作正常。${NC}"
else
    echo -e "${RED}❌ 无法连接到 Google。${NC}"
    echo -e "${YELLOW}⚠️  警告：如果您的本地VPN未开启或未共享，DeepSeek/OpenAI 可能会连接超时。${NC}"
    echo -e "${YELLOW}请确认：${NC}"
    echo "1. 您是否使用了 'connect_with_vpn.vbs' 脚本连接服务器？"
    echo "2. 您的本地电脑是否开启了 VPN (Clash/v2ray)？"
    
    echo -e "\n按 Enter 键继续启动 (或按 Ctrl+C 取消)..."
    read -r
fi

# 3. 清理旧进程
echo -e "\n${GREEN}[3/4] 清理旧的服务进程...${NC}"
pkill -f "vite"
pkill -f "node server/index.js"
# 等待一下确保端口释放
sleep 2
echo "✅ 旧进程已清理"

# 4. 启动服务
echo -e "\n${GREEN}[4/4] 正在启动服务...${NC}"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}检测到首次运行，正在安装依赖...${NC}"
    npm install
fi

# 后台启动后端
echo "启动后端服务..."
nohup npm run server > server.log 2>&1 &
SERVER_PID=$!
echo "   - 后端服务已启动 (PID: $SERVER_PID)"

# 等待后端端口就绪 (可选)
sleep 3

# 后台启动前端
echo "启动前端服务..."
nohup npm run dev > dev.log 2>&1 &
DEV_PID=$!
echo "   - 前端服务已启动 (PID: $DEV_PID)"

echo -e "\n${GREEN}🎉🎉🎉 服务启动完成！ 🎉🎉🎉${NC}"
echo -e "-----------------------------------"
echo -e "前端访问地址: http://localhost:3431"
echo -e "后端接口地址: http://localhost:3001"
echo -e "-----------------------------------"
echo -e "提示: 请确保您使用了最新的 connect_with_vpn.vbs 脚本连接，"
echo -e "      否则您无法在本地浏览器访问上述地址。"
echo -e "-----------------------------------"
