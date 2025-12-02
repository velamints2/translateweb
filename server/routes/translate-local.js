/**
 * 使用本地Agent的翻译路由
 * 替代原来的Dify API调用
 */

import express from 'express'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mammoth from 'mammoth'
import PDFParser from 'pdf2json'
import logger from '../utils/logger.js'
import translationAgent from '../agent/index.js'
import { textinOcrRecognize } from '../agent/tools/textin-ocr.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif'
    ]
    
    const allowedExtensions = ['.txt', '.doc', '.docx', '.pdf', '.jpg', '.jpeg', '.png', '.gif']
    const fileExtension = path.extname(file.originalname).toLowerCase()
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExtension)) {
      cb(null, true)
    } else {
      cb(new Error('不支持的文件类型'), false)
    }
  }
})

// 模拟数据库
const translationMemory = new Map()
const userSessions = new Map()

/**
 * 1. 提交翻译文本并获取专有名词建议
 */
router.post('/submit-text', async (req, res) => {
  try {
    logger.info('📥 收到文本分析请求')
    const { text, language_from, language_to, sessionId: providedSessionId } = req.body
    
    if (!text) {
      return res.status(400).json({ error: '请输入翻译文本' })
    }
    
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
    
    // 使用本地agent进行分析
    const analysisResult = await translationAgent.preprocessText(
      text,
      language_from || 'ZH',
      language_to || 'EN-US'
    )
    
    // 转换为前端期望的格式
    const responseData = {
      sessionId: sessionId,
      documentInfo: analysisResult.documentInfo,
      contentStructure: analysisResult.contentStructure,
      properNouns: analysisResult.properNouns,
      confirmationText: analysisResult.confirmationText,
      translationStrategy: analysisResult.translationStrategy,
      existingTerms: analysisResult.existingTerms,
      newTerms: analysisResult.newTerms,
      usage: analysisResult.usage
    }
    
    // 更新会话
    const session = userSessions.get(sessionId)
    session.analysisResult = responseData
    session.status = 'awaiting_confirmation'
    
    logger.info('✅ 文本分析完成')
    res.json(responseData)
    
  } catch (error) {
    logger.error('❌ 分析文本错误:', error)
    res.status(500).json({ 
      error: '分析文本失败',
      message: error.message
    })
  }
})

/**
 * 2. 确认专有名词翻译
 */
router.post('/confirm-nouns', async (req, res) => {
  try {
    const { sessionId, confirmedNouns, userResponse } = req.body
    
    if (!sessionId) {
      return res.status(400).json({ error: '会话ID不能为空' })
    }
    
    if (!userSessions.has(sessionId)) {
      return res.status(404).json({ error: '会话不存在' })
    }
    
    const session = userSessions.get(sessionId)
    
    // 确保analysisResult存在
    if (!session.analysisResult || !session.analysisResult.properNouns) {
      return res.status(400).json({ error: '会话数据不完整，请先提交文本分析' })
    }
    
    // 处理用户响应
    if (userResponse && userResponse.includes('好')) {
      // 用户确认所有建议翻译
      session.confirmedNouns = session.analysisResult.properNouns.map(noun => ({
        original: noun.original,
        translation: noun.translation,
        confirmed: true,
        fromDatabase: noun.fromDatabase || false
      }))
    } else if (Array.isArray(confirmedNouns)) {
      // 用户选择性确认（允许空数组）
      // 修复BUG: 如果是空数组，表示用户确实不想确认任何术语，而不是默认全选
      session.confirmedNouns = confirmedNouns
    } else {
      // 如果既没有userResponse也没有confirmedNouns，使用所有术语作为默认值
      session.confirmedNouns = session.analysisResult.properNouns.map(noun => ({
        original: noun.original,
        translation: noun.translation,
        confirmed: true,
        fromDatabase: noun.fromDatabase || false
      }))
    }
    
    // 确保confirmedNouns存在且是数组
    if (!session.confirmedNouns || !Array.isArray(session.confirmedNouns)) {
      return res.status(500).json({ error: '术语数据格式错误' })
    }
    
    session.status = 'nouns_confirmed'
    
    // 保存到翻译记忆库
    session.confirmedNouns.forEach(noun => {
      if (noun.confirmed) {
        translationMemory.set(noun.original, noun.translation)
      }
    })
    
    // 将新术语添加到知识库
    const newTermsToAdd = session.confirmedNouns.filter(n => n.confirmed && !n.fromDatabase)
    if (newTermsToAdd.length > 0) {
      try {
        await translationAgent.addTerms(newTermsToAdd)
      } catch (error) {
        logger.warn('⚠️  添加术语到知识库失败:', error.message)
      }
    }
    
    // 生成确认消息
    const confirmedTerms = session.confirmedNouns.filter(n => n.confirmed)
    const termsList = confirmedTerms.length > 0
      ? confirmedTerms.map(n => `${n.original}:${n.translation}`).join(',')
      : '无'
    
    const confirmationResponse = {
      message: `好的,已经帮您把这些词存进去了:${termsList},`,
      prompt: '如果需要直接开始翻译,请回复:开始翻译'
    }
    
    logger.info(`✅ 术语确认成功，共${confirmedTerms.length}个术语`)
    res.json(confirmationResponse)
    
  } catch (error) {
    logger.error('❌ 确认专有名词错误:', error)
    res.status(500).json({ 
      error: '确认专有名词失败',
      message: error.message
    })
  }
})

/**
 * 3. 开始翻译
 */
router.post('/start-translation', async (req, res) => {
  try {
    const { sessionId, userInput } = req.body
    
    if (!sessionId) {
      return res.status(400).json({ error: '会话ID不能为空' })
    }
    
    if (!userSessions.has(sessionId)) {
      return res.status(404).json({ error: '会话不存在' })
    }
    
    const session = userSessions.get(sessionId)
    
    // 检查会话状态
    if (session.status !== 'nouns_confirmed') {
      return res.status(400).json({ 
        error: '请先确认专有名词',
        currentStatus: session.status,
        requiredStatus: 'nouns_confirmed'
      })
    }
    
    // 确保confirmedNouns是数组（即使为空也可以翻译）
    if (!Array.isArray(session.confirmedNouns)) {
      session.confirmedNouns = []
    }
    
    // 检查原始文本
    if (!session.originalText || session.originalText.trim() === '') {
      return res.status(400).json({ 
        error: '原始文本为空'
      })
    }
    
    try {
      // 使用本地agent执行翻译
      const translationResult = await translationAgent.translate(
        session.originalText,
        session.languageFrom,
        session.languageTo,
        session.confirmedNouns,
        session.analysisResult?.documentInfo,
        session.analysisResult?.translationStrategy
      )
      
      // 验证翻译结果
      if (!translationResult || !translationResult.translatedText) {
        throw new Error('翻译结果为空')
      }
      
      // 更新会话
      session.translationResult = {
        translatedText: translationResult.translatedText,
        translationTime: new Date(),
        usage: translationResult.usage || {}
      }
      session.status = 'translation_completed'
      
      logger.info('✅ 翻译完成')
      
      // 返回标准格式
      res.json({
        translatedText: session.translationResult.translatedText,
        sessionId: sessionId,
        translationTime: session.translationResult.translationTime,
        usage: session.translationResult.usage
      })
      
    } catch (translationError) {
      logger.error('❌ 翻译执行失败:', translationError)
      
      // 如果是API密钥未配置的错误，返回更友好的提示
      if (translationError.message.includes('API密钥未配置')) {
        return res.status(400).json({
          error: '翻译失败',
          message: 'Claude API密钥未配置，无法执行翻译。请配置 ANTHROPIC_API_KEY 后重试。',
          suggestion: '请在 .env 文件中配置 ANTHROPIC_API_KEY'
        })
      }
      
      // 其他翻译错误
      throw translationError
    }
    
  } catch (error) {
    logger.error('❌ 翻译错误:', error)
    res.status(500).json({ 
      error: '翻译失败',
      message: error.message
    })
  }
})

/**
 * 4. 获取会话状态
 */
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

/**
 * 5. 文件上传处理
 */
router.post('/upload-file', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请选择要上传的文件' })
    }
    
    const { originalname, mimetype, size, path: filePath } = req.file
    logger.info(`📁 处理文件: ${originalname}`)
    
    const extractedText = await extractTextFromFile(filePath, mimetype, originalname)
    
    // 清理上传的文件
    fs.unlinkSync(filePath)
    
    if (!extractedText || extractedText.trim() === '') {
      return res.status(400).json({ error: '无法从文件中提取文本内容' })
    }
    
    logger.info(`✅ 成功提取文本内容，长度: ${extractedText.length} 字符`)
    
    res.json({
      success: true,
      fileName: originalname,
      fileSize: size,
      extractedText: extractedText.trim(),
      originalText: extractedText.trim(),
      message: '文件处理成功'
    })
    
  } catch (error) {
    logger.error('❌ 文件上传错误:', error)
    
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

/**
 * 6. 历史记录查询
 */
router.get('/history', (req, res) => {
  try {
    const { searchText = '', page = 1, pageSize = 10 } = req.query
    const pageNum = parseInt(page)
    const sizeNum = parseInt(pageSize)
    
    const allSessions = Array.from(userSessions.values())
    
    let filteredSessions = allSessions
    if (searchText) {
      filteredSessions = allSessions.filter(session => 
        session.originalText && session.originalText.includes(searchText)
      )
    }
    
    const total = filteredSessions.length
    const totalPages = Math.ceil(total / sizeNum)
    const startIndex = (pageNum - 1) * sizeNum
    const endIndex = startIndex + sizeNum
    const paginatedSessions = filteredSessions.slice(startIndex, endIndex)
    
    const historyData = paginatedSessions.map(session => ({
      sessionId: session.id,
      originalText: session.originalText,
      translatedText: session.translationResult?.translatedText || '',
      translationTime: session.translationResult?.translationTime || session.createdAt,
      fileName: session.fileName || null,
      createdAt: session.createdAt,
      status: session.status
    }))
    
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
    logger.error('❌ 历史记录查询错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '历史记录查询失败'
    })
  }
})

/**
 * 7. 翻译评价接口
 * 调用 DeepSeek 对翻译结果进行严格评分
 */
router.post('/evaluate', async (req, res) => {
  try {
    const { originalText, translatedText, sourceLang, targetLang, terminology, sessionId } = req.body
    
    if (!originalText || !translatedText) {
      return res.status(400).json({ error: '请提供原文和译文' })
    }
    
    logger.info('📊 开始翻译质量评估...')
    
    // 动态导入评估工具
    const { evaluateTranslation } = await import('../agent/tools/translation-evaluator.js')
    
    const evaluation = await evaluateTranslation(
      originalText,
      translatedText,
      sourceLang || 'ZH',
      targetLang || 'EN',
      terminology || []
    )
    
    // 如果提供了 sessionId，更新会话中的评估结果
    if (sessionId && userSessions.has(sessionId)) {
      const session = userSessions.get(sessionId)
      session.evaluation = evaluation
    }
    
    logger.info(`✅ 评估完成，总分: ${evaluation.scores.total}，等级: ${evaluation.grade}`)
    
    res.json({
      success: true,
      evaluation
    })
    
  } catch (error) {
    logger.error('❌ 翻译评估错误:', error)
    res.status(500).json({
      success: false,
      error: error.message || '翻译评估失败'
    })
  }
})

/**
 * 8. PDF 排版翻译接口
 * 上传 PDF，翻译后保持排版输出新 PDF
 */
router.post('/translate-pdf', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '请上传 PDF 文件' })
    }
    
    const { originalname, mimetype, path: filePath } = req.file
    const extension = path.extname(originalname).toLowerCase()
    
    // 验证文件类型
    if (mimetype !== 'application/pdf' && extension !== '.pdf') {
      fs.unlinkSync(filePath)
      return res.status(400).json({ error: '仅支持 PDF 文件' })
    }
    
    const { targetLang = 'EN', outputMode = 'overlay' } = req.body
    
    logger.info(`📄 开始 PDF 排版翻译: ${originalname}`)
    logger.info(`🎯 目标语言: ${targetLang}, 输出模式: ${outputMode}`)
    
    // 动态导入 PDF 翻译工具
    const { translatePdf } = await import('../agent/tools/pdf-translator.js')
    
    // 执行翻译
    const result = await translatePdf(filePath, targetLang, outputMode)
    
    // 清理上传的原文件
    fs.unlinkSync(filePath)
    
    // 生成输出文件名
    const outputFileName = originalname.replace('.pdf', `_translated_${targetLang}.pdf`)
    
    // 设置响应头，返回 PDF 文件
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(outputFileName)}"`)
    res.setHeader('X-Page-Count', result.pageCount)
    res.setHeader('X-Text-Block-Count', result.textBlockCount)
    res.setHeader('X-Translated-Count', result.translatedCount)
    
    res.send(result.buffer)
    
    logger.info(`✅ PDF 翻译完成: ${result.pageCount} 页, ${result.textBlockCount} 个文本块`)
    
  } catch (error) {
    logger.error('❌ PDF 翻译错误:', error)
    
    // 清理上传的文件
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        logger.error('清理文件失败:', unlinkError)
      }
    }
    
    res.status(500).json({
      success: false,
      error: error.message || 'PDF 翻译失败'
    })
  }
})

/**
 * 文件处理函数
 */
async function extractTextFromFile(filePath, mimetype, originalname) {
  const extension = path.extname(originalname).toLowerCase()
  
  // 文本文件
  if (mimetype === 'text/plain' || extension === '.txt') {
    return fs.readFileSync(filePath, 'utf8')
  }
  
  // PDF文件
  if (mimetype === 'application/pdf' || extension === '.pdf') {
    // 首先尝试使用 pdf2json 提取文本
    try {
      const text = await new Promise((resolve, reject) => {
        const pdfParser = new PDFParser()
        
        pdfParser.on('pdfParser_dataError', errData => {
          reject(new Error(`PDF解析错误: ${errData.parserError}`))
        })
        
        pdfParser.on('pdfParser_dataReady', pdfData => {
          try {
            const rawText = pdfParser.getRawTextContent()
            resolve(rawText)
          } catch (error) {
            reject(new Error(`提取PDF文本失败: ${error.message}`))
          }
        })
        
        pdfParser.loadPDF(filePath)
      })
      
      // 检查提取的文本是否有实际内容
      const cleanText = text ? text.replace(/\r\n/g, '\n').replace(/\s+/g, ' ').trim() : ''
      if (cleanText && cleanText.length > 10) {
        logger.info('✅ pdf2json 成功提取PDF文本')
        return cleanText
      }
    } catch (pdfError) {
      logger.warn('⚠️ pdf2json 解析失败，尝试使用 TextIn OCR:', pdfError.message)
    }
    
    // 如果 pdf2json 无法提取有效文本，使用 TextIn OCR
    logger.info('🔍 使用 TextIn OCR 识别 PDF 文字...')
    try {
      const ocrResult = await textinOcrRecognize(filePath)
      if (ocrResult && ocrResult.trim().length > 0) {
        logger.info('✅ TextIn OCR 成功识别 PDF，文字长度:', ocrResult.length)
        return ocrResult
      }
    } catch (ocrError) {
      logger.error('⚠️ TextIn OCR 识别失败:', ocrError.message)
    }
    
    return '[PDF文件无可识别文字内容]'
  }
  
  // Word文档
  if (mimetype === 'application/msword' || 
      mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === '.doc' ||
      extension === '.docx') {
    const docBuffer = fs.readFileSync(filePath)
    const result = await mammoth.extractRawText({ buffer: docBuffer })
    return result.value
  }
  
  // 图片文件 - 使用 TextIn OCR
  if (mimetype === 'image/jpeg' || mimetype === 'image/png' || mimetype === 'image/gif' ||
      extension === '.jpg' || extension === '.jpeg' || extension === '.png' || extension === '.gif') {
    logger.info('🔍 开始 TextIn OCR 识别图片文字...')
    try {
      const ocrResult = await textinOcrRecognize(filePath)
      logger.info('✅ TextIn OCR 识别完成，提取文字长度:', ocrResult ? ocrResult.length : 0)
      return ocrResult || '[图片无可识别文字]'
    } catch (ocrError) {
      logger.error('⚠️ TextIn OCR 识别失败:', ocrError.message)
      throw new Error(`OCR识别失败: ${ocrError.message}`)
    }
  }
  
  throw new Error(`不支持的文件类型: ${mimetype}`)
}

export default router


