/**
 * 翻译Agent MCP工具
 * 功能：
 * 1. 执行专业翻译
 * 2. 应用确认的术语
 * 3. 保持翻译一致性
 */

import { Anthropic } from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY
})

/**
 * 执行翻译
 */
async function translateText(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy) {
  console.log('🌐 开始翻译...')
  
  // 构建翻译提示词
  const prompt = buildTranslationPrompt(
    text,
    languageFrom,
    languageTo,
    confirmedTerms,
    documentInfo,
    translationStrategy
  )
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 16000,
      temperature: 0.2,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const translatedText = response.content[0].text
    console.log('✅ 翻译完成')
    
    return {
      success: true,
      data: {
        translatedText: cleanTranslatedText(translatedText),
        usage: {
          input_tokens: response.usage.input_tokens,
          output_tokens: response.usage.output_tokens
        }
      }
    }
  } catch (error) {
    console.error('❌ 翻译失败:', error.message)
    return {
      success: false,
      error: error.message,
      data: {
        translatedText: '[翻译失败]'
      }
    }
  }
}

/**
 * 构建翻译提示词
 */
function buildTranslationPrompt(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy) {
  // 语言映射
  const languageMap = {
    'ZH': '中文',
    'EN': '英文',
    'EN-US': '美式英文',
    'EN-GB': '英式英文',
    'JP': '日文',
    'KR': '韩文',
    'FR': '法文',
    'DE': '德文',
    'ES': '西班牙文'
  }

  const sourceLang = languageMap[languageFrom] || languageFrom
  const targetLang = languageMap[languageTo] || languageTo

  // 构建术语对照表
  const termsTable = confirmedTerms && confirmedTerms.length > 0
    ? confirmedTerms
        .filter(t => t.confirmed !== false)
        .map(t => `- ${t.original} → ${t.translation}`)
        .join('\n')
    : '（无特定术语要求）'

  // 文档信息描述
  const docInfoText = documentInfo
    ? `
**文档背景信息：**
- 所属领域：${documentInfo.domain || '通用'}
- 文体风格：${documentInfo.style || '通用'}
- 翻译用途：${documentInfo.purpose || '通用翻译'}
`
    : ''

  // 翻译策略
  const strategyText = translationStrategy || '保持专业、准确、流畅的翻译风格'

  return `你是一位专业的翻译专家。请将以下${sourceLang}文本翻译成${targetLang}。

${docInfoText}

**翻译策略：**
${strategyText}

**专业术语对照表（必须严格遵守）：**
${termsTable}

**原文：**
${text}

**翻译要求：**
1. 严格按照术语对照表翻译专业术语，保持术语一致性
2. 保持原文的格式、段落结构
3. 确保译文专业、准确、流畅
4. 如果原文有标题、列表等格式，请保持相同格式
5. 只输出翻译结果，不要添加任何解释或注释

**译文：**`
}

/**
 * 清理翻译文本
 */
function cleanTranslatedText(text) {
  // 移除可能的前导/尾随空白
  let cleaned = text.trim()
  
  // 移除可能的"译文："标记
  cleaned = cleaned.replace(/^译文[：:：]\s*/i, '')
  
  // 移除可能的引号包裹
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
    cleaned = cleaned.slice(1, -1)
  }
  
  return cleaned
}

/**
 * 批量翻译（用于大文本分段翻译）
 */
async function batchTranslate(segments, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy) {
  console.log(`📦 批量翻译 ${segments.length} 个文本段...`)
  
  const results = []
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i]
    console.log(`翻译进度: ${i + 1}/${segments.length}`)
    
    const result = await translateText(
      segment,
      languageFrom,
      languageTo,
      confirmedTerms,
      documentInfo,
      translationStrategy
    )
    
    results.push({
      index: i,
      original: segment,
      translated: result.data.translatedText,
      success: result.success
    })
    
    // 避免频率限制，添加延迟
    if (i < segments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return {
    success: true,
    data: {
      results,
      combinedTranslation: results.map(r => r.translated).join('\n\n')
    }
  }
}

/**
 * 智能分段
 */
function segmentText(text, maxLength = 2000) {
  // 如果文本长度小于最大长度，直接返回
  if (text.length <= maxLength) {
    return [text]
  }
  
  const segments = []
  const paragraphs = text.split('\n\n')
  
  let currentSegment = ''
  
  for (const paragraph of paragraphs) {
    if (currentSegment.length + paragraph.length + 2 <= maxLength) {
      currentSegment += (currentSegment ? '\n\n' : '') + paragraph
    } else {
      if (currentSegment) {
        segments.push(currentSegment)
      }
      
      // 如果单个段落超过最大长度，需要进一步分割
      if (paragraph.length > maxLength) {
        const sentences = paragraph.match(/[^.!?。！？]+[.!?。！？]+/g) || [paragraph]
        let sentenceSegment = ''
        
        for (const sentence of sentences) {
          if (sentenceSegment.length + sentence.length <= maxLength) {
            sentenceSegment += sentence
          } else {
            if (sentenceSegment) {
              segments.push(sentenceSegment)
            }
            sentenceSegment = sentence
          }
        }
        
        if (sentenceSegment) {
          currentSegment = sentenceSegment
        } else {
          currentSegment = ''
        }
      } else {
        currentSegment = paragraph
      }
    }
  }
  
  if (currentSegment) {
    segments.push(currentSegment)
  }
  
  return segments
}

// 导出工具
export default {
  name: 'translate_agent',
  description: '专业翻译Agent，根据确认的术语和翻译策略执行高质量翻译',
  inputSchema: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: '待翻译的文本'
      },
      languageFrom: {
        type: 'string',
        description: '源语言代码（如 ZH, EN）'
      },
      languageTo: {
        type: 'string',
        description: '目标语言代码（如 EN, ZH）'
      },
      confirmedTerms: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            original: { type: 'string' },
            translation: { type: 'string' },
            confirmed: { type: 'boolean' }
          }
        },
        description: '已确认的术语列表'
      },
      documentInfo: {
        type: 'object',
        properties: {
          domain: { type: 'string' },
          style: { type: 'string' },
          purpose: { type: 'string' }
        },
        description: '文档信息'
      },
      translationStrategy: {
        type: 'string',
        description: '翻译策略和建议'
      },
      batchMode: {
        type: 'boolean',
        description: '是否使用批量模式（自动分段翻译长文本）'
      }
    },
    required: ['text', 'languageFrom', 'languageTo']
  },
  handler: async (args) => {
    const {
      text,
      languageFrom,
      languageTo,
      confirmedTerms = [],
      documentInfo = null,
      translationStrategy = '',
      batchMode = false
    } = args
    
    if (!text || text.trim() === '') {
      return { success: false, error: '文本不能为空' }
    }
    
    // 如果是批量模式或文本较长，使用分段翻译
    if (batchMode || text.length > 3000) {
      const segments = segmentText(text, 2000)
      if (segments.length > 1) {
        console.log(`📝 文本较长，分为 ${segments.length} 段进行翻译`)
        return await batchTranslate(
          segments,
          languageFrom,
          languageTo,
          confirmedTerms,
          documentInfo,
          translationStrategy
        )
      }
    }
    
    // 单段翻译
    return await translateText(
      text,
      languageFrom,
      languageTo,
      confirmedTerms,
      documentInfo,
      translationStrategy
    )
  }
}


