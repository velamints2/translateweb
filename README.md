# 智能翻译工作流应用

> 🎉 **重要更新**: 本项目已升级为**本地Agent架构**，不再依赖Dify API！
>
> - 📖 [查看本地Agent文档](./README-LOCAL-AGENT.md)
> - 🚀 [快速开始指南](./QUICKSTART.md)
> - ⚙️ [环境配置说明](./ENV-CONFIG.md)

基于智能Agent的翻译应用，支持专有名词提炼和用户确认流程。

**新架构**: 本地Agent + Claude API + 飞书知识库（可选）  
**旧架构**: Dify工作流（仍可通过配置切换）

## 功能特性

### 🚀 核心功能
- **智能文本分析**：自动识别文本中的专有名词和翻译风格
- **专有名词确认**：用户可确认或自定义专有名词翻译
- **工作流翻译**：基于 Dify 工作流的高质量翻译
- **翻译记忆库**：自动保存确认的专有名词，提高后续翻译效率

### 🎨 用户体验
- **现代化界面**：基于 Vue 3 + Element Plus 的响应式设计
- **直观的工作流**：四步完成翻译流程（输入→确认→翻译→结果）
- **实时状态跟踪**：清晰展示每个步骤的进度和状态
- **历史记录管理**：完整的翻译历史查看和管理功能

### 🔧 技术特性
- **前后端分离**：Vue 3 前端 + Express 后端
- **API 包装器**：完整的 Dify API 封装和错误处理
- **会话管理**：基于会话的翻译流程管理
- **模拟数据**：内置演示数据，方便测试和演示

## 项目结构

```
translate/
├── src/                    # 前端源码
│   ├── views/             # 页面组件
│   ├── components/        # 通用组件
│   ├── api/              # API 接口
│   ├── router/           # 路由配置
│   └── main.js           # 应用入口
├── server/               # 后端服务
│   ├── routes/           # API 路由
│   └── index.js          # 服务器入口
├── package.json          # 项目配置
├── vite.config.js        # Vite 配置
└── README.md            # 项目文档
```

## 快速开始

### 环境要求
- Node.js 16.0 或更高版本
- npm 或 yarn 包管理器

### 安装依赖

```bash
# 安装项目依赖
npm install

# 或使用 yarn
yarn install
```

### 配置环境变量

1. 复制环境变量模板：
```bash
cp .env.example .env
```

2. 编辑 `.env` 文件，配置 Dify API：
```env
# Dify API配置
DIFY_API_KEY=your_dify_api_key_here
DIFY_BASE_URL=https://api.dify.ai/v1

# 服务器配置
PORT=3001
NODE_ENV=development
```

### 启动应用

#### 开发模式（推荐）

```bash
# 启动前端开发服务器（端口 3000）
npm run dev

# 启动后端 API 服务器（端口 3001）
npm run server
```

访问 http://localhost:3000 查看应用

#### 生产模式

```bash
# 构建前端
npm run build

# 启动生产服务器
npm run server
```

## API 接口文档

### 后端 API 端点

#### 1. 提交翻译文本
```http
POST /api/submit-text
Content-Type: application/json

{
  "text": "需要翻译的文本内容",
  "sessionId": "用户会话ID"
}
```

#### 2. 确认专有名词
```http
POST /api/confirm-nouns
Content-Type: application/json

{
  "sessionId": "用户会话ID",
  "confirmedNouns": [
    {
      "original": "专有名词原文",
      "translation": "确认的翻译"
    }
  ]
}
```

#### 3. 开始翻译
```http
POST /api/start-translation
Content-Type: application/json

{
  "sessionId": "用户会话ID"
}
```

#### 4. 获取会话状态
```http
GET /api/session/{sessionId}
```

### Dify API 集成

应用通过以下方式与 Dify 工作流集成：

1. **文本分析阶段**：发送分析提示到 Dify 工作流，提取专有名词和风格建议
2. **翻译阶段**：使用确认的专有名词构建翻译提示，发送到 Dify 工作流
3. **流式响应**：支持阻塞模式和流式模式（当前使用阻塞模式）

## 工作流程

### 1. 输入文本
用户输入需要翻译的文本内容，系统自动分析文本特征。

### 2. 专有名词提炼
- 系统识别文本中的专有名词
- 提供初步的翻译建议
- 用户可确认或修改翻译

### 3. 开始翻译
- 使用确认的专有名词配置
- 调用 Dify 工作流进行翻译
- 实时显示翻译进度

### 4. 查看结果
- 展示原文和译文的对比
- 显示翻译统计信息
- 提供复制和导出功能

## 配置说明

### Dify 工作流配置

确保你的 Dify 工作流包含以下节点：

1. **文本分析节点**：接收文本输入，输出专有名词和风格建议
2. **翻译节点**：接收文本和专有名词配置，输出翻译结果
3. **变量管理**：支持会话变量和专有名词配置

### 环境变量说明

| 变量名 | 说明 | 示例 |
|--------|------|------|
| DIFY_API_KEY | Dify API 密钥 | bearer_xxx |
| DIFY_BASE_URL | Dify API 基础地址 | https://api.dify.ai/v1 |
| PORT | 后端服务端口 | 3001 |
| NODE_ENV | 运行环境 | development/production |

## 故障排除

### 常见问题

1. **Dify API 连接失败**
   - 检查 API 密钥是否正确
   - 确认网络连接正常
   - 验证 Dify 工作流是否发布

2. **前端无法访问后端**
   - 确认后端服务正在运行（端口 3001）
   - 检查代理配置（vite.config.js）
   - 查看浏览器控制台错误信息

3. **专有名词识别不准确**
   - 优化 Dify 工作流中的提示词
   - 增加专有名词词典
   - 调整文本预处理逻辑

### 调试模式

启用详细日志输出：
```bash
# 设置环境变量
export DEBUG=true

# 启动应用
npm run dev
```

## 开发指南

### 添加新的翻译引擎

1. 在 `server/routes/translate.js` 中添加新的翻译函数
2. 实现对应的 API 接口
3. 在前端 `src/api/translate.js` 中添加调用方法
4. 更新界面支持引擎切换

### 自定义专有名词识别

修改 `extractProperNouns` 函数来改进识别逻辑：

```javascript
function extractProperNouns(answer) {
  // 添加自定义识别规则
  // 返回专有名词数组
}
```

### 扩展翻译记忆库

当前使用内存存储，可替换为数据库：

```javascript
// 替换 Map 为数据库操作
const translationMemory = new DatabaseConnection()
```

## 贡献指南

欢迎提交 Issue 和 Pull Request！

### 开发流程

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

### 代码规范

- 使用 ESLint 进行代码检查
- 遵循 Vue 3 组合式 API 规范
- 添加必要的注释和文档

## 许可证

MIT License

## 技术支持

如有问题，请提交 Issue 或联系开发团队。