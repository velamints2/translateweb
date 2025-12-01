import express from 'express'
import fs from 'fs'
import path from 'path'
import logger from '../utils/logger.js'
import translationAgent from '../agent/index.js'

const router = express.Router()

// 日志目录路径
const logDir = path.join(process.cwd(), 'logs')

/**
 * 生成翻译预处理报告（使用 DeepSeek）
 */
router.post('/preprocessing-report', async (req, res) => {
  try {
    const { text, languageFrom, languageTo, terminologyDatabase } = req.body
    
    if (!text || !languageFrom || !languageTo) {
      return res.status(400).json({
        success: false,
        message: '缺少必需参数：text, languageFrom, languageTo'
      })
    }

    logger.info('📋 生成翻译预处理报告...')
    
    // 调用预处理分析
    const analysisResult = await translationAgent.preprocessText(
      text,
      languageFrom,
      languageTo,
      terminologyDatabase || []
    )

    logger.info('✅ 翻译预处理报告生成成功')

    res.json({
      success: true,
      message: '翻译预处理报告生成成功',
      data: {
        documentInfo: analysisResult.documentInfo,
        contentStructure: analysisResult.contentStructure,
        confirmationText: analysisResult.confirmationText,
        translationStrategy: analysisResult.translationStrategy,
        existingTerms: analysisResult.existingTerms,
        newTerms: analysisResult.newTerms,
        properNouns: analysisResult.properNouns,
        analysisModel: analysisResult.analysisModel || 'local',
        analysisTimestamp: analysisResult.analysisTimestamp || new Date().toISOString(),
        rawAnalysis: analysisResult.rawAnalysis || null
      }
    })
  } catch (error) {
    logger.error('❌ 生成翻译预处理报告失败:', error.message)
    res.status(500).json({
      success: false,
      message: '生成翻译预处理报告失败',
      error: error.message
    })
  }
})

/**
 * 解析日志文件，提取错误信息
 * @param {string} filePath - 日志文件路径
 * @returns {Array} 错误信息数组
 */
function parseLogFile(filePath) {
  try {
    const logContent = fs.readFileSync(filePath, 'utf8')
    const logLines = logContent.split('\n')
    const errors = []

    logLines.forEach(line => {
      if (line.trim()) {
        try {
          const logEntry = JSON.parse(line)
          if (logEntry.level === 'error') {
            errors.push({
              timestamp: logEntry.timestamp,
              message: logEntry.message,
              stack: logEntry.stack,
              service: logEntry.service,
              ...logEntry.meta
            })
          }
        } catch (parseError) {
          // 处理非JSON格式的日志行
          logger.warn(`无法解析日志行: ${line}`, { parseError: parseError.message })
        }
      }
    })

    // 按时间戳倒序排序
    return errors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  } catch (error) {
    logger.error('读取日志文件失败', { filePath, error: error.message })
    return []
  }
}

/**
 * 获取所有错误日志
 */
router.get('/errors', (req, res) => {
  try {
    const errorLogPath = path.join(logDir, 'error.log')
    const combinedLogPath = path.join(logDir, 'combined.log')

    // 解析错误日志文件
    const errorLogErrors = parseLogFile(errorLogPath)
    // 解析综合日志文件，提取错误
    const combinedLogErrors = parseLogFile(combinedLogPath)

    // 合并并去重错误
    const allErrors = [...errorLogErrors, ...combinedLogErrors]
    
    // 去重 - 根据时间戳和消息内容
    const uniqueErrors = Array.from(
      new Map(allErrors.map(error => [`${error.timestamp}-${error.message}`, error])).values()
    )

    // 再次按时间戳倒序排序
    uniqueErrors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.json({
      success: true,
      errors: uniqueErrors,
      total: uniqueErrors.length
    })
  } catch (error) {
    logger.error('获取错误日志失败', { error: error.message })
    res.status(500).json({
      success: false,
      message: '获取错误日志失败',
      error: error.message
    })
  }
})

/**
 * 获取最新的N条错误日志
 */
router.get('/errors/latest/:count', (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10
    const errorLogPath = path.join(logDir, 'error.log')
    const combinedLogPath = path.join(logDir, 'combined.log')

    // 解析错误日志文件
    const errorLogErrors = parseLogFile(errorLogPath)
    // 解析综合日志文件，提取错误
    const combinedLogErrors = parseLogFile(combinedLogPath)

    // 合并并去重错误
    const allErrors = [...errorLogErrors, ...combinedLogErrors]
    
    // 去重 - 根据时间戳和消息内容
    const uniqueErrors = Array.from(
      new Map(allErrors.map(error => [`${error.timestamp}-${error.message}`, error])).values()
    )

    // 按时间戳倒序排序并取前N条
    const latestErrors = uniqueErrors
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, count)

    res.json({
      success: true,
      errors: latestErrors,
      total: latestErrors.length
    })
  } catch (error) {
    logger.error('获取最新错误日志失败', { error: error.message })
    res.status(500).json({
      success: false,
      message: '获取最新错误日志失败',
      error: error.message
    })
  }
})

/**
 * 获取指定会话的错误日志
 */
router.get('/errors/session/:sessionId', (req, res) => {
  try {
    const sessionId = req.params.sessionId
    const errorLogPath = path.join(logDir, 'error.log')
    const combinedLogPath = path.join(logDir, 'combined.log')

    // 解析错误日志文件
    const errorLogErrors = parseLogFile(errorLogPath)
    // 解析综合日志文件，提取错误
    const combinedLogErrors = parseLogFile(combinedLogPath)

    // 合并并去重错误
    const allErrors = [...errorLogErrors, ...combinedLogErrors]
    
    // 过滤指定会话的错误
    const sessionErrors = allErrors.filter(error => {
      // 检查sessionId是否在日志条目中
      return error.sessionId === sessionId || 
             (error.meta && error.meta.sessionId === sessionId) ||
             error.message.includes(sessionId)
    })

    // 去重 - 根据时间戳和消息内容
    const uniqueSessionErrors = Array.from(
      new Map(sessionErrors.map(error => [`${error.timestamp}-${error.message}`, error])).values()
    )

    // 按时间戳倒序排序
    uniqueSessionErrors.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

    res.json({
      success: true,
      errors: uniqueSessionErrors,
      total: uniqueSessionErrors.length,
      sessionId
    })
  } catch (error) {
    logger.error('获取会话错误日志失败', { sessionId: req.params.sessionId, error: error.message })
    res.status(500).json({
      success: false,
      message: '获取会话错误日志失败',
      error: error.message
    })
  }
})

/**
 * 清空错误日志
 */
router.delete('/errors/clear', (req, res) => {
  try {
    const errorLogPath = path.join(logDir, 'error.log')
    
    // 清空错误日志文件
    fs.writeFileSync(errorLogPath, '', 'utf8')
    
    logger.info('错误日志已清空')
    res.json({
      success: true,
      message: '错误日志已清空'
    })
  } catch (error) {
    logger.error('清空错误日志失败', { error: error.message })
    res.status(500).json({
      success: false,
      message: '清空错误日志失败',
      error: error.message
    })
  }
})

export default router
