#!/bin/bash

# 测试运行脚本

echo "═══════════════════════════════════════════════════════════"
echo "🧪 翻译系统测试套件"
echo "═══════════════════════════════════════════════════════════"
echo ""

# 检查服务器是否运行
echo "🔍 检查服务器状态..."
if curl -s http://localhost:3001/health > /dev/null 2>&1; then
    echo "✅ 后端服务器正在运行"
else
    echo "⚠️  后端服务器未运行"
    echo "   请先运行: npm run server"
    echo ""
    read -p "是否现在启动服务器？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🚀 启动服务器..."
        npm run server &
        SERVER_PID=$!
        echo "   服务器PID: $SERVER_PID"
        echo "   等待5秒..."
        sleep 5
    else
        echo "❌ 测试需要服务器运行"
        exit 1
    fi
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📋 选择测试类型:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. 快速测试 (基础功能, ~30秒)"
echo "2. 综合测试 (全面测试, ~2分钟)"
echo "3. 压力测试 (性能测试, ~5分钟)"
echo "4. 完整测试 (所有测试, ~10分钟)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

read -p "请选择 (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🚀 运行快速测试..."
        npm run test:quick
        ;;
    2)
        echo ""
        echo "🚀 运行综合测试..."
        npm run test
        ;;
    3)
        echo ""
        echo "🚀 运行压力测试..."
        echo "⚠️  注意: 压力测试会产生大量请求"
        npm run test:stress
        ;;
    4)
        echo ""
        echo "🚀 运行完整测试..."
        echo "⚠️  注意: 这将需要较长时间"
        npm run test:all
        npm run test:stress
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac

TEST_EXIT_CODE=$?

echo ""
echo "═══════════════════════════════════════════════════════════"
if [ $TEST_EXIT_CODE -eq 0 ]; then
    echo "✅ 测试完成"
else
    echo "❌ 测试失败"
fi
echo "═══════════════════════════════════════════════════════════"

# 如果启动了服务器，询问是否关闭
if [ ! -z "$SERVER_PID" ]; then
    echo ""
    read -p "是否关闭测试服务器？(y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "🛑 关闭服务器..."
        kill $SERVER_PID
        echo "✅ 服务器已关闭"
    fi
fi

exit $TEST_EXIT_CODE


