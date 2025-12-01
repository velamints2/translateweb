# 环境变量配置说明

## 创建配置文件

在项目根目录创建 `.env` 文件：

```bash
touch .env
```

## 本地Agent模式配置（推荐）

将以下内容复制到 `.env` 文件：

```bash
# 服务器配置
PORT=3001
NODE_ENV=development

# 使用本地Agent模式
USE_LOCAL_AGENT=true

# ChatGPT 5.0 API密钥（核心翻译功能，必需）
OPENAI_API_KEY=sk-your-api-key-here

# DeepSeek Chat API密钥（报告生成功能，必需）
DEEPSEEK_API_KEY=your_deepseek_api_key

# 飞书配置（可选，不配置会使用模拟数据）
FEISHU_APP_ID=your_feishu_app_id
FEISHU_APP_SECRET=your_feishu_app_secret
```

## Dify API模式配置（旧方式）

如果要继续使用Dify API：

```bash
# 服务器配置
PORT=3001
NODE_ENV=development

# 使用Dify API模式
USE_LOCAL_AGENT=false

# Dify配置
DIFY_API_KEY=your_dify_api_key
DIFY_BASE_URL=https://api.dify.ai/v1
DIFY_APP_ID=your_dify_app_id
```

## 配置项详解

### 必需配置

#### `PORT`
- **说明**: 后端服务器端口
- **默认**: 3001
- **示例**: `PORT=3001`

#### `USE_LOCAL_AGENT`
- **说明**: 选择运行模式
- **可选值**: `true` (本地Agent) 或 `false` (Dify API)
- **默认**: true
- **示例**: `USE_LOCAL_AGENT=true`

### 本地Agent模式配置

#### `OPENAI_API_KEY` (必需) - ChatGPT 5.0
- **说明**: OpenAI ChatGPT 5.0 API密钥，用于核心翻译功能
- **获取**: https://platform.openai.com/api-keys
- **格式**: `sk-...`
- **用途**: 执行文本翻译的核心模块
- **示例**: `OPENAI_API_KEY=sk-xxxx`

#### `DEEPSEEK_API_KEY` (必需) - DeepSeek Chat
- **说明**: DeepSeek Chat API密钥，用于报告生成和文本分析功能
- **获取**: https://platform.deepseek.com/
- **格式**: `sk-...`
- **用途**: 生成翻译分析报告、术语建议和确认文案
- **示例**: `DEEPSEEK_API_KEY=sk-xxxx`

### 飞书配置（可选）

#### `FEISHU_APP_ID`
- **说明**: 飞书应用ID
- **获取**: https://open.feishu.cn/
- **格式**: `cli_...`
- **示例**: `FEISHU_APP_ID=cli_a1b2c3d4e5f6`

#### `FEISHU_APP_SECRET`
- **说明**: 飞书应用密钥
- **示例**: `FEISHU_APP_SECRET=your_secret_here`

**注意**: 飞书配置是可选的。如果不配置，系统会使用内置的模拟术语库，包含常用的技术术语，不影响翻译功能。

### OCR 配置（TextIn）

#### `TEXTIN_APP_ID` (必需)
- **说明**: TextIn 控制台生成的应用 ID
- **获取**: https://console.textin.com/app
- **用途**: 作为调用 TextIn OCR 接口的身份凭证之一
- **示例**: `TEXTIN_APP_ID=your-textin-app-id`

#### `TEXTIN_SECRET_CODE` (必需)
- **说明**: 与 APP ID 配套的 Secret Code，用于接口鉴权
- **示例**: `TEXTIN_SECRET_CODE=your-secret-code`

#### `TEXTIN_ENDPOINT` (可选)
- **说明**: TextIn OCR 接口地址，默认使用通用印刷体识别 `https://openapi.textin.com/ai/ocr/standard`
- **用途**: 若需要切换到票据/手写等其他模型，可在此覆写
- **示例**: `TEXTIN_ENDPOINT=https://openapi.textin.com/ai/ocr/standard`

### Dify API配置（仅当USE_LOCAL_AGENT=false时需要）

#### `DIFY_API_KEY`
- **说明**: Dify平台API密钥
- **示例**: `DIFY_API_KEY=app-xxx`

#### `DIFY_BASE_URL`
- **说明**: Dify API基础URL
- **默认**: `https://api.dify.ai/v1`
- **示例**: `DIFY_BASE_URL=https://api.dify.ai/v1`

#### `DIFY_APP_ID`
- **说明**: Dify应用ID
- **示例**: `DIFY_APP_ID=xxx-xxx-xxx`

### 其他配置

#### `NODE_ENV`
- **说明**: 运行环境
- **可选值**: `development`, `production`
- **默认**: `development`
- **示例**: `NODE_ENV=development`

#### `LOG_LEVEL`
- **说明**: 日志级别
- **可选值**: `error`, `warn`, `info`, `debug`
- **默认**: `info`
- **示例**: `LOG_LEVEL=info`

## 获取ChatGPT 5.0 API密钥

### 步骤1: 注册OpenAI账号
访问 https://platform.openai.com/signup 并注册账号

### 步骤2: 创建API密钥
1. 登录 https://platform.openai.com/api-keys
2. 点击 "Create new secret key"
3. 复制生成的密钥（格式: `sk-...`）

### 步骤3: 充值账户
1. 前往 "Billing" 页面
2. 添加支付方式
3. 充值金额（建议$20起步）

### 定价参考（ChatGPT 5.0）
- 输入: $15 / 1M tokens
- 输出: $60 / 1M tokens
- 单次翻译成本约: $0.15（2000字）

## 获取DeepSeek Chat API密钥

### 步骤1: 注册DeepSeek账号
访问 https://platform.deepseek.com/ 并注册账号

### 步骤2: 创建API密钥
1. 登录控制台
2. 进入 "API keys" 页面
3. 点击 "Create new key"
4. 复制生成的密钥

### 步骤3: 充值账户
1. 前往 "Billing" 页面
2. 添加支付方式
3. 充值金额

### 定价参考（DeepSeek Chat）
- 输入: $0.14 / 1M tokens
- 输出: $0.28 / 1M tokens
- 单次报告生成成本约: $0.02（相比ChatGPT成本更低）

## 获取飞书配置（可选）

### 步骤1: 创建飞书应用
访问 https://open.feishu.cn/app

### 步骤2: 获取凭证
1. 创建企业自建应用
2. 在"凭证与基础信息"页面找到:
   - App ID (cli_xxx)
   - App Secret

### 步骤3: 配置权限
添加以下权限:
- 查看云文档
- 编辑云文档

### 步骤4: 发布应用
将应用发布到企业内部

## 配置验证

启动服务器后，查看日志输出：

### 本地Agent模式
```
🚀 服务器运行在端口 3001
📊 环境: development
🔧 模式: 本地Agent
🔍 OpenAI API Key: 已配置 ✅
🔍 DeepSeek API Key: 已配置 ✅
🔍 飞书配置: 已配置 ✅
```

或

```
🚀 服务器运行在端口 3001
📊 环境: development
🔧 模式: 本地Agent
🔍 OpenAI API Key: 已配置 ✅
🔍 DeepSeek API Key: 已配置 ✅
🔍 飞书配置: ⚠️  未配置（将使用模拟数据）
```

### Dify API模式
```
🚀 服务器运行在端口 3001
📊 环境: development
🔧 模式: Dify API
🔍 DIFY_API_KEY: 已配置 ✅
```

## 常见问题

### Q: 启动报错 "OpenAI API密钥未配置"
**A**: 检查 `.env` 文件中的 `OPENAI_API_KEY` 是否正确设置

### Q: 启动报错 "DeepSeek API密钥未配置"
**A**: 检查 `.env` 文件中的 `DEEPSEEK_API_KEY` 是否正确设置

### Q: 飞书配置不工作
**A**: 飞书配置是可选的，不配置不影响功能。如果配置了但不工作，检查：
1. App ID 和 Secret 是否正确
2. 应用权限是否配置
3. 应用是否已发布

### Q: 翻译报错 "insufficient credits"
**A**: OpenAI账户余额不足，需要充值

### Q: 报告生成报错
**A**: 检查DeepSeek API密钥是否配置正确，或联系 DeepSeek 客服

### Q: 如何切换模式？
**A**: 修改 `.env` 文件中的 `USE_LOCAL_AGENT` 值，然后重启服务器

## 安全建议

1. ⚠️ **不要**将 `.env` 文件提交到 Git
2. ⚠️ **不要**在代码中硬编码密钥
3. ✅ 使用强密码和定期更换密钥
4. ✅ 限制API密钥的权限范围
5. ✅ 监控API使用情况和成本
6. ✅ 为不同的环境（开发、测试、生产）使用不同的API密钥

## 生产环境配置

生产环境建议：

```bash
PORT=3001
NODE_ENV=production
USE_LOCAL_AGENT=true
OPENAI_API_KEY=sk-prod-key-here
DEEPSEEK_API_KEY=sk-prod-key-here
FEISHU_APP_ID=cli_prod_id
FEISHU_APP_SECRET=prod_secret
LOG_LEVEL=warn
```

使用环境变量管理工具（如 PM2, Docker secrets）保护敏感信息。

## 功能说明

### 核心翻译功能（ChatGPT 5.0）
- 使用 `OPENAI_API_KEY` 配置
- 处理文本翻译任务
- 支持多语言翻译
- 支持长文本分段翻译

### 报告生成功能（DeepSeek Chat）
- 使用 `DEEPSEEK_API_KEY` 配置
- 生成翻译前的文本分析报告
- 识别并建议专业术语翻译
- 生成客户确认文案
- 相比ChatGPT成本更低（约为1/7）


