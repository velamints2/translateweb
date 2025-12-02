/**
 * 翻译Agent工具 - 使用 OpenAI GPT-5.1
 */

import OpenAI from 'openai'
import logger from '../../utils/logger.js'

let openai = null

function getOpenAIClient() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }
  return openai
}

/**
 * 执行翻译
 */
async function execute(text, languageFrom, languageTo, confirmedTerms = [], documentInfo = null, translationStrategy = '') {
  logger.info('🌐 开始翻译...')
  
  // 检查是否配置了API密钥
  if (!process.env.OPENAI_API_KEY) {
    logger.error('❌ OpenAI API密钥未配置')
    throw new Error('OpenAI API密钥未配置，无法执行翻译')
  }
  
  try {
    // 如果文本较长，使用分段翻译
    if (text.length > 3000) {
      logger.info('📝 文本较长，使用分段翻译')
      return await batchTranslate(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy)
    }
    
    // 单段翻译
    const prompt = buildTranslationPrompt(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy)
    
    const client = getOpenAIClient()
    if (!client) {
      logger.error('❌ OpenAI 客户端初始化失败')
      throw new Error('OpenAI API密钥未配置，无法执行翻译')
    }
    
    logger.info('📡 调用 OpenAI API (gpt-5.1)...')
    const startTime = Date.now()
    
    // 使用 Promise.race 实现超时（长文本翻译优化：10分钟）
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('OpenAI API 超时（超过 600 秒）')), 600000)
    )
    
    const response = await Promise.race([
      client.chat.completions.create({
        model: 'gpt-5.1',
        max_completion_tokens: 16000,
        temperature: 0.2,
        messages: [{
          role: 'user',
          content: prompt
        }]
      }),
      timeoutPromise
    ])
    
    const elapsed = Date.now() - startTime
    logger.info(`✅ OpenAI API 响应成功（${elapsed}ms）`)

    const translatedText = response.choices[0].message.content
    logger.info('✅ 翻译完成')
    
    return {
      translatedText: cleanTranslatedText(translatedText),
      usage: {
        input_tokens: response.usage.prompt_tokens,
        output_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      }
    }
  } catch (error) {
    logger.error('❌ 翻译失败:', error.message)
    
    // 如果是模型不存在错误，尝试降级到 gpt-4o
    if (error.message && error.message.includes('gpt-5.1')) {
      logger.warn('⚠️  gpt-5.1 不可用，尝试降级到 gpt-4o...')
      return await executeWithFallback(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy)
    }
    
    throw error
  }
}

/**
 * 降级方案：使用 gpt-4o
 */
async function executeWithFallback(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy) {
  const prompt = buildTranslationPrompt(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy)
  
  const client = getOpenAIClient()
  if (!client) {
    throw new Error('OpenAI 客户端初始化失败')
  }
  
  logger.info('📡 调用 OpenAI API (gpt-4o 降级方案)...')
  const startTime = Date.now()
  
  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    max_completion_tokens: 16000,
    temperature: 0.2,
    messages: [{
      role: 'user',
      content: prompt
    }]
  })
  
  const elapsed = Date.now() - startTime
  logger.info(`✅ OpenAI API 响应成功（${elapsed}ms，降级方案）`)
  
  const translatedText = response.choices[0].message.content
  logger.info('✅ 翻译完成')
  
  return {
    translatedText: cleanTranslatedText(translatedText),
    usage: {
      input_tokens: response.usage.prompt_tokens,
      output_tokens: response.usage.completion_tokens,
      total_tokens: response.usage.total_tokens
    }
  }
}

/**
 * 构建翻译提示词
 */
function buildTranslationPrompt(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy) {
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

  const termsTable = confirmedTerms && confirmedTerms.length > 0
    ? confirmedTerms
        .filter(t => t.confirmed !== false)
        .map(t => `- ${t.original} → ${t.translation}`)
        .join('\n')
    : '（无特定术语要求）'

  const docInfoText = documentInfo
    ? `
**文档背景信息：**
- 所属领域：${documentInfo.domain || '通用'}
- 文体风格：${documentInfo.style || '通用'}
- 翻译用途：${documentInfo.purpose || '通用翻译'}
`
    : ''

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
  let cleaned = text.trim()
  cleaned = cleaned.replace(/^译文[：:：]\s*/i, '')
  if ((cleaned.startsWith('"') && cleaned.endsWith('"')) ||
      (cleaned.startsWith('"') && cleaned.endsWith('"'))) {
    cleaned = cleaned.slice(1, -1)
  }
  return cleaned
}

/**
 * 批量翻译（分段）
 */
async function batchTranslate(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy) {
  const segments = segmentText(text, 2000)
  logger.info(`📦 分为 ${segments.length} 段进行翻译`)
  
  const translatedSegments = []
  let totalInputTokens = 0
  let totalOutputTokens = 0
  
  for (let i = 0; i < segments.length; i++) {
    logger.info(`翻译进度: ${i + 1}/${segments.length}`)
    
    const prompt = buildTranslationPrompt(segments[i], languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy)
    
    const client = getOpenAIClient()
    if (!client) {
      logger.error('❌ OpenAI 客户端初始化失败')
      throw new Error('OpenAI API密钥未配置')
    }
    
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      max_completion_tokens: 16000,
      temperature: 0.2,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })
    
    const translatedText = cleanTranslatedText(response.choices[0].message.content)
    translatedSegments.push(translatedText)
    
    totalInputTokens += response.usage.prompt_tokens
    totalOutputTokens += response.usage.completion_tokens
    
    // 避免频率限制
    if (i < segments.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  
  return {
    translatedText: translatedSegments.join('\n\n'),
    usage: {
      input_tokens: totalInputTokens,
      output_tokens: totalOutputTokens,
      total_tokens: totalInputTokens + totalOutputTokens
    }
  }
}

/**
 * 智能分段
 */
function segmentText(text, maxLength = 2000) {
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
        
        currentSegment = sentenceSegment
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

export default {
  execute
}


