/**
 * 预处理翻译文本并生成报告MCP工具
 * 功能：
 * 1. 分析文本内容和结构
 * 2. 提取专有名词
 * 3. 匹配术语库
 * 4. 生成分析报告
 */

import { Anthropic } from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
})

/**
 * 分析文本并生成报告
 */
async function analyzeText(text, languageFrom, languageTo, terminologyDatabase) {
  console.log('📋 开始分析文本...')
  
  // 构建提示词
  const prompt = buildAnalysisPrompt(text, languageFrom, languageTo, terminologyDatabase)
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 8000,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const analysisText = response.content[0].text
    console.log('✅ 文本分析完成')
    
    // 解析分析结果
    const parsedResult = parseAnalysisResult(analysisText, terminologyDatabase)
    
    return {
      success: true,
      data: parsedResult,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens
      }
    }
  } catch (error) {
    console.error('❌ 文本分析失败:', error.message)
    
    // 使用简化的分析
    return {
      success: false,
      error: error.message,
      data: generateSimpleAnalysis(text, terminologyDatabase)
    }
  }
}

/**
 * 构建分析提示词
 */
function buildAnalysisPrompt(text, languageFrom, languageTo, terminologyDatabase) {
  const dbTermsList = terminologyDatabase && terminologyDatabase.length > 0
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
以表格形式列出（如果有）：

| 中文术语 | 当前翻译 | 是否建议沿用 | 备注 |
|---------|---------|-------------|------|
| 术语1 | Translation1 | 是/否 | 说明 |

### 2. 新术语（建议翻译，待确认）
以表格形式列出新识别的术语：

| 中文术语 | 建议翻译 | 是否需要确认 | 备注 |
|---------|---------|-------------|------|
| 术语1 | Translation1 | 是/否 | 说明 |

## 第三部分：确认文案

### 给客户的确认文案
[生成一段专业、友好的确认文案，列出需要确认的术语]

## 第四部分：补充信息

### 🎯 翻译策略建议
- 翻译风格：[建议]
- 句式处理：[建议]
- 技术准确性：[建议]

请严格按照以上格式生成报告。`
}

/**
 * 解析Claude的分析结果
 */
function parseAnalysisResult(analysisText, terminologyDatabase) {
  // 提取文档基本信息
  const documentInfo = {
    domain: extractField(analysisText, '所属领域') || '未识别',
    style: extractField(analysisText, '文体风格') || '未识别',
    purpose: extractField(analysisText, '翻译用途') || '未识别'
  }

  // 提取内容结构
  const contentStructure = extractSection(analysisText, '内容结构概览') || '未提供'

  // 提取确认文案
  const confirmationText = extractSection(analysisText, '给客户的确认文案') || '请确认以上术语翻译'

  // 提取翻译策略
  const translationStrategy = extractSection(analysisText, '翻译策略建议') || '请保持专业准确的翻译风格'

  // 解析术语
  const existingTerms = extractTermsFromTable(analysisText, '数据库中已有翻译')
  const newTerms = extractTermsFromTable(analysisText, '新术语')

  // 合并所有术语
  const allTerms = [...existingTerms, ...newTerms]

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
      fromDatabase: true
    })),
    newTerms: newTerms.map(t => ({
      original: t.original,
      translation: t.translation,
      reason: '新术语建议翻译',
      confirmed: false,
      fromDatabase: false
    })),
    properNouns: allTerms,
    rawAnalysis: analysisText
  }
}

/**
 * 从文本中提取字段
 */
function extractField(text, fieldName) {
  const patterns = [
    new RegExp(`${fieldName}[：:：]\\s*([^\\n]+)`, 'i'),
    new RegExp(`${fieldName}\\s*[：:：]?\\s*([^\\n]+)`, 'i')
  ]
  
  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      return match[1].trim()
    }
  }
  return ''
}

/**
 * 从文本中提取章节
 */
function extractSection(text, sectionName) {
  const pattern = new RegExp(`${sectionName}[^\\n]*\\n([\\s\\S]*?)(?=\\n##|\\n###|$)`, 'i')
  const match = text.match(pattern)
  return match ? match[1].trim() : ''
}

/**
 * 从Markdown表格中提取术语
 */
function extractTermsFromTable(text, tableName) {
  const terms = []
  
  // 查找表格所在的部分
  const sectionPattern = new RegExp(`${tableName}[\\s\\S]*?(?=\\n##|\\n###|$)`, 'i')
  const sectionMatch = text.match(sectionPattern)
  
  if (!sectionMatch) {
    return terms
  }
  
  const section = sectionMatch[0]
  const lines = section.split('\n')
  
  for (const line of lines) {
    // 匹配表格行: | 中文 | English | ... |
    const match = line.match(/\|\s*([\u4e00-\u9fa5]{2,20})\s*\|\s*([A-Za-z][A-Za-z\s]*)\s*\|/)
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
 * 生成简化的分析结果（当AI调用失败时）
 */
function generateSimpleAnalysis(text, terminologyDatabase) {
  // 简单的关键词提取
  const chineseTerms = extractChineseTerms(text)
  
  // 匹配已有术语
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
        fromDatabase: true
      })
    } else {
      newTerms.push({
        original: term,
        translation: `[待翻译: ${term}]`,
        reason: '新术语需要翻译',
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
    contentStructure: '待分析',
    confirmationText: `识别到 ${existingTerms.length} 个已有术语和 ${newTerms.length} 个新术语，请确认。`,
    translationStrategy: '保持专业准确的翻译风格',
    existingTerms,
    newTerms,
    properNouns: [...existingTerms, ...newTerms]
  }
}

/**
 * 提取中文专业术语
 */
function extractChineseTerms(text) {
  // 简单的中文词语提取（2-6个字）
  const pattern = /[\u4e00-\u9fa5]{2,6}/g
  const matches = text.match(pattern) || []
  
  // 去重并过滤常见词
  const commonWords = new Set(['这个', '那个', '可以', '需要', '如果', '因为', '所以', '但是', '而且', '或者'])
  const uniqueTerms = [...new Set(matches)].filter(term => !commonWords.has(term))
  
  return uniqueTerms.slice(0, 20) // 最多返回20个术语
}

// 导出工具
export default {
  name: 'preprocess_text',
  description: '预处理翻译文本并生成分析报告，包括术语提取、领域识别和翻译策略建议',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '待分析的文本'
      },
      languageFrom: {
        type: 'string',
        description: '源语言代码（如 ZH, EN）'
      },
      languageTo: {
        type: 'string',
        description: '目标语言代码（如 EN, ZH）'
      },
      terminologyDatabase: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            original: { type: 'string' },
            translation: { type: 'string' }
          }
        },
        description: '术语数据库'
      }
    },
    required: ['text', 'languageFrom', 'languageTo']
  },
  handler: async (args) => {
    const { text, languageFrom, languageTo, terminologyDatabase = [] } = args
    
    if (!text || text.trim() === '') {
      return { success: false, error: '文本不能为空' }
    }
    
    return await analyzeText(text, languageFrom, languageTo, terminologyDatabase)
  }
}


