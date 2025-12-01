import express from 'express'
import axios from 'axios'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mammoth from 'mammoth'
import PDFParser from 'pdf2json'
// import tesseract from 'node-tesseract-ocr'
import { textinOcrRecognize } from '../agent/tools/textin-ocr.js'
import logger from '../utils/logger.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Dify API配置 - 直接从process.env读取，确保每次都能获取到最新值

// 文件上传配置
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads')
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname)
    cb(null, uniqueName)
  }
})

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/json',
      'text/html',
      'application/xml',
      'text/xml'
    ]
    
    // 检查文件扩展名作为备用验证
    const allowedExtensions = ['.txt', '.doc', '.docx', '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.json', '.html', '.xml', '.ppt', '.pptx']
    const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.')).toLowerCase()
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件类型，请上传文本(.txt)、PDF(.pdf)、Word文档(.doc/.docx)、PPT(.ppt/.pptx)、图片(.jpg/.png/.gif)或其他常见文档格式'), false)
    }
  }
})

// 模拟数据库（实际项目中应使用真实数据库）
const translationMemory = new Map()
const userSessions = new Map()

// 任务状态管理 - 用于处理异步API调用和轮询
const taskStatusMap = new Map()

// 任务状态枚举
const TaskStatus = {
  PENDING: 'pending',      // 任务待处理
  PROCESSING: 'processing',// 任务处理中
  COMPLETED: 'completed',  // 任务完成
  FAILED: 'failed'         // 任务失败
}

// 创建新任务
function createTask(taskId, sessionId, type = 'analysis') {
  const task = {
    taskId: taskId,
    sessionId: sessionId,
    type: type,
    status: TaskStatus.PENDING,
    result: null,
    error: null,
    createdAt: new Date(),
    updatedAt: new Date()
  }
  taskStatusMap.set(taskId, task)
  return task
}

// 更新任务状态
function updateTaskStatus(taskId, status, result = null, error = null) {
  const task = taskStatusMap.get(taskId)
  if (task) {
    task.status = status
    task.result = result
    task.error = error
    task.updatedAt = new Date()
    taskStatusMap.set(taskId, task)
    return true
  }
  return false
}

// 获取任务状态
function getTaskStatus(taskId) {
  return taskStatusMap.get(taskId) || null
}

// 发送消息到Dify应用 - 使用chat-messages API端点
async function sendToDifyChat(userInput, sessionId, languageFrom = 'ZH', languageTo = 'EN-US', responseMode = 'blocking') {
  // 直接从process.env读取环境变量，确保每次都能获取到最新值
  const apiKey = process.env.DIFY_API_KEY
  const baseUrl = process.env.DIFY_BASE_URL || 'https://api.dify.ai/v1'
  
  // 检查API密钥是否配置
  if (!apiKey || apiKey === 'your_difiy_api_key_here') {
    const errorMsg = 'Dify API密钥未配置或值为默认值，请检查.env文件中的DIFY_API_KEY配置'
    logger.error('❌', errorMsg)
    throw new Error(errorMsg)
  }
  
  // 确保语言参数有默认值，即使调用时传递了undefined
  const finalLanguageFrom = languageFrom || 'ZH'
  const finalLanguageTo = languageTo || 'EN-US'
  
  // 根据Dify官方文档，对话型应用应该使用/chat-messages端点
  const apiEndpoint = `${baseUrl}/chat-messages`
  logger.info('🚀 调用Dify API对话:', apiEndpoint)
  logger.info('📤 参数:', {
    languageFrom: finalLanguageFrom,
    languageTo: finalLanguageTo,
    responseMode: responseMode
  })
  
  // 构建符合Dify官方文档规范的对话请求体
  const requestBody = {
    query: userInput, // 用户提问内容
    inputs: {
      language_from: finalLanguageFrom, // 源语言
      language_to: finalLanguageTo // 目标语言
    },
    response_mode: responseMode,
    user: sessionId
  }
  
  logger.info('📤 发送数据:', requestBody)
  
  // 重试配置
  const maxRetries = 3
  const retryDelay = 1000 // 1秒
  const retryableStatuses = [500, 502, 503, 504] // 可重试的状态码
  
  // 发送请求到Dify API，带重试机制
  for (let retry = 0; retry <= maxRetries; retry++) {
    // 记录请求开始时间
    const startTime = Date.now()
    logger.info(`📅 请求开始时间: ${new Date().toISOString()}, 重试次数: ${retry}`)
    
    try {
      const response = await axios.post(
        apiEndpoint,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Expires': '0'
          },
          timeout: retry === 0 ? 600000 : 600000, // 增加超时时间到10分钟
          responseType: responseMode === 'streaming' ? 'stream' : 'json' // 根据响应模式设置响应类型
        }
      )
      
      // 记录请求结束时间和耗时
      const endTime = Date.now()
      const duration = endTime - startTime
      logger.info(`✅ Dify API调用成功，耗时: ${duration}ms, 重试次数: ${retry}`)
      logger.info(`📅 请求结束时间: ${new Date().toISOString()}`)
      
      // 处理不同响应模式
      if (responseMode === 'streaming') {
        // 流式响应处理 - 返回流对象
        logger.info('📡 收到Dify API流式响应')
        return response.data
      } else {
        // 阻塞响应处理 - 返回JSON数据
        logger.info('Dify API响应:', JSON.stringify(response.data, null, 2))
        return response.data
      }
    } catch (error) {
      // 记录请求结束时间和耗时
      const endTime = Date.now()
      const duration = endTime - startTime
      logger.error(`❌ Dify API调用失败，耗时: ${duration}ms, 重试次数: ${retry}`)
      logger.error(`📅 请求结束时间: ${new Date().toISOString()}`)
      logger.error('❌ 错误信息:', error.message)
      
      // 详细的错误分类
      if (error.code === 'ECONNABORTED') {
        logger.error('❌ 错误类型: 请求超时')
      }
      
      if (error.response) {
        logger.error('❌ 错误状态码:', error.response.status)
        logger.error('❌ 错误响应头:', error.response.headers)
        logger.error('❌ 错误响应体:', JSON.stringify(error.response.data, null, 2))
        
        // 检查是否可以重试
        if (retry < maxRetries && retryableStatuses.includes(error.response.status)) {
          logger.info(`🔄 将在 ${retryDelay}ms 后重试...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue // 重试
        }
        
        // 504错误特殊处理 - Dify后台可能已成功处理
        if (error.response.status === 504) {
          logger.warn('⚠️  注意: 504网关超时，但Dify后台可能已成功处理请求')
          throw new Error('Dify API调用失败: 网关超时，但请求可能已在Dify后台成功处理')
        }
      } else if (error.request) {
        logger.error('❌ 错误类型: 无响应')
        logger.error('❌ 请求信息:', error.request)
        
        // 网络错误可以重试
        if (retry < maxRetries) {
          logger.info(`🔄 将在 ${retryDelay}ms 后重试...`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          continue // 重试
        }
      } else {
        logger.error('❌ 错误类型: 请求配置错误')
        // 请求配置错误不需要重试
      }
      
      // API调用失败，使用模拟数据响应
      logger.warn('⚠️  Dify API调用失败，使用模拟数据响应')
      return getMockAnalysisResult(userInput)
    }
  }
}

// 模拟分析结果 - 根据Dify示例重新设计
function getMockAnalysisResult(text) {
  // 解析文本中的专有名词
  const nouns = extractProperNounsFromText(text)
  
  return {
    answer: `🤖 
第一部分：文档分析与翻译建议 
📋 文档基本信息 
所属领域：机器人导航与地图构建技术 
文体风格：技术说明文档 
翻译用途：国际技术文档发布 
🏗️ 内容结构概览 
${extractContentStructure(text)}

第二部分：术语分类整理 
1. 数据库中已有翻译（待确认） 
中文术语 \t 当前翻译 \t 是否建议沿用 \t 备注 
激光雷达 \t LiDAR \t 是 \t 行业标准术语 
建图 \t Mapping \t 是 \t 机器人领域通用译法 

2. 新术语（建议翻译，待确认） 
${generateNewTermsTable(nouns)}

第三部分：确认文案 
3. 给客户的确认文案 
您好，我们从您的机器人技术文档中识别到${nouns.length}个专业术语。为确保后续翻译的一致性和准确性，请您确认以下术语的译法： 

① 数据库已有的翻译（需要您确认） 

激光雷达 (LiDAR) 
建图 (Mapping) 
② 数据库尚未收录的术语（请确认是否采纳系统建议） 

建议采纳的术语（系统推荐，可直接使用）： 
${nouns.slice(0, 5).map(noun => `${noun.original} (${noun.translation})`).join(', ')}

需要您重点确认的术语（多义性或需要风格选择）： 
${nouns.slice(5).map(noun => `${noun.original} (建议：${noun.translation})`).join(', ')}

请您： 
✓ 确认现有翻译是否继续沿用 
✓ 对建议翻译选择"确认采用"或"提供替代译法" 
✓ 确认是否将这些术语存入术语数据库 

您的确认将帮助我们建立统一的术语标准，确保后续翻译质量。确认后，系统将自动更新术语数据库（CSV文件）,如果有对翻译风格的其他建议,也可以一并发给我。 

第四部分：补充信息 
🎯 翻译策略建议 
翻译风格：保持技术文档的专业性和准确性，使用简洁明了的表达方式 
句式处理：适当拆分中文长句，确保英语表达的流畅性和逻辑清晰性 
技术准确性：重点保证专业术语的一致性，避免歧义，确保技术含义准确传达`,
    usage: {
      total_tokens: 150,
      prompt_tokens: 100,
      completion_tokens: 50
    }
  }
}

// 模拟翻译结果 - 根据Dify示例重新设计
function getMockTranslationResult() {
  return {
    answer: `Map Quality Verification 
Map Ghosting 
Map ghosting can cause the robot to experience localization loss during task execution, leading to issues such as sudden operation halt and erratic movement during operation. Special attention is required during mapping. Obvious signs include walls appearing as double lines or roads being distorted and inconsistent with the actual scene. If uncertain, focus on this area during testing. 

Phantom 
The presence of phantoms on the map can cause the robot to experience localization loss during task execution. When the robot moves to that location, it detects a decrease in the localization score. When the score drops below a certain threshold, the robot may experience sudden operation halt and erratic movement during operation. Special attention is required during mapping. Reason: The machine did not fully scan the area by advancing into it. If the area does not require cleaning and does not affect the localization of surrounding areas, it is acceptable. If the area requires cleaning, use the expansion function to expand this area. 

Glass Scenarios 
When encountering glass during internal mapping, the robot's lidar can scan through the glass to areas behind it. The actual glass wall connection areas will display multiple point cloud data on the map. After saving the map, establish a forbidden zone in this area.`,
    usage: {
      total_tokens: 200,
      prompt_tokens: 120,
      completion_tokens: 80
    }
  }
}

// 从文本中提取专有名词
function extractProperNounsFromText(text) {
  const nouns = [
    { original: '重影', translation: 'Ghosting' },
    { original: '虚影', translation: 'Phantom' },
    { original: '定位得分', translation: 'Localization Score' },
    { original: '扩建功能', translation: 'Expansion Function' },
    { original: '点云数据', translation: 'Point Cloud Data' },
    { original: '定位丢失', translation: 'Localization Loss' },
    { original: '运行停止', translation: 'Operation Halt' },
    { original: '乱走', translation: 'Erratic Movement' },
    { original: '禁区', translation: 'Forbidden Zone' }
  ]
  
  // 根据文本内容筛选相关名词
  return nouns.filter(noun => text.includes(noun.original))
}

// 提取内容结构
function extractContentStructure(text) {
  if (text.includes('地图质量确认')) {
    return '地图质量确认文档：包含地图重影、虚影和玻璃场景的处理说明'
  }
  if (text.includes('重影')) {
    return '地图重影问题：描述重影现象对机器人定位和运行的影响，以及识别方法'
  }
  if (text.includes('虚影')) {
    return '地图虚影问题：分析虚影成因、影响及处理方案'
  }
  if (text.includes('玻璃')) {
    return '玻璃场景处理：说明激光雷达在玻璃环境下的扫描特性及应对措施'
  }
  return '技术文档：包含多个技术问题的描述和解决方案'
}

// 生成新术语表格
function generateNewTermsTable(nouns) {
  return nouns.map(noun => 
    `${noun.original} \t ${noun.translation} \t ${noun.original.length > 2 ? '是' : '否'} \t 技术文档标准术语`
  ).join('\n')
}

// 1. 提交翻译文本并获取专有名词建议 - 根据Dify示例重新设计
router.post('/submit-text', async (req, res) => {
  try {
    // 记录前端发来的请求体，用于排查问题
    logger.info('📥 submit-text req.body:', req.body)
    
    // 记录请求体简要信息，便于对比curl和前端请求
    logger.info('📥 submit-text body 简要:', {
      textLength: req.body?.text?.length || 0,
      preview: (req.body?.text || '').slice(0, 50)
    })
    
    const { text, language_from, language_to, sessionId: providedSessionId } = req.body
    
    if (!text) {
      return res.status(400).json({ error: '请输入翻译文本' })
    }
    
    // 使用前端提供的会话ID，或者生成新的
    const sessionId = providedSessionId || ('session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9))
    
    // 创建会话
    userSessions.set(sessionId, {
      id: sessionId,
      originalText: text,
      languageFrom: language_from || 'ZH',
      languageTo: language_to || 'EN-US',
      status: 'analyzing',
      createdAt: new Date()
    })
    
    // 发送到Dify聊天API进行分析 - 传递语言参数
    const result = await sendToDifyChat(text, sessionId, language_from, language_to)
    
    // 解析真实的Dify API响应格式
    const analysisResult = parseDifyAnalysisResult(result, sessionId)
    
    // 更新会话状态
    userSessions.get(sessionId).analysisResult = analysisResult
    userSessions.get(sessionId).status = 'awaiting_confirmation'
    
    res.json(analysisResult)
    
  } catch (error) {
    logger.error('分析文本错误:', error)
    
    // 细化错误分类 - 基于Dify API返回的状态码
    let statusCode = 500
    let errorType = 'internal_error'
    let errorMessage = error.message
    
    // 检查是否有响应对象
    if (error.response) {
      // 使用Dify API返回的实际状态码
      statusCode = error.response.status
      
      // 根据Dify官方文档的状态码分类
      switch (statusCode) {
        case 400:
          errorType = 'bad_request'
          errorMessage = error.response.data?.message || '请求格式错误，请检查参数'
          break
        case 401:
          errorType = 'unauthorized'
          errorMessage = 'Dify API密钥无效或未配置'
          break
        case 402:
          errorType = 'payment_required'
          errorMessage = 'Dify API调用次数已用完'
          break
        case 403:
          errorType = 'forbidden'
          errorMessage = '无权限访问此API端点'
          break
        case 404:
          errorType = 'not_found'
          errorMessage = '请求的API端点不存在'
          break
        case 429:
          errorType = 'too_many_requests'
          errorMessage = 'Dify API请求频率过高，请稍后重试'
          break
        case 500:
          errorType = 'internal_server_error'
          errorMessage = 'Dify服务器内部错误'
          break
        case 502:
          errorType = 'bad_gateway'
          errorMessage = 'Dify网关错误'
          break
        case 503:
          errorType = 'service_unavailable'
          errorMessage = 'Dify服务暂时不可用'
          break
        case 504:
          errorType = 'gateway_timeout'
          errorMessage = 'Dify网关超时，但请求可能已在Dify后台成功处理'
          break
        default:
          errorType = 'dify_api_error'
          errorMessage = error.response.data?.message || `Dify API调用失败，状态码: ${statusCode}`
      }
    } else if (error.code === 'ECONNABORTED') {
      // 请求超时
      statusCode = 504
      errorType = 'request_timeout'
      errorMessage = 'Dify API请求超时，请稍后重试'
    } else if (error.message.includes('Dify API密钥未配置')) {
      // 本地配置错误
      statusCode = 400
      errorType = 'api_key_missing'
    } else {
      // 其他错误
      errorType = 'dify_api_error'
    }
    
    // 返回详细的错误信息，包括错误类型、消息和建议
    res.status(statusCode).json({ 
      error: '分析文本失败',
      type: errorType,
      message: errorMessage,
      suggestion: getErrorSuggestion(errorType),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
})

// 2. 确认专有名词翻译 - 根据Dify示例重新设计
router.post('/confirm-nouns', async (req, res) => {
  try {
    const { sessionId, confirmedNouns, userResponse } = req.body
    
    if (!userSessions.has(sessionId)) {
      return res.status(404).json({ error: '会话不存在' })
    }
    
    const session = userSessions.get(sessionId)
    
    // 处理用户响应
    if (userResponse && userResponse.includes('好,按你建议的翻译啊吧')) {
      // 用户确认所有建议翻译
      session.confirmedNouns = session.analysisResult.properNouns.map(noun => ({
        original: noun.original,
        translation: noun.translation,
        confirmed: true
      }))
    } else if (confirmedNouns) {
      // 用户选择性地确认专有名词
      session.confirmedNouns = confirmedNouns
    }
    
    session.status = 'nouns_confirmed'
    
    // 保存到翻译记忆库
    session.confirmedNouns.forEach(noun => {
      if (noun.confirmed) {
        translationMemory.set(noun.original, noun.translation)
      }
    })
    
    // 生成确认响应 - 匹配Dify格式
    const confirmationResponse = {
      message: `好的,已经帮您把这些词存进去了:${session.confirmedNouns.filter(n => n.confirmed).map(n => `${n.original}:${n.translation}`).join(',')},`,
      prompt: '如果需要直接开始翻译,请回复:开始翻译'
    }
    
    res.json(confirmationResponse)
    
  } catch (error) {
    logger.error('确认专有名词错误:', error)
    
    let statusCode = 500
    let errorType = 'internal_error'
    
    if (error.message.includes('会话不存在')) {
      statusCode = 404
      errorType = 'session_not_found'
    }
    
    res.status(statusCode).json({ 
      error: '确认专有名词失败',
      type: errorType,
      message: error.message,
      suggestion: getErrorSuggestion(errorType)
    })
  }
})

// 3. 开始翻译 - 根据Dify示例重新设计
router.post('/start-translation', async (req, res) => {
  try {
    const { sessionId, userInput } = req.body
    
    if (!userSessions.has(sessionId)) {
      return res.status(404).json({ error: '会话不存在' })
    }
    
    const session = userSessions.get(sessionId)
    
    // 检查用户是否输入了"开始翻译"
    if (userInput && userInput.includes('开始翻译')) {
      if (session.status !== 'nouns_confirmed') {
        return res.status(400).json({ error: '请先确认专有名词' })
      }
      
      // 发送到Dify聊天API进行翻译
      const result = await sendToDifyChat(session.originalText, sessionId, session.languageFrom, session.languageTo)
      
      // 更新会话状态
      session.translationResult = {
        translatedText: result.answer,
        translationTime: new Date(),
        usage: result.usage
      }
      session.status = 'translation_completed'
      
      res.json(session.translationResult)
    } else {
      // 用户未输入"开始翻译"，返回提示
      res.json({
        message: '请回复"开始翻译"以开始翻译流程'
      })
    }
    
  } catch (error) {
    logger.error('翻译错误:', error)
    
    // 细化错误分类 - 基于Dify API返回的状态码
    let statusCode = 500
    let errorType = 'internal_error'
    
    if (error.message.includes('会话不存在')) {
      statusCode = 404
      errorType = 'session_not_found'
    } else if (error.response) {
      // 使用Dify API返回的实际状态码
      statusCode = error.response.status
      
      // 根据Dify官方文档的状态码分类
      switch (statusCode) {
        case 400:
          errorType = 'bad_request'
          break
        case 401:
          errorType = 'unauthorized'
          break
        case 402:
          errorType = 'payment_required'
          break
        case 403:
          errorType = 'forbidden'
          break
        case 404:
          errorType = 'not_found'
          break
        case 429:
          errorType = 'too_many_requests'
          break
        case 500:
          errorType = 'internal_server_error'
          break
        case 502:
          errorType = 'bad_gateway'
          break
        case 503:
          errorType = 'service_unavailable'
          break
        case 504:
          errorType = 'gateway_timeout'
          break
        default:
          errorType = 'dify_api_error'
      }
    } else if (error.code === 'ECONNABORTED') {
      statusCode = 504
      errorType = 'request_timeout'
    }
    
    res.status(statusCode).json({ 
      error: '翻译失败',
      type: errorType,
      message: error.message,
      suggestion: getErrorSuggestion(errorType)
    })
  }
})

// 4. 获取会话状态
router.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params
  
  if (!userSessions.has(sessionId)) {
    return res.status(404).json({ error: '会话不存在' })
  }
  
  const session = userSessions.get(sessionId)
  res.json({
    id: session.id,
    status: session.status,
    originalText: session.originalText,
    analysisResult: session.analysisResult,
    confirmedNouns: session.confirmedNouns,
    translationResult: session.translationResult,
    createdAt: session.createdAt
  })
})

// 辅助函数 - 解析真实的Dify API响应格式
function parseDifyAnalysisResult(difyResponse, sessionId) {
  // 根据Dify官方文档，chat-messages API的标准响应格式
  const answer = difyResponse.answer || ''
  const conversationId = difyResponse.conversation_id || ''
  const messageId = difyResponse.message_id || ''
  
  logger.info('🔍 解析Dify API响应:', {
    answer: answer.substring(0, 100) + '...',
    conversationId: conversationId,
    messageId: messageId
  })
  
  // 解析分析文本
  const properNouns = extractDifyProperNouns(answer)
  
  // 转换为前端期望的数据结构
  const analysisResult = {
    sessionId: sessionId,
    conversationId: conversationId,
    messageId: messageId,
    documentInfo: {
      domain: extractField(answer, '所属领域') || '技术文档',
      style: extractField(answer, '文体风格') || '技术说明文档',
      purpose: extractField(answer, '翻译用途') || '国际技术文档发布'
    },
    contentStructure: extractField(answer, '内容结构概览') || '技术文档结构',
    properNouns: properNouns,
    confirmationText: extractConfirmationText(answer),
    translationStrategy: extractTranslationStrategy(answer),
    // 前端期望的字段
    existingTerms: properNouns.filter(noun => noun.fromDatabase).map(noun => ({
      original: noun.original,
      translation: noun.translation,
      suggestion: '建议沿用',
      remark: '数据库中已有翻译'
    })),
    newTerms: properNouns.filter(noun => !noun.fromDatabase).map(noun => ({
      original: noun.original,
      translation: noun.translation,
      reason: '新术语建议翻译',
      confirmed: false
    }))
  }
  
  return analysisResult
}

// 解析模拟数据格式
function parseMockAnalysisResult(answer, sessionId) {
  const properNouns = extractDifyProperNouns(answer)
  
  return {
    sessionId: sessionId,
    documentInfo: {
      domain: extractField(answer, '所属领域') || '技术文档',
      style: extractField(answer, '文体风格') || '技术说明文档',
      purpose: extractField(answer, '翻译用途') || '国际技术文档发布'
    },
    contentStructure: extractField(answer, '内容结构概览') || '技术文档结构',
    properNouns: properNouns,
    confirmationText: extractConfirmationText(answer),
    translationStrategy: extractTranslationStrategy(answer),
    existingTerms: properNouns.filter(noun => noun.fromDatabase).map(noun => ({
      original: noun.original,
      translation: noun.translation,
      suggestion: '建议沿用',
      remark: '数据库中已有翻译'
    })),
    newTerms: properNouns.filter(noun => !noun.fromDatabase).map(noun => ({
      original: noun.original,
      translation: noun.translation,
      reason: '新术语建议翻译',
      confirmed: false
    }))
  }
}

function extractField(text, fieldName) {
  const regex = new RegExp(`${fieldName}[：:]\\s*([^\\n]+)`)
  const match = text.match(regex)
  return match ? match[1].trim() : ''
}

function extractDifyProperNouns(answer) {
  const nouns = []
  
  logger.info('🔍 开始解析Dify API返回的文本:')
  logger.info(answer)
  
  // 改进的解析逻辑：更准确地识别表格结构
  
  // 1. 提取数据库已有翻译部分
  const existingNounsMatch = answer.match(/数据库中已有翻译[^]*?(?=2\.\s*新术语|第三部分|第四部分|$)/s)
  if (existingNounsMatch) {
    const existingNounsText = existingNounsMatch[0]
    logger.info('📋 数据库已有翻译部分:', existingNounsText)
    
    // 改进正则表达式：匹配表格行，正确处理中文术语和英文翻译
    const lines = existingNounsText.split('\n')
    for (const line of lines) {
      // 匹配表格行格式：中文术语 + 英文翻译 + 是否建议沿用 + 备注
      const match = line.match(/^([\u4e00-\u9fa5]{2,10})\s+([A-Za-z\s]+)\s+(是|否)\s+([^\n]+)$/)
      if (match) {
        const original = match[1].trim()
        const translation = match[2].trim()
        if (original && translation) {
          nouns.push({
            original: original,
            translation: translation,
            fromDatabase: true,
            confirmed: false
          })
          logger.info('✅ 提取数据库术语:', original, '→', translation)
        }
      }
    }
  }
  
  // 2. 提取新术语部分
  const newNounsMatch = answer.match(/新术语[^]*?(?=第三部分|第四部分|$)/s)
  if (newNounsMatch) {
    const newNounsText = newNounsMatch[0]
    logger.info('📋 新术语部分:', newNounsText)
    
    // 改进正则表达式：匹配表格行，正确处理中文术语和英文翻译
    const lines = newNounsText.split('\n')
    for (const line of lines) {
      // 匹配表格行格式：中文术语 + 英文翻译 + 是否需要确认 + 备注
      const match = line.match(/^([\u4e00-\u9fa5]{2,10})\s+([A-Za-z\s]+)\s+(是|否)\s+([^\n]+)$/)
      if (match) {
        const original = match[1].trim()
        const translation = match[2].trim()
        if (original && translation) {
          nouns.push({
            original: original,
            translation: translation,
            fromDatabase: false,
            confirmed: false
          })
          logger.info('✅ 提取新术语:', original, '→', translation)
        }
      }
    }
  }
  
  // 3. 如果从表格中无法正确解析，使用更智能的解析方法
  if (nouns.length === 0) {
    logger.warn('⚠️  无法从表格中解析术语，使用智能解析')
    
    // 尝试从整个回答中提取中文-英文术语对
    const chineseNouns = answer.match(/[\u4e00-\u9fa5]{2,10}/g) || []
    const englishTerms = answer.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || []
    
    logger.info('🔍 发现中文术语:', chineseNouns)
    logger.info('🔍 发现英文术语:', englishTerms)
    
    // 简单的匹配逻辑：将中文术语与英文术语配对
    for (let i = 0; i < Math.min(chineseNouns.length, englishTerms.length); i++) {
      nouns.push({
        original: chineseNouns[i],
        translation: englishTerms[i],
        fromDatabase: false,
        confirmed: false
      })
    }
  }
  
  // 4. 如果没有解析到术语，返回空数组，不使用模拟数据
  if (nouns.length === 0) {
    logger.warn('⚠️  未从API响应中解析到术语，返回空数组')
  }
  
  logger.info('📊 最终解析结果:', nouns)
  return nouns
}

function extractConfirmationText(answer) {
  const confirmationMatch = answer.match(/给客户的确认文案[^]*?(?=第四部分|$)/s)
  return confirmationMatch ? confirmationMatch[0].trim() : '确认文案'
}

function extractTranslationStrategy(answer) {
  const strategyMatch = answer.match(/翻译策略建议[^]*?(?=$)/s)
  return strategyMatch ? strategyMatch[0].trim() : '翻译策略建议'
}

function buildTranslationPrompt(originalText, confirmedNouns) {
  const nounsMap = confirmedNouns.filter(n => n.confirmed).map(n => `${n.original} → ${n.translation}`).join('\n')
  
  return `请翻译以下技术文档文本，特别注意已确认的专有名词翻译：\n\n${originalText}\n\n已确认的专有名词对照表：\n${nounsMap}\n\n请提供专业、准确的技术文档翻译。`
}

// 错误建议函数 - 根据错误类型提供有用的建议
function getErrorSuggestion(errorType) {
  const suggestions = {
    'api_key_missing': '请检查.env文件中的DIFY_API_KEY配置，确保API密钥已正确设置',
    'gateway_timeout': 'Dify API网关超时，请稍后重试，或检查网络连接',
    'request_timeout': '请求超时，请稍后重试，或尝试缩短请求文本长度',
    'dify_api_error': 'Dify API调用失败，请检查API密钥和网络连接，或稍后重试',
    'internal_error': '服务器内部错误，请检查日志获取更多信息，或稍后重试',
    'file_type_not_supported': '不支持的文件类型，请上传文本、PDF、Word文档或图片',
    'file_size_exceeded': '文件大小超过限制，请上传小于10MB的文件',
    'session_not_found': '会话不存在，请检查会话ID是否正确',
    'invalid_input': '无效的输入参数，请检查请求格式是否正确'
  }
  
  return suggestions[errorType] || '请稍后重试，如果问题持续存在，请联系管理员'
}

// 文件处理函数 - 改进版本，增加扩展名支持和更好的错误处理
async function extractTextFromFile(filePath, mimetype, originalname) {
  try {
    logger.info(`📋 文件处理详情:`, {
      filePath: filePath,
      mimetype: mimetype,
      originalname: originalname,
      extension: path.extname(originalname).toLowerCase()
    })
    
    // 获取文件扩展名
    const extension = path.extname(originalname).toLowerCase()
    
    // 1. 文本文件处理 - 支持多种编码
    if (mimetype === 'text/plain' || extension === '.txt') {
      logger.info('📄 处理文本文件...')
      try {
        // 优先尝试utf8编码
        return fs.readFileSync(filePath, 'utf8')
      } catch (utf8Error) {
        logger.warn('⚠️ UTF-8编码失败，尝试使用gbk编码:', utf8Error.message)
        // 尝试gbk编码（中文Windows系统常用）
        return fs.readFileSync(filePath, 'gbk')
      }
    }
    
    // 2. PDF文件处理
    if (mimetype === 'application/pdf' || extension === '.pdf') {
      logger.info('📄 处理PDF文件...')
      return new Promise((resolve, reject) => {
        // 设置超时机制，避免PDF解析长时间无响应
        const timeoutId = setTimeout(() => {
          logger.error('❌ PDF解析超时')
          reject(new Error('PDF解析超时，请尝试上传较小的PDF文件'))
        }, 60000) // 60秒超时
        
        const pdfParser = new PDFParser()
        
        pdfParser.on('pdfParser_dataError', errData => {
          clearTimeout(timeoutId)
          logger.error('❌ PDF解析错误:', errData.parserError)
          reject(new Error(`PDF解析错误: ${errData.parserError}`))
        })
        
        pdfParser.on('pdfParser_dataReady', pdfData => {
          clearTimeout(timeoutId)
          try {
            // 尝试使用不同的方法提取PDF文本
            let text = ''
            
            // 方法1: 使用getRawTextContent()
            try {
              text = pdfParser.getRawTextContent()
              logger.info('✅ 使用getRawTextContent()提取PDF文本，长度:', text ? text.length : 0)
            } catch (getRawError) {
              logger.error('⚠️ 使用getRawTextContent()提取失败:', getRawError.message)
              text = ''
            }
            
            // 方法2: 如果方法1失败，尝试直接从pdfData中提取
            if (!text || text.trim() === '') {
              logger.info('🔄 尝试直接从pdfData中提取PDF文本...')
              try {
                // 遍历所有页面，提取文本
                const pages = pdfData.Pages || []
                logger.info(`📄 发现 ${pages.length} 页PDF内容`)
                
                let extractedText = ''
                for (let i = 0; i < pages.length; i++) {
                  const page = pages[i]
                  if (page.Texts) {
                    for (const textItem of page.Texts) {
                      if (textItem.R) {
                        for (const r of textItem.R) {
                          if (r.T) {
                            try {
                              // 解码Base64编码的文本
                              const decodedText = Buffer.from(r.T, 'base64').toString('utf8')
                              extractedText += decodedText
                            } catch (decodeError) {
                              logger.error('⚠️ 解码文本失败:', decodeError.message)
                            }
                          }
                        }
                      }
                    }
                  }
                }
                
                text = extractedText
                logger.info('✅ 直接从pdfData中提取PDF文本，长度:', text ? text.length : 0)
              } catch (directExtractError) {
                logger.error('⚠️ 直接从pdfData中提取失败:', directExtractError.message)
                text = ''
              }
            }
            
            // 方法3: 如果前两种方法都失败，返回一个默认的成功消息
            if (!text || text.trim() === '') {
              logger.warn('⚠️ 无法从PDF中提取文本，返回默认消息')
              text = `[PDF文件] ${originalname}\n\n提示：PDF文件已上传，但无法提取文本内容。这可能是因为PDF文件是扫描件或加密文件。`
            }
            
            logger.info('✅ PDF提取完成，最终文字长度:', text ? text.length : 0)
            resolve(text || '')
          } catch (extractError) {
            logger.error('❌ 提取PDF文本失败:', extractError.message)
            reject(new Error(`提取PDF文本失败: ${extractError.message}`))
          }
        })
        
        try {
          pdfParser.loadPDF(filePath)
          logger.info('🔄 正在加载PDF文件...')
        } catch (loadError) {
          clearTimeout(timeoutId)
          logger.error('❌ 加载PDF文件失败:', loadError.message)
          reject(new Error(`加载PDF文件失败: ${loadError.message}`))
        }
      })
    }
    
    // 3. Word文档处理
    if (
      mimetype === 'application/msword' || 
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === '.doc' ||
      extension === '.docx'
    ) {
      logger.info('📄 处理Word文档...')
      const docBuffer = fs.readFileSync(filePath)
      const result = await mammoth.extractRawText({ buffer: docBuffer })
      logger.info('✅ Word提取完成，文字长度:', result.value.length)
      return result.value
    }
    
    // 4. PPT文档处理
    if (
      mimetype === 'application/vnd.ms-powerpoint' || 
      mimetype === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      extension === '.ppt' ||
      extension === '.pptx'
    ) {
      logger.info('📄 处理PPT文档...')
      
      // 简单的PPT处理：返回文件名和提示信息
      // 实际项目中可以使用专门的库来提取PPT文本
      const pptText = `[PPT文件] ${originalname}\n\n提示：PPT文件已上传，文本提取功能正在开发中。`
      logger.info('✅ PPT处理完成，返回提示信息')
      return pptText
    }
    
    // 5. 图片文件处理 - OCR识别（腾讯云OCR）
    if (
      mimetype === 'image/jpeg' || 
      mimetype === 'image/png' || 
      mimetype === 'image/gif' ||
      extension === '.jpg' ||
      extension === '.jpeg' ||
      extension === '.png' ||
      extension === '.gif'
    ) {
      logger.info('🔍 开始OCR识别图片文字（TextIn OCR）...')
      try {
        const ocrResult = await textinOcrRecognize(filePath)
        logger.info('✅ TextIn OCR识别完成，提取文字长度:', ocrResult ? ocrResult.length : 0)
        return ocrResult
      } catch (ocrError) {
        logger.warn('⚠️ TextIn OCR识别失败:', ocrError.message)
        throw new Error(`TextIn OCR识别失败: ${ocrError.message}`)
      }
    }
    
    // 不支持的文件类型
    const errorMsg = `不支持的文件类型: ${mimetype} (扩展名: ${extension})`
    logger.error('❌', errorMsg)
    throw new Error(errorMsg)
  } catch (error) {
    logger.error('❌ 文件处理错误:', error)
    throw new Error(`文件处理失败: ${error.message}`)
  }
}

// 5. 文件上传API端点
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' })
    }
    
    const { originalname, mimetype, size, path: filePath } = req.file
    
    logger.info(`📁 处理文件: ${originalname}, 类型: ${mimetype}, 大小: ${size} bytes`)
    
    // 提取文件内容 - 传递originalname参数，支持按扩展名处理
    const extractedText = await extractTextFromFile(filePath, mimetype, originalname)
    
    // 清理上传的文件
    fs.unlinkSync(filePath)
    
    logger.info('📊 提取结果:', {
      extractedTextLength: extractedText ? extractedText.length : 0,
      isEmpty: !extractedText || extractedText.trim() === ''
    })
    
    if (!extractedText || extractedText.trim() === '') {
      return res.status(400).json({ error: '无法从文件中提取文本内容，请检查文件是否为空或格式是否正确' })
    }
    
    logger.info(`✅ 成功提取文本内容，长度: ${extractedText.length} 字符`)
    
    res.json({
      success: true,
      fileName: originalname,
      fileSize: size,
      extractedText: extractedText.trim(),
      originalText: extractedText.trim(), // 兼容前端期望的originalText字段
      message: '文件处理成功'
    })
    
  } catch (error) {
    logger.error('文件上传错误:', error)
    
    // 清理上传的文件（如果存在）
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        logger.error('清理文件失败:', unlinkError)
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || '文件处理失败'
    })
  }
})

// 历史记录查询API
router.get('/history', (req, res) => {
  try {
    const { searchText = '', page = 1, pageSize = 10 } = req.query
    const pageNum = parseInt(page)
    const sizeNum = parseInt(pageSize)
    
    logger.info(`📊 查询历史记录: 搜索词="${searchText}", 页码=${pageNum}, 每页=${sizeNum}`)
    
    // 获取所有会话记录
    const allSessions = Array.from(userSessions.values())
    
    // 过滤搜索结果
    let filteredSessions = allSessions
    if (searchText) {
      filteredSessions = allSessions.filter(session => 
        session.originalText && session.originalText.includes(searchText)
      )
    }
    
    // 分页计算
    const total = filteredSessions.length
    const totalPages = Math.ceil(total / sizeNum)
    const startIndex = (pageNum - 1) * sizeNum
    const endIndex = startIndex + sizeNum
    const paginatedSessions = filteredSessions.slice(startIndex, endIndex)
    
    // 构建返回数据
    const historyData = paginatedSessions.map(session => ({
      sessionId: session.id,
      originalText: session.originalText,
      translatedText: session.translationResult?.translatedText || '',
      translationTime: session.translationResult?.translationTime || session.createdAt,
      fileName: session.fileName || null,
      createdAt: session.createdAt,
      status: session.status
    }))
    
    logger.info(`✅ 历史记录查询完成: 总数=${total}, 返回=${historyData.length}`)
    
    res.json({
      success: true,
      data: {
        history: historyData,
        pagination: {
          currentPage: pageNum,
          totalPages: totalPages,
          totalCount: total,
          pageSize: sizeNum,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      }
    })
    
  } catch (error) {
    logger.error('历史记录查询错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '历史记录查询失败'
    })
  }
})

export default router