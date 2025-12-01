/**
 * PDF 排版翻译工具
 * 使用 TextIn xParse 解析 PDF，翻译后保持原排版输出新 PDF
 */

import fs from 'fs'
import path from 'path'
import axios from 'axios'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import logger from '../../utils/logger.js'

/**
 * 调用 TextIn xParse API 解析 PDF
 * @param {Buffer} pdfBuffer PDF 文件二进制数据
 * @returns {Promise<Object>} 解析结果
 */
async function parsePdfWithTextin(pdfBuffer) {
  const { TEXTIN_APP_ID, TEXTIN_SECRET_CODE } = process.env

  if (!TEXTIN_APP_ID || !TEXTIN_SECRET_CODE) {
    throw new Error('TextIn 配置缺失，请设置 TEXTIN_APP_ID 与 TEXTIN_SECRET_CODE')
  }

  const endpoint = 'https://api.textin.com/ai/service/v1/pdf_to_markdown'
  
  // 设置解析参数
  const params = new URLSearchParams({
    dpi: '144',
    markdown_details: '1',
    page_details: '1',
    parse_mode: 'auto',
    table_flavor: 'html'
  })

  logger.info('📡 调用 TextIn xParse 解析 PDF...')

  const response = await axios.post(
    `${endpoint}?${params.toString()}`,
    pdfBuffer,
    {
      headers: {
        'Content-Type': 'application/octet-stream',
        'x-ti-app-id': TEXTIN_APP_ID,
        'x-ti-secret-code': TEXTIN_SECRET_CODE
      },
      timeout: 120000,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    }
  )

  if (response.data.code !== 200) {
    throw new Error(response.data.message || `TextIn API 错误: ${response.data.code}`)
  }

  logger.info(`✅ PDF 解析完成，共 ${response.data.result?.total_page_number || 0} 页`)
  return response.data.result
}

/**
 * 翻译文本（使用现有的翻译 Agent）
 * @param {string} text 原文
 * @param {string} targetLang 目标语言
 * @returns {Promise<string>} 译文
 */
async function translateText(text, targetLang = 'EN') {
  if (!text || text.trim().length === 0) {
    return text
  }

  // 动态导入翻译 Agent
  const translationAgent = (await import('../index.js')).default
  
  try {
    const result = await translationAgent.translate(text, 'ZH', targetLang)
    return result.translatedText || text
  } catch (error) {
    logger.warn(`⚠️ 翻译失败: ${error.message}，使用原文`)
    return text
  }
}

/**
 * 批量翻译文本块（带缓存，避免重复翻译）
 * @param {Array} textBlocks 文本块数组
 * @param {string} targetLang 目标语言
 * @returns {Promise<Map>} 原文到译文的映射
 */
async function batchTranslate(textBlocks, targetLang = 'EN') {
  const translations = new Map()
  const uniqueTexts = [...new Set(textBlocks.map(b => b.text).filter(t => t && t.trim()))]
  
  logger.info(`📝 开始翻译 ${uniqueTexts.length} 个文本块...`)
  
  // 为了节省 API 调用，将短文本合并翻译
  const BATCH_SIZE = 5
  for (let i = 0; i < uniqueTexts.length; i += BATCH_SIZE) {
    const batch = uniqueTexts.slice(i, i + BATCH_SIZE)
    
    // 逐个翻译（可以优化为批量）
    for (const text of batch) {
      if (!translations.has(text)) {
        const translated = await translateText(text, targetLang)
        translations.set(text, translated)
      }
    }
    
    logger.info(`📊 翻译进度: ${Math.min(i + BATCH_SIZE, uniqueTexts.length)}/${uniqueTexts.length}`)
  }
  
  return translations
}

/**
 * 加载中文字体（用于 PDF 输出）
 * @param {PDFDocument} pdfDoc PDF 文档对象
 * @returns {Promise<PDFFont>} 字体对象
 */
async function loadFont(pdfDoc) {
  // 注册 fontkit
  pdfDoc.registerFontkit(fontkit)
  
  // 尝试加载系统中文字体
  const fontPaths = [
    '/System/Library/Fonts/STHeiti Light.ttc',
    '/System/Library/Fonts/PingFang.ttc',
    '/Library/Fonts/Arial Unicode.ttf',
    '/System/Library/Fonts/Supplemental/Arial Unicode.ttf'
  ]
  
  for (const fontPath of fontPaths) {
    try {
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath)
        const font = await pdfDoc.embedFont(fontBytes, { subset: true })
        logger.info(`✅ 加载字体: ${fontPath}`)
        return font
      }
    } catch (error) {
      // 继续尝试下一个字体
    }
  }
  
  // 回退到标准字体（不支持中文）
  logger.warn('⚠️ 未找到中文字体，使用标准字体（中文可能显示异常）')
  return await pdfDoc.embedFont(StandardFonts.Helvetica)
}

/**
 * 生成翻译后的 PDF（覆盖式）
 * 在原 PDF 基础上用白色矩形覆盖原文，然后写入译文
 * @param {Buffer} originalPdfBuffer 原 PDF 二进制数据
 * @param {Object} parseResult TextIn 解析结果
 * @param {Map} translations 翻译映射
 * @returns {Promise<Buffer>} 新 PDF 二进制数据
 */
async function generateTranslatedPdf(originalPdfBuffer, parseResult, translations) {
  logger.info('📄 开始生成翻译后的 PDF...')
  
  // 加载原 PDF
  const pdfDoc = await PDFDocument.load(originalPdfBuffer)
  const font = await loadFont(pdfDoc)
  const pages = pdfDoc.getPages()
  
  const dpi = 144 // TextIn 默认 DPI
  const scale = 72 / dpi // PDF 标准 72 DPI
  
  for (const pageData of parseResult.pages || []) {
    const pageIndex = (pageData.page_id || 1) - 1
    if (pageIndex >= pages.length) continue
    
    const page = pages[pageIndex]
    const { width: pageWidth, height: pageHeight } = page.getSize()
    
    // 处理每个结构化内容
    for (const item of pageData.structured || []) {
      if (!item.text || !item.pos || item.pos.length < 8) continue
      
      const originalText = item.text
      const translatedText = translations.get(originalText) || originalText
      
      if (translatedText === originalText) continue // 跳过未翻译的
      
      // 解析位置坐标 (左上、右上、右下、左下)
      const [x1, y1, x2, y2, x3, y3, x4, y4] = item.pos
      
      // 转换坐标（TextIn 坐标原点在左上，PDF 在左下）
      const minX = Math.min(x1, x4) * scale
      const maxX = Math.max(x2, x3) * scale
      const minY = Math.min(y1, y2) * scale
      const maxY = Math.max(y3, y4) * scale
      
      const boxWidth = maxX - minX
      const boxHeight = maxY - minY
      const pdfY = pageHeight - maxY // 转换 Y 坐标
      
      // 1. 用白色矩形覆盖原文
      page.drawRectangle({
        x: minX - 2,
        y: pdfY - 2,
        width: boxWidth + 4,
        height: boxHeight + 4,
        color: rgb(1, 1, 1) // 白色
      })
      
      // 2. 计算合适的字体大小
      let fontSize = Math.min(boxHeight * 0.8, 14)
      fontSize = Math.max(fontSize, 8)
      
      // 3. 写入译文
      try {
        page.drawText(translatedText, {
          x: minX,
          y: pdfY + (boxHeight - fontSize) / 2,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
          maxWidth: boxWidth
        })
      } catch (drawError) {
        logger.warn(`⚠️ 绘制文本失败: ${drawError.message}`)
      }
    }
  }
  
  const pdfBytes = await pdfDoc.save()
  logger.info('✅ 翻译后的 PDF 生成完成')
  return Buffer.from(pdfBytes)
}

/**
 * 生成双语对照 PDF（新建 PDF，左右或上下对照）
 * @param {Object} parseResult TextIn 解析结果
 * @param {Map} translations 翻译映射
 * @returns {Promise<Buffer>} 新 PDF 二进制数据
 */
async function generateBilingualPdf(parseResult, translations) {
  logger.info('📄 开始生成双语对照 PDF...')
  
  const pdfDoc = await PDFDocument.create()
  const font = await loadFont(pdfDoc)
  
  const pageWidth = 595 // A4 宽度
  const pageHeight = 842 // A4 高度
  const margin = 50
  const lineHeight = 16
  const fontSize = 11
  
  let currentPage = pdfDoc.addPage([pageWidth, pageHeight])
  let yPosition = pageHeight - margin
  
  // 遍历所有页面的结构化内容
  for (const pageData of parseResult.pages || []) {
    for (const item of pageData.structured || []) {
      if (!item.text) continue
      
      const originalText = item.text
      const translatedText = translations.get(originalText) || originalText
      
      // 检查是否需要新页
      if (yPosition < margin + lineHeight * 3) {
        currentPage = pdfDoc.addPage([pageWidth, pageHeight])
        yPosition = pageHeight - margin
      }
      
      // 绘制原文（蓝色）
      try {
        currentPage.drawText(`原: ${originalText.substring(0, 80)}${originalText.length > 80 ? '...' : ''}`, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0.7),
          maxWidth: pageWidth - margin * 2
        })
        yPosition -= lineHeight
        
        // 绘制译文（黑色）
        currentPage.drawText(`译: ${translatedText.substring(0, 80)}${translatedText.length > 80 ? '...' : ''}`, {
          x: margin,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0),
          maxWidth: pageWidth - margin * 2
        })
        yPosition -= lineHeight * 1.5
      } catch (drawError) {
        logger.warn(`⚠️ 绘制失败: ${drawError.message}`)
        yPosition -= lineHeight * 2.5
      }
    }
  }
  
  const pdfBytes = await pdfDoc.save()
  logger.info('✅ 双语对照 PDF 生成完成')
  return Buffer.from(pdfBytes)
}

/**
 * 主函数：翻译 PDF 并保持排版
 * @param {string} pdfPath PDF 文件路径
 * @param {string} targetLang 目标语言 (EN, JA, etc.)
 * @param {string} outputMode 输出模式: 'overlay'(覆盖原文) | 'bilingual'(双语对照)
 * @returns {Promise<{buffer: Buffer, pageCount: number, textBlockCount: number}>}
 */
export async function translatePdf(pdfPath, targetLang = 'EN', outputMode = 'overlay') {
  logger.info(`📄 开始处理 PDF: ${pdfPath}`)
  logger.info(`🎯 目标语言: ${targetLang}, 输出模式: ${outputMode}`)
  
  // 1. 读取 PDF
  const pdfBuffer = fs.readFileSync(pdfPath)
  
  // 2. 解析 PDF
  const parseResult = await parsePdfWithTextin(pdfBuffer)
  
  // 3. 提取所有文本块
  const textBlocks = []
  for (const page of parseResult.pages || []) {
    for (const item of page.structured || []) {
      if (item.text && item.pos) {
        textBlocks.push({
          text: item.text,
          pos: item.pos,
          pageId: page.page_id
        })
      }
    }
  }
  
  logger.info(`📊 共提取 ${textBlocks.length} 个文本块`)
  
  // 4. 批量翻译
  const translations = await batchTranslate(textBlocks, targetLang)
  
  // 5. 生成翻译后的 PDF
  let resultBuffer
  if (outputMode === 'bilingual') {
    resultBuffer = await generateBilingualPdf(parseResult, translations)
  } else {
    resultBuffer = await generateTranslatedPdf(pdfBuffer, parseResult, translations)
  }
  
  return {
    buffer: resultBuffer,
    pageCount: parseResult.total_page_number || 0,
    textBlockCount: textBlocks.length,
    translatedCount: translations.size
  }
}

export default {
  translatePdf,
  parsePdfWithTextin
}
