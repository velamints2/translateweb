/**
 * 预处理翻译文本工具
 */

import OpenAI from 'openai'
import logger from '../../utils/logger.js'

let deepseek = null

function getDeepseekClient() {
  if (!deepseek && process.env.DEEPSEEK_API_KEY) {
    deepseek = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: 'https://api.deepseek.com/v1'
    })
  }
  return deepseek
}

/**
 * 分析文本
 */
async function analyze(text, languageFrom, languageTo, terminologyDatabase = []) {
  logger.info('📋 开始分析文本...')
  
  // 尝试使用 DeepSeek 生成详细报告
  try {
    if (process.env.DEEPSEEK_API_KEY) {
      logger.info('📡 调用 DeepSeek API 生成翻译预处理报告...')
      return await analyzeWithDeepSeek(text, languageFrom, languageTo, terminologyDatabase)
    }
  } catch (error) {
    logger.warn('⚠️  DeepSeek API 调用失败，降级到本地分析:', error.message)
  }
  
  // 降级方案：使用本地简化分析
  logger.info('📊 使用本地分析模式（无需调用外部 API）')
  return generateSimpleAnalysis(text, terminologyDatabase, languageFrom, languageTo)
}

/**
 * 使用 DeepSeek 生成翻译预处理报告
 */
async function analyzeWithDeepSeek(text, languageFrom, languageTo, terminologyDatabase) {
  try {
    const client = getDeepseekClient()
    if (!client) {
      throw new Error('DeepSeek 客户端未初始化')
    }

    const prompt = buildAnalysisPrompt(text, languageFrom, languageTo, terminologyDatabase)
    
    logger.info('📊 DeepSeek 分析中...')
    
    // 调用 DeepSeek API（使用超时保护）
    const response = await Promise.race([
      client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的翻译预处理专家，能够生成详细、结构化的翻译分析报告。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DeepSeek API 超时')), 30000)
      )
    ])

    const analysisText = response.choices[0].message.content
    logger.info('✅ DeepSeek 分析完成')
    
    // 解析 DeepSeek 的响应结果
    const result = parseAnalysisResult(analysisText, terminologyDatabase)
    
    return {
      ...result,
      analysisModel: 'deepseek-chat',
      analysisTimestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('❌ DeepSeek 分析失败:', error.message)
    throw error
  }
}

/**
 * 构建分析提示词
 */
function buildAnalysisPrompt(text, languageFrom, languageTo, terminologyDatabase) {
  const dbTermsList = terminologyDatabase.length > 0
    ? terminologyDatabase.map(t => `${t.original} → ${t.translation}`).join('\n')
    : '（术语库为空）'

  return `你是一个专业的翻译预处理专家。请分析以下待翻译文本，并生成详细的分析报告。

**待翻译文本：**
${text}

**翻译方向：**
源语言：${languageFrom}
目标语言：${languageTo}

**现有术语库：**
${dbTermsList}

**任务要求：**
请按以下格式生成分析报告：

## 第一部分：文档分析与翻译建议

### 📋 文档基本信息
- 所属领域：[识别文档所属的专业领域]
- 文体风格：[技术文档/营销文案/法律文件等]
- 翻译用途：[识别翻译的目的和用途]

### 🏗️ 内容结构概览
[简要描述文档的结构和主要内容]

## 第二部分：术语分类整理

### 1. 数据库中已有翻译（待确认）
| 中文术语 | 当前翻译 | 是否建议沿用 | 备注 |
|---------|---------|-------------|------|

### 2. 新术语（建议翻译，待确认）
| 中文术语 | 建议翻译 | 是否需要确认 | 备注 |
|---------|---------|-------------|------|

## 第三部分：确认文案
[生成一段专业、友好的确认文案]

## 第四部分：补充信息

### 🎯 翻译策略建议
- 翻译风格：[建议]
- 句式处理：[建议]
- 技术准确性：[建议]`
}

/**
 * 解析分析结果
 */
function parseAnalysisResult(analysisText, terminologyDatabase) {
  const documentInfo = {
    domain: extractField(analysisText, '所属领域') || '未识别',
    style: extractField(analysisText, '文体风格') || '未识别',
    purpose: extractField(analysisText, '翻译用途') || '未识别'
  }

  const contentStructure = extractSection(analysisText, '内容结构概览') || '未提供'
  const confirmationText = extractSection(analysisText, '第三部分') || '请确认以上术语翻译'
  const translationStrategy = extractSection(analysisText, '翻译策略建议') || '请保持专业准确的翻译风格'

  const existingTerms = extractTermsFromTable(analysisText, '数据库中已有翻译')
  const newTerms = extractTermsFromTable(analysisText, '新术语')

  return {
    documentInfo,
    contentStructure,
    confirmationText,
    translationStrategy,
    existingTerms: existingTerms.map(t => ({
      original: t.original,
      translation: t.translation,
      suggestion: '建议沿用',
      remark: '数据库中已有翻译',
      fromDatabase: true,
      confirmed: false
    })),
    newTerms: newTerms.map(t => ({
      original: t.original,
      translation: t.translation,
      reason: '新术语建议翻译',
      confirmed: false,
      fromDatabase: false
    })),
    properNouns: [...existingTerms.map(t => ({ ...t, fromDatabase: true })), 
                  ...newTerms.map(t => ({ ...t, fromDatabase: false }))],
    rawAnalysis: analysisText
  }
}

function extractField(text, fieldName) {
  const pattern = new RegExp(`${fieldName}[：:：]\\s*([^\\n]+)`, 'i')
  const match = text.match(pattern)
  return match ? match[1].trim() : ''
}

function extractSection(text, sectionName) {
  const pattern = new RegExp(`${sectionName}[^\\n]*\\n([\\s\\S]*?)(?=\\n##|\\n###|$)`, 'i')
  const match = text.match(pattern)
  return match ? match[1].trim() : ''
}

function extractTermsFromTable(text, tableName) {
  const terms = []
  const sectionPattern = new RegExp(`${tableName}[\\s\\S]*?(?=\\n##|\\n###|$)`, 'i')
  const sectionMatch = text.match(sectionPattern)
  
  if (!sectionMatch) return terms
  
  const section = sectionMatch[0]
  const lines = section.split('\n')
  
  for (const line of lines) {
    // 支持英文和日文翻译
    // 日文字符：平假名 \u3040-\u309F, 片假名 \u30A0-\u30FF, 日文标点 ・ー
    const match = line.match(/\|\s*([\u4e00-\u9fa5]{1,20})\s*\|\s*([A-Za-z\u3040-\u309F\u30A0-\u30FF][A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\s・ー\-]*)\s*\|/)
    if (match) {
      terms.push({
        original: match[1].trim(),
        translation: match[2].trim()
      })
    }
  }
  
  return terms
}

/**
 * 生成简化的分析结果
 */
function generateSimpleAnalysis(text, terminologyDatabase, languageFrom, languageTo) {
  logger.info('使用简化分析模式')
  
  const chineseTerms = extractChineseTerms(text)
  const existingTerms = []
  const newTerms = []
  
  chineseTerms.forEach(term => {
    const existing = terminologyDatabase.find(t => t.original === term)
    if (existing) {
      existingTerms.push({
        original: term,
        translation: existing.translation,
        suggestion: '建议沿用',
        remark: '数据库中已有翻译',
        fromDatabase: true,
        confirmed: false
      })
    } else {
      newTerms.push({
        original: term,
        translation: `[待翻译]`,
        reason: '新术语需要确认',
        confirmed: false,
        fromDatabase: false
      })
    }
  })

  return {
    documentInfo: {
      domain: '技术文档',
      style: '技术说明',
      purpose: '专业翻译'
    },
    contentStructure: `文档包含约 ${text.length} 个字符，识别到 ${chineseTerms.length} 个潜在术语`,
    confirmationText: `系统识别到 ${existingTerms.length} 个已有术语和 ${newTerms.length} 个新术语，请确认这些术语的翻译。`,
    translationStrategy: `翻译方向：${languageFrom} → ${languageTo}\n保持专业、准确、流畅的翻译风格，确保术语一致性。`,
    existingTerms,
    newTerms,
    properNouns: [...existingTerms, ...newTerms]
  }
}

function extractChineseTerms(text) {
  const pattern = /[\u4e00-\u9fa5]{2,8}/g
  const matches = text.match(pattern) || []
  const commonWords = new Set(['这个', '那个', '可以', '需要', '如果', '因为', '所以', '但是', '而且', '或者', '进行', '使用', '操作', '功能'])
  const uniqueTerms = [...new Set(matches)].filter(term => !commonWords.has(term))
  return uniqueTerms.slice(0, 15)
}

export default {
  analyze
}


