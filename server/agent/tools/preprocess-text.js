/**
 * 预处理翻译文本工具 - 仅使用 DeepSeek API
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
    logger.info('✅ DeepSeek 客户端初始化成功')
  }
  return deepseek
}

/**
 * 分析文本 - 使用 DeepSeek API
 */
async function analyze(text, languageFrom, languageTo, terminologyDatabase = []) {
  logger.info('📋 开始分析文本...')
  
  // 检查 DeepSeek 配置
  if (!process.env.DEEPSEEK_API_KEY) {
    logger.error('❌ DeepSeek API 未配置')
    throw new Error('DeepSeek API 未配置，请在 .env 文件中设置 DEEPSEEK_API_KEY')
  }
  
  const client = getDeepseekClient()
  if (!client) {
    throw new Error('DeepSeek 客户端初始化失败')
  }

  // 预先筛选文档中出现的术语，避免将整个数据库传给 LLM
  // 这样可以解决两个问题：
  // 1. 避免 Prompt 过长超过 Token 限制
  // 2. 确保数据库中存在的术语一定会被识别（解决 LLM 注意力丢失导致漏检的问题）
  const relevantTerms = terminologyDatabase.filter(term => 
    term.original && text.includes(term.original)
  );
  
  logger.info(`🔍 预筛选发现 ${relevantTerms.length} 个已知术语 (总库大小: ${terminologyDatabase.length})`)

  // 构建术语库字符串 (只包含相关的)
  const dbTermsList = relevantTerms.length > 0
    ? relevantTerms.map(t => `"${t.original}": "${t.translation}"`).join(', ')
    : '无'

  // 使用更简洁的提示词，要求返回 JSON
  const prompt = `你是专业翻译预处理专家。分析以下文本，识别需要翻译的专有名词/术语。

【待翻译文本】
${text}

【翻译方向】${languageFrom} → ${languageTo}

【现有术语库】
${dbTermsList}

【任务】
1. 识别文本中的专有名词和技术术语（如：地图质量、定位丢失、重影等完整词汇）
2. 对于术语库中已有的术语，标记为 existingTerms
3. 对于新术语，提供建议翻译，标记为 newTerms
4. 注意：术语应该是完整的词汇单位，不要拆分（如"地图质量确认"是一个术语，不要拆成"地图"、"质量"、"确认"）

【返回格式】严格按以下 JSON 格式返回，不要添加任何其他内容：
{
  "documentInfo": {
    "domain": "文档所属领域",
    "style": "文档风格",
    "purpose": "翻译用途"
  },
  "existingTerms": [
    {"original": "中文术语", "translation": "已有翻译"}
  ],
  "newTerms": [
    {"original": "中文术语", "translation": "建议翻译"}
  ],
  "translationStrategy": "翻译策略建议"
}`

  logger.info('📊 DeepSeek 分析中...')
  
  try {
    const response = await Promise.race([
      client.chat.completions.create({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是专业的翻译预处理专家。只返回 JSON 格式的分析结果，不要添加任何解释文字。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('DeepSeek API 超时（150秒）')), 150000)
      )
    ])

    const responseText = response.choices[0].message.content
    logger.info('✅ DeepSeek 响应完成')
    logger.info('📝 原始响应: ' + responseText.substring(0, 200) + '...')
    
    // 解析 JSON 响应
    let result
    try {
      // 尝试提取 JSON（处理可能的 markdown 代码块）
      let jsonStr = responseText
      const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (jsonMatch) {
        jsonStr = jsonMatch[1]
      }
      // 清理可能的前后空白和非 JSON 字符
      jsonStr = jsonStr.trim()
      if (!jsonStr.startsWith('{')) {
        const startIndex = jsonStr.indexOf('{')
        if (startIndex !== -1) {
          jsonStr = jsonStr.substring(startIndex)
        }
      }
      if (!jsonStr.endsWith('}')) {
        const endIndex = jsonStr.lastIndexOf('}')
        if (endIndex !== -1) {
          jsonStr = jsonStr.substring(0, endIndex + 1)
        }
      }
      
      result = JSON.parse(jsonStr)
    } catch (parseError) {
      logger.error('❌ JSON 解析失败:', parseError.message)
      logger.error('原始响应:', responseText)
      
      // 降级处理：如果解析失败，返回基础结构，不阻断流程
      logger.warn('⚠️ DeepSeek 响应解析失败，启用降级处理，返回空术语列表')
      return {
        documentInfo: { domain: '未知', style: '未知', purpose: '未知' },
        contentStructure: `文档包含约 ${text.length} 个字符`,
        confirmationText: '自动分析失败，请直接开始翻译',
        translationStrategy: '通用翻译',
        existingTerms: [],
        newTerms: [],
        properNouns: [],
        analysisMode: 'deepseek_fallback',
        analysisModel: 'deepseek-chat',
        analysisTimestamp: new Date().toISOString()
      }
    }
    
    // 标准化返回格式
    // 强制合并本地匹配的术语，确保不漏掉数据库中已有的词
    const finalExistingTerms = relevantTerms.map(t => ({
      original: t.original,
      translation: t.translation,
      suggestion: '建议沿用',
      remark: '数据库中已有翻译',
      fromDatabase: true,
      confirmed: false
    }));

    // 过滤 LLM 返回的新术语，避免重复
    const finalNewTerms = (result.newTerms || []).filter(nt => 
      !relevantTerms.some(rt => rt.original === nt.original)
    ).map(t => ({
      original: t.original,
      translation: t.translation,
      reason: 'DeepSeek 建议翻译',
      confirmed: false,
      fromDatabase: false
    }));

    return {
      documentInfo: result.documentInfo || { domain: '未识别', style: '未识别', purpose: '未识别' },
      contentStructure: `文档包含约 ${text.length} 个字符`,
      confirmationText: '请确认以下术语的翻译',
      translationStrategy: result.translationStrategy || '保持专业、准确的翻译风格',
      existingTerms: finalExistingTerms,
      newTerms: finalNewTerms,
      properNouns: [
        ...finalExistingTerms,
        ...finalNewTerms
      ],
      analysisMode: 'deepseek',
      analysisModel: 'deepseek-chat',
      analysisTimestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('❌ DeepSeek 分析失败:', error.message)
    throw error
  }
}

export default {
  analyze
}


