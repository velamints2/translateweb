import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import logger from './utils/logger.js'

// 获取当前文件的目录路径
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 确保dotenv能够正确加载.env文件，无论从哪个目录运行服务器
dotenv.config({ path: path.resolve(__dirname, '../.env') })

const app = express()
const PORT = process.env.PORT || 3001

// 根据环境变量决定使用本地agent还是Dify API
const USE_LOCAL_AGENT = process.env.USE_LOCAL_AGENT !== 'false' // 默认使用本地agent

let translateRoutes
if (USE_LOCAL_AGENT) {
  logger.info('🤖 使用本地Agent模式')
  const module = await import('./routes/translate-local.js')
  translateRoutes = module.default
} else {
  logger.info('☁️  使用Dify API模式')
  const module = await import('./routes/translate.js')
  translateRoutes = module.default
}

// 中间件
app.use(cors())
app.use(express.json())

// 日志中间件
app.use((req, res, next) => {
  const start = Date.now()
  const { method, url, headers, body } = req
  
  // 记录请求开始
  logger.info(`🚀 ${method} ${url}`, {
    headers: {
      'user-agent': headers['user-agent'],
      'content-type': headers['content-type'],
      'x-request-timestamp': headers['x-request-timestamp']
    },
    body: ['POST', 'PUT', 'PATCH'].includes(method) ? body : undefined
  })
  
  // 监听响应完成
  res.on('finish', () => {
    const duration = Date.now() - start
    logger.info(`✅ ${method} ${url} ${res.statusCode} - ${duration}ms`)
  })
  
  next()
})

// 健康检查（必须在静态文件托管之前注册）
app.get('/health', (req, res) => {
  const mode = USE_LOCAL_AGENT ? 'Local Agent' : 'Dify API'
  res.json({ 
    status: 'OK', 
    mode: mode,
    timestamp: new Date().toISOString() 
  })
})

// 路由（必须在静态文件托管之前注册）
app.use('/api', translateRoutes)

// 报告路由
const reportRoutes = await import('./routes/report.js')
app.use('/api/report', reportRoutes.default)

// 如果存在前端构建产物（/dist），则让后端同时提供静态文件，简化单容器部署
// 必须放在 API 路由之后，以防止静态文件 fallback 拦截 API 请求
try {
  const distPath = path.resolve(__dirname, '../dist')
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath))
    // SPA fallback: 非 /api 和 /health 路径返回 index.html
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api') || req.path === '/health') return next()
      res.sendFile(path.join(distPath, 'index.html'))
    })
    logger.info('📦 静态前端文件已启用，来自:', distPath)
  }
} catch (err) {
  logger.warn('⚠️ 检查/启用静态前端时出错:', err.message)
}

app.listen(PORT, () => {
  logger.info(`🚀 服务器运行在端口 ${PORT}`)
  logger.info(`📊 环境: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`🔧 模式: ${USE_LOCAL_AGENT ? '本地Agent' : 'Dify API'}`)
  
  if (USE_LOCAL_AGENT) {
    logger.info(`🔍 Claude API Key: ${process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY ? '已配置' : '⚠️  未配置'}`)
    logger.info(`🔍 飞书配置: ${process.env.FEISHU_APP_ID ? '已配置' : '⚠️  未配置（将使用模拟数据）'}`)
  } else {
    logger.info(`🔍 DIFY_API_KEY: ${process.env.DIFY_API_KEY ? '已配置' : '未配置'}`)
    logger.info(`🔍 DIFY_BASE_URL: ${process.env.DIFY_BASE_URL || '未配置'}`)
    logger.info(`🔍 DIFY_APP_ID: ${process.env.DIFY_APP_ID || '未配置'}`)
  }
})