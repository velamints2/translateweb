import fs from 'fs'
import axios from 'axios'
import logger from '../../utils/logger.js'

/**
 * 调用 TextIn OCR 接口识别图片文字
 * API文档: https://www.textin.com/document/recognize-document-3d1-multipage
 * 
 * @param {string} imagePath 本地图片路径
 * @returns {Promise<string>} 识别出的文本
 */
export async function textinOcrRecognize(imagePath) {
  const {
    TEXTIN_APP_ID,
    TEXTIN_SECRET_CODE
  } = process.env

  if (!TEXTIN_APP_ID || !TEXTIN_SECRET_CODE) {
    throw new Error('TextIn OCR 配置缺失，请设置 TEXTIN_APP_ID 与 TEXTIN_SECRET_CODE')
  }

  // TextIn 通用文字识别 API endpoint
  const endpoint = 'https://api.textin.com/ai/service/v2/recognize/multipage'

  // 读取图片二进制数据
  const fileBuffer = fs.readFileSync(imagePath)

  try {
    logger.info('📡 调用 TextIn OCR API...')
    
    const response = await axios.post(
      endpoint,
      fileBuffer,  // 直接发送二进制数据
      {
        headers: {
          'Content-Type': 'application/octet-stream',
          'x-ti-app-id': TEXTIN_APP_ID,
          'x-ti-secret-code': TEXTIN_SECRET_CODE
        },
        timeout: 30000,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      }
    )

    const data = response.data || {}
    
    // 检查响应状态
    if (data.code !== 200) {
      throw new Error(data.message || `TextIn API 错误码: ${data.code}`)
    }

    // 解析结果
    // 响应格式: { result: { pages: [{ lines: [{ text: '...' }] }] } }
    const pages = data.result?.pages || []
    if (pages.length === 0) {
      logger.warn('⚠️ TextIn OCR 未识别到任何文字')
      return ''
    }

    // 提取所有页面的所有行文本
    const extractedLines = []
    for (const page of pages) {
      const lines = page.lines || []
      for (const line of lines) {
        if (line.text) {
          extractedLines.push(line.text)
        }
      }
    }

    const extractedText = extractedLines.join('\n')
    logger.info(`✅ TextIn OCR 识别完成，共 ${pages.length} 页，${extractedLines.length} 行文字`)
    
    return extractedText
  } catch (error) {
    const message = error.response?.data?.message || error.message
    logger.error('❌ TextIn OCR 调用失败:', message)
    throw new Error(`TextIn OCR 调用失败: ${message}`)
  }
}
