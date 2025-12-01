 <think>

**Designing phases for project MVP**

The project must focus on a minimal viable product (MVP), breaking tasks down into manageable, clear steps. These tasks include implementing basic backend endpoints, integrating Dify as a placeholder, and designing front-end pages. I’ll structure the project into phases: repo
</think>

Thought for 10s 

 下面这份是**按实现顺序排列的 MVP 构建任务清单**，每个任务都：

- 尽量**很小、很聚焦**
- 有**明确开始 / 结束**
- 自带**简单可验证测试**

你可以直接把这些任务一条条丢给“工程 LLM”去实现。

---

## Phase 0：项目基础与环境

### 任务 0-1：创建项目基础目录与 package.json
**目标**：有一个可安装依赖、可运行脚本的 Node/Vite 项目骨架。

- 实施内容：
  - 创建 `translate-workflow-app/` 目录结构（可按你给的结构简化版先搭起来）。
  - 在根目录初始化 `package.json`（`npm init -y` 或手写）。
- 完成标准：
  - 根目录有 `package.json`，名称为 `translate-workflow-app` 或类似。
- 测试方法：
  - 在根目录执行 `npm install`，无错误。
  - `cat package.json` 能看到基本字段。

---

### 任务 0-2：添加基础依赖与脚本
**目标**：安装前后端开发需要的依赖，并配置最基本脚本。

- 实施内容：
  - 安装依赖（仅列 MVP 必要）：
    - 后端：`express`, `cors`, `multer`, `dotenv`, `axios`
    - 前端：`vue`, `vue-router`, `axios`
    - 构建：`vite`, `@vitejs/plugin-vue`, `@vue/compiler-sfc`
  - 在 `package.json` 中添加脚本：
    - `"dev": "vite"`
    - `"server": "node server/index.js"`
- 完成标准：
  - `npm install` 成功，`node_modules` 存在。
- 测试方法：
  - `npm run dev` 报错也没关系（因为前端代码还没写）——只要脚本存在即可。
  - `npm run server` 暂时不要求成功（会在后面任务里打通）。

---

### 任务 0-3：创建 .env 和 .env.example
**目标**：配置好环境变量文件占位。

- 实施内容：
  - 在根目录创建 `.env.example`，包含以下键（可为空值）：
    ```env
    PORT=3001
    NODE_ENV=development
    DIFY_BASE_URL=https://api.dify.ai/v1
    DIFY_API_KEY=
    DIFY_APP_ID=e9374605-5051-4269-92f1-38210df357aa
    ```
  - 复制 `.env.example` 为 `.env`（内容可暂时相同，KEY 暂留空）。
- 完成标准：
  - `.env` 和 `.env.example` 文件存在。
- 测试方法：
  - 手动打开文件确认内容存在、格式正确。

---

## Phase 1：后端基础服务（Health Check）

### 任务 1-1：创建 server/index.js 并初始化 Express 应用
**目标**：有一个最小可启动的 Express 服务。

- 实施内容：
  - 创建 `server/index.js`。
  - 从 `dotenv` 读取 `.env`。
  - 创建 `app = express()`。
  - 从 `process.env.PORT`（默认 3001）读取端口。
- 完成标准：
  - 文件存在且无语法错误。
- 测试方法：
  - `node server/index.js` 没有抛出立即的语法错误（不一定已经监听端口，这一步只要求文件可运行）。

---

### 任务 1-2：添加基础中间件（CORS + JSON解析）
**目标**：后端能处理 JSON 请求并允许跨域。

- 实施内容：
  - 在 `server/index.js` 中：
    - 引入 `cors`。
    - `app.use(cors())`
    - `app.use(express.json())`
- 完成标准：
  - 服务启动后不会因中间件报错。
- 测试方法：
  - `node server/index.js` 启动，控制台无异常。

---

### 任务 1-3：实现 /health 健康检查路由
**目标**：有一个可验证后端存活的简单接口。

- 实施内容：
  - 在 `server/index.js` 中：
    ```js
    app.get('/health', (req, res) => {
      res.json({ status: 'ok' })
    })
    app.listen(PORT, () => console.log(`Server running on ${PORT}`))
    ```
- 完成标准：
  - 服务器可以成功监听端口。
- 测试方法：
  - 启动：`node server/index.js`
  - 在浏览器或 `curl http://localhost:3001/health`，返回 `{"status":"ok"}`。

---

## Phase 2：后端翻译路由骨架（仅返回 mock）

### 任务 2-1：创建路由文件 server/routes/translate.js
**目标**：路由文件存在，并准备好导出 `Router`。

- 实施内容：
  - 创建 `server/routes/translate.js`。
  - 在里面创建 `const router = require('express').Router()`。
  - `module.exports = router;`
- 完成标准：
  - 文件存在，无语法错误。
- 测试方法：
  - 在 `server/index.js` 使用 `require('./routes/translate')` 不抛异常（至此先不挂载也可以）。

---

### 任务 2-2：在 index.js 挂载 /api 路由
**目标**：将 `translateRoutes` 挂载在 `/api` 路径下。

- 实施内容：
  - `const translateRoutes = require('./routes/translate')`
  - `app.use('/api', translateRoutes)`
- 完成标准：
  - 服务启动无错误。
- 测试方法：
  - `node server/index.js` 能启动即可。

---

### 任务 2-3：实现 POST /api/submit-text mock 接口
**目标**：能收到文本并返回固定结构的 mock 分析结果。

- 实施内容（在 `translate.js`）：
  - 添加路由：
    ```js
    router.post('/submit-text', (req, res) => {
      const { text, sessionId } = req.body || {}
      res.json({
        sessionId: sessionId || 'mock-session-1',
        documentInfo: { length: text ? text.length : 0 },
        contentStructure: 'mock-structure',
        confirmationText: 'mock-confirmation',
        translationStrategy: 'mock-strategy',
        existingTerms: [],
        newTerms: []
      })
    })
    ```
- 完成标准：
  - 请求返回 JSON，字段齐全。
- 测试方法：
  - `curl -X POST http://localhost:3001/api/submit-text -H "Content-Type: application/json" -d '{"text":"hello"}'`
  - 返回中包含 `sessionId` 字段。

---

### 任务 2-4：实现 POST /api/confirm-nouns mock 接口
**目标**：保存前端提交的术语确认结果并返回成功状态（先不做真实存储）。

- 实施内容：
  ```js
  router.post('/confirm-nouns', (req, res) => {
    const { sessionId, confirmedNouns } = req.body || {}
    res.json({
      sessionId: sessionId || 'mock-session-1',
      confirmedCount: Array.isArray(confirmedNouns) ? confirmedNouns.length : 0,
      status: 'nouns_confirmed'
    })
  })
  ```
- 完成标准：
  - 能处理任意数组长度的 `confirmedNouns`。
- 测试方法：
  - `curl` POST 一个有两个术语的 JSON，验证 `confirmedCount` 为 2。

---

### 任务 2-5：实现 POST /api/start-translation mock 接口
**目标**：返回一个简单的“翻译结果”结构。

- 实施内容：
  ```js
  router.post('/start-translation', (req, res) => {
    const { sessionId } = req.body || {}
    res.json({
      sessionId: sessionId || 'mock-session-1',
      translatedText: '[MOCK_TRANSLATION] ...',
      usage: {
        total_tokens: 0,
        prompt_tokens: 0,
        completion_tokens: 0
      }
    })
  })
  ```
- 完成标准：
  - 返回 JSON 中含有 `translatedText` 字段。
- 测试方法：
  - POST 调用，检查 `translatedText` 是否为 mock 字符串。

---

### 任务 2-6：实现 GET /api/session/:sessionId mock 接口
**目标**：前端可以通过 sessionId 获取当前会话状态（先用固定 mock）。

- 实施内容：
  ```js
  router.get('/session/:sessionId', (req, res) => {
    const { sessionId } = req.params
    res.json({
      sessionId,
      status: 'mock_status',
      properNouns: [],
      confirmedNouns: [],
      translationResult: null
    })
  })
  ```
- 完成标准：
  - 任意 `sessionId` 请求都返回 JSON。
- 测试方法：
  - `curl http://localhost:3001/api/session/abc123`，检查 `sessionId` 字段为 `abc123`。

---

## Phase 3：后端内存状态管理（translationMemory & userSessions）

### 任务 3-1：在 translate.js 中定义内存对象
**目标**：有两份内存存储：translationMemory & userSessions。

- 实施内容：
  ```js
  const translationMemory = new Map()
  const userSessions = new Map()
  ```
- 完成标准：
  - 变量在文件顶部定义，不报错。
- 测试方法：
  - 服务启动成功即可。

---

### 任务 3-2：在 submit-text 中创建/更新 session 对象
**目标**：当调用 `/submit-text` 时，在 `userSessions` 中创建一个会话对象。

- 实施内容：
  - 如果 body 中没有 `sessionId`，生成一个简单的随机 ID（例如 `Date.now().toString()`）。
  - 在 `userSessions` 中写入：
    ```js
    userSessions.set(sessionId, {
      id: sessionId,
      originalText: text || '',
      languageFrom: 'ZH',
      languageTo: 'EN',
      status: 'analyzing',
      properNouns: [],
      confirmedNouns: [],
      translationResult: null,
      createdAt: new Date(),
      updatedAt: new Date()
    })
    ```
- 完成标准：
  - 每次 `/submit-text` 调用后 `userSessions.size` 至少为 1。
- 测试方法：
  - 暂时在路由末尾 `console.log(userSessions.get(sessionId))`，观察终端输出。

---

### 任务 3-3：在 confirm-nouns 中更新 session 状态
**目标**：更新 `session.status = 'nouns_confirmed'`，并保存 `confirmedNouns`。

- 实施内容：
  - 根据 `sessionId` 从 `userSessions` 读取会话。
  - 更新 `confirmedNouns` 和 `status`。
  - 更新时间戳 `updatedAt`。
- 完成标准：
  - 确认调用前后 `userSessions.get(sessionId).status` 不同。
- 测试方法：
  - 先调用 `/submit-text` 获取 `sessionId`，再调用 `/confirm-nouns`，在后端 `console.log` 查看 session 状态变化。

---

### 任务 3-4：在 start-translation 中写入 translationResult
**目标**：在 `userSessions` 内存对象中保存翻译结果。

- 实施内容：
  - 根据 `sessionId` 找到会话。
  - 为其赋值：
    ```js
    session.translationResult = { translatedText: 'mock text' }
    session.status = 'translation_completed'
    session.updatedAt = new Date()
    ```
- 完成标准：
  - 调用后读取 `session.translationResult` 非空。
- 测试方法：
  - 调用 `/start-translation` 后，在服务端打印 `userSessions.get(sessionId)`。

---

### 任务 3-5：让 GET /api/session/:sessionId 返回真实 session 状态
**目标**：不再使用 mock，而是将 `userSessions` 中的值返回。

- 实施内容：
  - 若 `userSessions` 中有对应 `sessionId`：
    - `return res.json(sessionObject)`
  - 若不存在：
    - 返回 404 `{ error: 'Session not found' }`
- 完成标准：
  - 对存在的会话返回真实数据。
- 测试方法：
  - 按顺序调用 `/submit-text` → `/session/:id`，看到 `originalText` 为之前 text。

---

## Phase 4：前端基础框架

### 任务 4-1：使用 Vite 创建 Vue 3 应用骨架
**目标**：有一个可运行的最小 Vue + Vite 工程。

- 实施内容：
  - 确保 `src/main.js`, `src/App.vue`, `index.html` 存在。
  - `main.js` 中挂载 Vue 应用到 `#app`。
- 完成标准：
  - `npm run dev` 可以启动并在浏览器看到基本页面（哪怕只有 “Hello”）。
- 测试方法：
  - 打开 `http://localhost:5173`，页面可访问。

---

### 任务 4-2：配置 Vue Router（/ 与 /history）
**目标**：前端有两个路由：`/` 和 `/history`。

- 实施内容：
  - 创建 `src/router/index.js`，配置：
    - `/` → `Home.vue`
    - `/history` → `History.vue`
  - 在 `main.js` 中挂载 router。
- 完成标准：
  - 可以在浏览器地址栏切换两个路由，内容不同。
- 测试方法：
  - 手动访问 `/` 和 `/history`，看到对应占位文本。

---

### 任务 4-3：在 App.vue 添加基本布局和路由出口
**目标**：有一个统一的顶栏 + `<router-view />`。

- 实施内容：
  - `App.vue` 包含简单导航（例如两个 `<router-link>` 指向 `/` 和 `/history`）和 `<router-view />`。
- 完成标准：
  - 点击导航链接，可以在前端无刷新切换页面。
- 测试方法：
  - 浏览器验证路由切换正常。

---

## Phase 5：前端 API 封装与 submit-text 流程

### 任务 5-1：创建 src/api/translate.js 并配置 axios 实例
**目标**：统一封装 axios 实例，基础 URL 为 `/api`。

- 实施内容：
  - 在 `src/api/translate.js` 中：
    - `import axios`
    - 创建 `const instance = axios.create({ baseURL: '/api', timeout: 30000 })`
  - 暂时不加拦截器。
- 完成标准：
  - 模块可以被其他组件导入。
- 测试方法：
  - 从任意组件简单导入并在控制台打印 `instance`，确保不报错。

---

### 任务 5-2：实现 submitTextAPI 函数
**目标**：前端可以调用 `/api/submit-text`。

- 实施内容：
  ```js
  export function submitTextAPI(payload) {
    return instance.post('/submit-text', payload)
  }
  ```
- 完成标准：
  - 提供函数导出。
- 测试方法：
  - 在浏览器控制台手动调用（从某个组件挂载）或在组件 `onMounted` 中调用然后 `console.log` 结果。

---

### 任务 5-3：在 Home.vue 中添加最简输入表单和提交按钮
**目标**：用户能输入一段文本并点击按钮触发 submitTextAPI。

- 实施内容：
  - 在 `Home.vue` 中：
    - 定义 `inputText` 响应式数据。
    - 一个 `<textarea v-model="inputText" />`
    - 一个 `<button @click="onSubmit">提交分析</button>`
- 完成标准：
  - 前端 UI 可输入文本并点击按钮。
- 测试方法：
  - 手工操作，确认事件被触发（在 `onSubmit` 内 `console.log`）。

---

### 任务 5-4：在 Home.vue 中调用 submitTextAPI 并显示 sessionId
**目标**：完成从前端到后端再返回的第一条闭环。

- 实施内容：
  - 在 `onSubmit` 里调用：
    ```js
    const res = await submitTextAPI({ text: inputText.value })
    sessionId.value = res.data.sessionId
    ```
  - 在模板显示 `sessionId`。
- 完成标准：
  - 点击“提交分析”后页面出现 sessionId。
- 测试方法：
  - 运行前后端，输入任意文本，观察是否显示后端返回的 mock sessionId。

---

## Phase 6：前端术语确认与翻译流程

### 任务 6-1：在 api/translate.js 中实现 confirmNounsAPI 与 startTranslationAPI
**目标**：前端 API 层具备完整调用接口。

- 实施内容：
  ```js
  export function confirmNounsAPI(payload) {
    return instance.post('/confirm-nouns', payload)
  }
  export function startTranslationAPI(payload) {
    return instance.post('/start-translation', payload)
  }
  ```
- 完成标准：
  - 能被 Home.vue 等组件导入。
- 测试方法：
  - 在某个组件中临时调用并打印响应。

---

### 任务 6-2：在 Home.vue 中添加“确认术语”按钮和简化的术语列表
**目标**：构建最简单的术语确认 UI（即便暂时没有真实术语）。

- 实施内容：
  - 添加 `confirmedNouns` 响应式数组（先放一条 mock 数据）。
  - 按钮 “确认术语并提交” → 调用 `confirmNounsAPI({ sessionId, confirmedNouns })`。
- 完成标准：
  - 点击按钮后，能在控制台看到后端返回 status。
- 测试方法：
  - 流程：提交文本 → 得到 sessionId → 点击“确认术语” → 控制台输出 confirm 接口返回数据。

---

### 任务 6-3：添加“开始翻译”按钮并显示 translatedText
**目标**：完成完整 MVP 流程：提交 → 确认 → 翻译。

- 实施内容：
  - 添加按钮 “开始翻译”，调用：
    ```js
    const res = await startTranslationAPI({ sessionId: sessionId.value })
    translationResult.value = res.data.translatedText
    ```
  - 在模板渲染 `translationResult`。
- 完成标准：
  - 完整点击流可以看到 mock 翻译文本出现在页面上。
- 测试方法：
  - 手动跑一遍：输入文本 → 提交分析 → 确认术语 → 开始翻译 → 页面显示 `[MOCK_TRANSLATION] ...`。

---

## Phase 7：Dify 集成（可选，先从 mock 切换到真实）

> 这一阶段你可以视情况让工程 LLM 实现，这里也拆成小任务。

### 任务 7-1：在后端创建 Dify 客户端模块（无逻辑，仅占位）
**目标**：模块化 Dify 调用。

- 实施内容：
  - 新建 `server/difyClient.js`。
  - 导出占位函数：
    ```js
    async function runWorkflow(inputs, workflowType) {
      return { mock: true }
    }
    module.exports = { runWorkflow }
    ```
- 完成标准：
  - 其他模块可以 `require('./difyClient')` 无错误。
- 测试方法：
  - 在 `translate.js` 中 `console.log(await runWorkflow({}, 'analysis'))` 观察输出。

---

### 任务 7-2：在 difyClient.js 中实现真实 HTTP 调用骨架
**目标**：根据 `.env` 中配置，向 Dify `/workflows/run` 发请求。

- 实施内容：
  - 使用 `axios` 创建实例，baseURL = `DIFY_BASE_URL`。
  - 构建 POST 请求，包含 `inputs`, `response_mode`, `user`, `app_id`。
- 完成标准：
  - 如果 `.env` 有有效 KEY，则请求不报语法错（响应内容可以暂不使用）。
- 测试方法：
  - 手动调用 `node` 脚本测试一次请求（或在路由中打印结果）。

---

### 任务 7-3：让 submit-text 使用 Dify 分析结果（有 KEY 才启用）
**目标**：后端从 Dify 接收分析结果，并用真实数据刷新 `analysis` 返回值。

- 实施内容：
  - 在 `/submit-text` 路由中：
    - 如果配置了 `DIFY_API_KEY`，调用 `runWorkflow(...)`。
    - 将返回中的术语/结构映射为：
      - `existingTerms`
      - `newTerms`
      - `contentStructure`
      - `translationStrategy`
  - 否则仍返回 mock。
- 完成标准：
  - 有 KEY 时返回结构不再固定 mock。
- 测试方法：
  - 使用真实 KEY 调用接口，检查返回字段发生变化。

---

（后续还可以用类似方式让翻译结果也走 Dify，这里就不继续展开了。）

---
