# 翻译MCP服务器

本地化的翻译服务，替代 Dify API，使用 MCP (Model Context Protocol) 架构。

## 架构说明

### 核心组件

1. **飞书知识库工具** (`feishu-knowledge-base.js`)
   - 从飞书云文档加载术语对照表
   - 查询特定术语翻译
   - 添加新术语到知识库

2. **预处理工具** (`preprocess-text.js`)
   - 分析文本内容和结构
   - 提取专有名词
   - 匹配术语库
   - 生成详细分析报告

3. **翻译Agent** (`translate-agent.js`)
   - 执行专业翻译
   - 应用确认的术语
   - 支持长文本自动分段
   - 保持翻译一致性

## 环境配置

在 `mcp-server` 目录下创建 `.env` 文件：

```bash
# Claude API密钥（必需）
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# 飞书应用配置（可选，如果不配置会使用模拟数据）
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret
```

## 安装依赖

```bash
cd mcp-server
npm install
```

## 启动服务器

```bash
npm start
```

或开发模式（自动重启）：

```bash
npm run dev
```

## MCP 工具说明

### 1. feishu_knowledge_base

加载和管理飞书知识库中的术语。

**参数：**
- `action`: 操作类型
  - `load`: 加载所有术语
  - `query`: 查询特定术语
  - `add`: 添加新术语

**示例：**

```json
{
  "action": "load"
}
```

```json
{
  "action": "query",
  "term": "激光雷达"
}
```

```json
{
  "action": "add",
  "terms": [
    { "original": "建图", "translation": "Mapping" }
  ]
}
```

### 2. preprocess_text

分析待翻译文本并生成报告。

**参数：**
- `text`: 待分析的文本
- `languageFrom`: 源语言（如 "ZH"）
- `languageTo`: 目标语言（如 "EN"）
- `terminologyDatabase`: 术语数据库（可选）

**示例：**

```json
{
  "text": "地图质量确认...",
  "languageFrom": "ZH",
  "languageTo": "EN",
  "terminologyDatabase": [
    { "original": "激光雷达", "translation": "LiDAR" }
  ]
}
```

### 3. translate_agent

执行翻译任务。

**参数：**
- `text`: 待翻译的文本
- `languageFrom`: 源语言
- `languageTo`: 目标语言
- `confirmedTerms`: 已确认的术语列表
- `documentInfo`: 文档信息（可选）
- `translationStrategy`: 翻译策略（可选）
- `batchMode`: 是否使用批量模式（可选）

**示例：**

```json
{
  "text": "地图质量确认...",
  "languageFrom": "ZH",
  "languageTo": "EN",
  "confirmedTerms": [
    { "original": "激光雷达", "translation": "LiDAR", "confirmed": true }
  ],
  "documentInfo": {
    "domain": "机器人导航",
    "style": "技术文档",
    "purpose": "国际技术文档发布"
  }
}
```

## 工作流程

1. **加载术语库**
   ```
   调用 feishu_knowledge_base (action: load) → 获取所有术语
   ```

2. **预处理文本**
   ```
   调用 preprocess_text → 分析文本，提取术语，匹配已有术语
   ```

3. **用户确认术语**
   ```
   前端展示分析结果 → 用户确认/修改术语 → 更新术语库
   ```

4. **执行翻译**
   ```
   调用 translate_agent → 应用确认的术语进行翻译
   ```

## 技术栈

- **MCP SDK**: @modelcontextprotocol/sdk
- **AI模型**: Claude 3.5 Sonnet (Anthropic)
- **飞书API**: 用于知识库集成
- **Node.js**: ES Modules

## 注意事项

1. 如果没有配置飞书API，系统会使用内置的模拟术语库
2. Claude API 调用需要有效的 API 密钥
3. 长文本会自动分段处理，避免token限制
4. 术语缓存有效期30分钟，自动刷新

## 与Express服务器集成

Express服务器会通过HTTP调用这个MCP服务器，参见 `server/agent/` 目录。


