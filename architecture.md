# Dify翻译工作流应用架构文档

## 📁 项目结构总览

```
translate-workflow-app/
├── .env                    # 环境变量配置
├── .env.example           # 环境变量示例
├── package.json           # 项目依赖和脚本配置
├── vite.config.js         # Vite前端构建配置
├── start-dev.sh          # 开发环境启动脚本
├── index.html             # HTML模板
├── uploads/               # 文件上传目录
│
├── server/                # 后端Node.js/Express服务器
│   ├── index.js          # 服务器入口文件
│   └── routes/
│       └── translate.js  # 翻译API路由
│
└── src/                  # 前端Vue 3应用
    ├── main.js          # Vue应用入口
    ├── App.vue          # 根组件
    ├── router/
    │   └── index.js     # Vue路由配置
    ├── api/
    │   └── translate.js # 前端API调用封装
    ├── components/
    │   └── TranslationDetail.vue # 翻译详情组件
    └── views/
        ├── Home.vue     # 翻译主页面
        └── History.vue  # 翻译历史页面
```

## 🏗️ 系统架构层次

### 1. 前端层 (Vue 3 + Vite)

#### 核心组件结构
- **App.vue**: 根组件，提供应用头部和底部布局
- **router/index.js**: 路由配置，支持 `/` (首页) 和 `/history` (历史) 页面
- **views/Home.vue**: 主要翻译工作流界面
- **views/History.vue**: 翻译历史管理界面
- **components/TranslationDetail.vue**: 翻译结果详情组件

#### 前端状态管理
```javascript
// 主要状态存储在Home.vue中
const inputText = ref('')              // 输入文本
const languageFrom = ref('ZH')         // 源语言
const languageTo = ref('EN')           // 目标语言
const analysisResult = ref(null)       // 文本分析结果
const confirmationResult = ref(null)   // 术语确认结果
const translationResult = ref(null)    // 翻译结果
const uploadedFile = ref(null)         // 上传文件信息
const loading = ref({...})             // 各种加载状态
const errorMessage = ref('')           // 错误信息
```

#### API调用层 (src/api/translate.js)
- **axios实例配置**: 基础URL `/api`，30秒超时
- **请求拦截器**: 添加时间戳和日志记录
- **响应拦截器**: 统一错误处理和响应格式验证
- **API函数**:
  - `submitTextAPI()`: 提交文本进行分析
  - `confirmNounsAPI()`: 确认专有名词翻译
  - `startTranslationAPI()`: 开始翻译
  - `getSessionAPI()`: 获取会话信息
  - `uploadFileAPI()`: 文件上传

### 2. 后端层 (Node.js + Express)

#### 服务器架构 (server/index.js)
```javascript
const app = express()
const PORT = process.env.PORT || 3001

// 中间件配置
app.use(cors())                        // 跨域支持
app.use(express.json())                // JSON解析

// 路由配置
app.use('/api', translateRoutes)       // 翻译API路由
app.get('/health', handler)            // 健康检查
```

#### 数据存储 (server/routes/translate.js)
```javascript
// 内存存储（生产环境应使用数据库）
const translationMemory = new Map()    // 翻译记忆
const userSessions = new Map()         // 用户会话状态

// 会话状态流转
// 'analyzing' → 'awaiting_confirmation' → 'nouns_confirmed' → 'translation_completed'
```

#### 核心API路由
1. **POST /api/submit-text**: 文本分析
2. **POST /api/confirm-nouns**: 术语确认
3. **POST /api/start-translation**: 开始翻译
4. **GET /api/session/:sessionId**: 获取会话信息
5. **POST /api/upload-file**: 文件上传处理

### 3. 外部服务层 (Dify API)

#### API集成配置
```javascript
const DIFY_BASE_URL = process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1'
const DIFY_API_KEY = process.env.DIFY_API_KEY
const DIFY_APP_ID = process.env.DIFY_APP_ID || 'e9374605-5051-4269-92f1-38210df357aa'
```

#### 工作流API调用
- **端点**: `/workflows/run`
- **请求格式**: 
  ```json
  {
    "inputs": {
      "text": "用户输入文本",
      "session_id": "会话ID",
      "workflow_type": "analysis|translation"
    },
    "response_mode": "blocking",
    "user": "用户标识",
    "app_id": "Dify应用ID"
  }
  ```

## 🔄 服务连接与数据流

### 1. 前端 ↔ 后端连接

#### 网络配置
```javascript
// vite.config.js - 前端代理配置
proxy: {
  '/api': {
    target: 'http://localhost:3001',
    changeOrigin: true
  }
}
```

#### 请求流程
1. **前端发起**: axios请求到 `/api/*`
2. **Vite代理**: 请求转发到 `http://localhost:3001/api/*`
3. **Express处理**: 根据路由匹配执行对应处理器
4. **响应返回**: 处理结果通过代理返回给前端

### 2. 后端 ↔ Dify API连接

#### 调用策略
```javascript
// 调用优先级
1. 检查API密钥配置
2. 成功配置 → 调用Dify真实API
3. 配置缺失/调用失败 → 使用模拟数据
```

#### 数据处理流程
1. **文本分析**: 
   - 前端输入 → 后端 → Dify API → 专有名词提取 → 术语分类 → 前端展示
2. **术语确认**:
   - 用户确认 → 后端更新会话 → 状态变更
3. **翻译执行**:
   - 确认结果 → Dify翻译 → 结果返回 → 前端展示

### 3. 文件上传流程

#### 支持格式
- 文本文件: `.txt`
- 文档: `.doc`, `.docx`
- PDF: `.pdf`
- 图片: `.jpg`, `.png`, `.gif`

#### 处理管道
```
上传文件 → Multer处理 → 文件类型检测 → 
文本提取(支持OCR) → 文本内容返回 → 前端自动填充
```

## 💾 状态存储位置

### 前端状态 (Vue响应式数据)
```javascript
// 主要状态在 Home.vue 中管理
const state = {
  // 输入状态
  inputText: String,           // 输入的文本内容
  languageFrom: String,        // 源语言
  languageTo: String,          // 目标语言
  uploadedFile: Object|null,   // 上传文件信息
  
  // 翻译流程状态
  analysisResult: Object|null,     // 文本分析结果
  confirmationResult: Object|null, // 术语确认结果  
  translationResult: Object|null,  // 翻译结果
  
  // UI状态
  loading: Object,             // 加载状态
  errorMessage: String,        // 错误信息
  hasActiveSession: Boolean    // 是否有活跃会话
}
```

### 后端状态 (内存存储)
```javascript
// 翻译记忆 (translationMemory)
const translationMemory = {
  'text_hash': {
    originalText: String,
    translatedText: String,
    terms: Array,
    createdAt: Date,
    usage: Number
  }
}

// 用户会话 (userSessions)
const userSessions = {
  'session_id': {
    id: String,
    originalText: String,
    languageFrom: String,
    languageTo: String,
    status: String,              // 分析状态
    properNouns: Array,          // 识别的专有名词
    confirmedNouns: Array,       // 确认的术语
    translationResult: Object,   // 翻译结果
    createdAt: Date,
    updatedAt: Date
  }
}
```

## 🔌 API接口定义

### 1. 文本分析接口
```http
POST /api/submit-text
Content-Type: application/json

{
  "text": "需要分析的文本内容",
  "sessionId": "可选的会话ID"
}

Response:
{
  "sessionId": "会话ID",
  "documentInfo": {...},
  "contentStructure": "内容结构描述",
  "confirmationText": "确认文案",
  "translationStrategy": "翻译策略",
  "existingTerms": [...],  // 来自数据库的术语
  "newTerms": [...]        // 新识别的术语
}
```

### 2. 术语确认接口
```http
POST /api/confirm-nouns
Content-Type: application/json

{
  "sessionId": "会话ID",
  "confirmedNouns": [
    {
      "original": "激光雷达",
      "translation": "LiDAR",
      "confirmed": true
    }
  ]
}
```

### 3. 翻译执行接口
```http
POST /api/start-translation
Content-Type: application/json

{
  "sessionId": "会话ID"
}

Response:
{
  "translatedText": "翻译后的文本",
  "sessionId": "会话ID",
  "usage": {
    "total_tokens": 200,
    "prompt_tokens": 120,
    "completion_tokens": 80
  }
}
```

## 🛠️ 核心依赖与技术栈

### 前端技术栈
- **Vue 3**: 前端框架 (Composition API)
- **Vite**: 构建工具和开发服务器
- **Vue Router 4**: 前端路由
- **Element Plus**: UI组件库
- **Axios**: HTTP客户端

### 后端技术栈
- **Node.js**: JavaScript运行时
- **Express**: Web应用框架
- **CORS**: 跨域资源共享
- **Multer**: 文件上传处理

### 文档处理依赖
- **mammoth**: .doc/.docx文件处理
- **pdf2json**: PDF文件解析
- **TextIn OCR API**: 图片OCR识别
- **jimp**: 图像处理

### 外部服务
- **Dify API**: AI翻译和分析服务

## 🚀 部署与运行

### 开发环境启动
```bash
# 启动后端服务器
npm run server
# 或
node server/index.js

# 启动前端开发服务器 (新终端)
npm run dev

# 或使用启动脚本
./start-dev.sh
```

### 环境变量配置
```bash
# .env 文件
PORT=3001
NODE_ENV=development

# Dify API配置
DIFY_BASE_URL=https://api.dify.ai/v1
DIFY_API_KEY=your_difiy_api_key_here
DIFY_APP_ID=e9374605-5051-4269-92f1-38210df357aa
```

### 生产构建
```bash
# 前端构建
npm run build

# 预览构建结果
npm run preview
```

## 📊 数据流图

```
用户输入 → Vue组件 → axios → Express路由 → 
Dify API/模拟数据 → 数据处理 → 返回结果 → 
前端状态更新 → UI渲染
```

## 🔧 扩展性设计

1. **模块化架构**: 前后端分离，API标准化
2. **可配置服务**: 支持真实/模拟数据切换
3. **文件处理**: 支持多种文档格式的通用框架
4. **状态管理**: 清晰的会话状态流转
5. **错误处理**: 完善的错误捕获和用户反馈机制

此架构支持水平扩展，可以轻松集成不同的AI翻译服务，并提供良好的开发体验和维护性。