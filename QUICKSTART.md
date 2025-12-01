# 快速启动指南 - 本地Agent模式

## 1. 安装依赖

```bash
npm install
```

## 2. 配置环境变量

创建 `.env` 文件（如果还没有）：

```bash
# 服务器配置
PORT=3001
NODE_ENV=development

# 使用本地Agent模式
USE_LOCAL_AGENT=true

# Claude API密钥（必需）
ANTHROPIC_API_KEY=sk-ant-your-api-key-here

# 飞书配置（可选，不配置会使用模拟数据）
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret
```

## 3. 启动服务

### 方式一：使用启动脚本（推荐）

```bash
chmod +x start-dev.sh
./start-dev.sh
```

### 方式二：分别启动

```bash
# 终端1 - 启动后端
npm run server

# 终端2 - 启动前端
npm run dev
```

## 4. 访问应用

打开浏览器访问：http://localhost:5173

## 5. 测试翻译

1. 在文本框中输入中文文本
2. 点击「提交文本」
3. 查看分析结果和术语建议
4. 确认术语（或修改）
5. 点击「开始翻译」
6. 查看翻译结果

## 验证安装

检查服务器日志，应该看到：

```
🚀 服务器运行在端口 3001
📊 环境: development
🔧 模式: 本地Agent
🔍 Claude API Key: 已配置
🔍 飞书配置: ⚠️  未配置（将使用模拟数据）
```

## 常见问题

### Q: 提示"Claude API密钥未配置"
**A:** 检查 `.env` 文件中的 `ANTHROPIC_API_KEY` 是否正确设置。

### Q: 前端无法连接后端
**A:** 
1. 确认后端在 3001 端口运行
2. 检查 `vite.config.js` 中的代理配置
3. 查看浏览器控制台错误信息

### Q: 翻译结果为空
**A:** 
1. 检查 Claude API 额度
2. 查看后端日志 `logs/error.log`
3. 确认文本不为空

## 下一步

- 阅读 [README-LOCAL-AGENT.md](./README-LOCAL-AGENT.md) 了解详细架构
- 查看 [architecture.md](./architecture.md) 了解系统设计
- 配置飞书API实现持久化术语库

## 获取Claude API密钥

1. 访问 https://console.anthropic.com/
2. 注册/登录账号
3. 进入 API Keys 页面
4. 创建新的 API Key
5. 复制密钥到 `.env` 文件

## 目录结构

```
translate/
├── server/              # 后端代码
│   ├── agent/          # 本地Agent实现
│   │   ├── index.js    # Agent协调器
│   │   └── tools/      # 三个MCP工具
│   └── routes/         # API路由
├── src/                # 前端Vue代码
├── logs/               # 日志文件
├── uploads/            # 上传文件目录
└── .env                # 环境配置（需手动创建）
```

## 帮助

如有问题，请查看：
- 日志文件：`logs/combined.log`
- 错误日志：`logs/error.log`
- 详细文档：`README-LOCAL-AGENT.md`


