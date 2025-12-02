/**
 * 翻译评价工具
 * 使用 DeepSeek API 对翻译结果进行严格评分
 */

import axios from 'axios'
import logger from '../../utils/logger.js'

/**
 * 评分维度说明
 * - accuracy: 准确性 (0-25分) - 原文意思是否完整准确传达
 * - fluency: 流畅性 (0-25分) - 译文是否符合目标语言表达习惯
 * - terminology: 术语一致性 (0-25分) - 专业术语翻译是否准确统一
 * - style: 风格适配 (0-25分) - 译文风格是否符合文档类型和目标受众
 */

const EVALUATION_PROMPT = `你是一位资深的翻译质量评估专家，请对以下翻译结果进行**严格、专业**的评分和评价。

## 评分标准（总分100分）

### 1. 准确性 (0-25分)
- 25分: 完美传达原文所有信息，无遗漏、无误译
- 20分: 基本准确，有极少量可忽略的细微偏差
- 15分: 大部分准确，存在少量误译或遗漏
- 10分: 有明显误译或重要信息遗漏
- 5分: 多处严重误译，信息传达不完整
- 0分: 完全误译或与原文无关

### 2. 流畅性 (0-25分)
- 25分: 读起来完全自然，如同母语写作
- 20分: 流畅自然，偶有生硬表达
- 15分: 基本通顺，有明显翻译腔
- 10分: 句子生硬，影响阅读体验
- 5分: 难以理解，语法错误较多
- 0分: 完全不通顺，无法阅读

### 3. 术语一致性 (0-25分)
- 25分: 所有专业术语翻译准确且前后一致
- 20分: 术语基本准确，有极少量不一致
- 15分: 大部分术语正确，存在少量错误
- 10分: 术语翻译有明显问题
- 5分: 术语翻译混乱，前后不一致
- 0分: 术语完全错误

### 4. 风格适配 (0-25分)
- 25分: 完美匹配文档类型和目标受众
- 20分: 风格基本合适，有小瑕疵
- 15分: 风格尚可，但不够专业/正式
- 10分: 风格与文档类型有明显偏差
- 5分: 风格严重不匹配
- 0分: 风格完全不适合

## 待评估内容

**原文 ({{sourceLang}}):**
{{originalText}}

**译文 ({{targetLang}}):**
{{translatedText}}

**术语表（如有提供）:**
{{terminology}}

## 输出格式

请严格按照以下JSON格式输出评估结果（不要添加任何其他内容）：

{
  "scores": {
    "accuracy": <0-25的整数>,
    "fluency": <0-25的整数>,
    "terminology": <0-25的整数>,
    "style": <0-25的整数>,
    "total": <0-100的整数>
  },
  "grade": "<A+/A/B+/B/C+/C/D/F>",
  "summary": "<一句话总体评价>",
  "strengths": ["<优点1>", "<优点2>"],
  "weaknesses": ["<问题1>", "<问题2>"],
  "suggestions": ["<改进建议1>", "<改进建议2>"],
  "detailedFeedback": {
    "accuracy": "<准确性详细评价>",
    "fluency": "<流畅性详细评价>",
    "terminology": "<术语一致性详细评价>",
    "style": "<风格适配详细评价>"
  },
  "revisedTranslation": "<如果评分低于80分，请提供改进后的译文；否则留空>"
}

## 评分等级对照
- A+ (95-100): 卓越，可直接使用
- A (90-94): 优秀，微调后可用
- B+ (85-89): 良好，需少量修改
- B (80-84): 合格，需要修改
- C+ (70-79): 一般，需要较多修改
- C (60-69): 较差，需要大幅修改
- D (50-59): 差，建议重译
- F (<50): 不合格，必须重译

请严格按照标准评分，不要因为"鼓励"而给高分。专业翻译需要严格把关。`

/**
 * 调用 DeepSeek API 评估翻译质量
 * @param {string} originalText 原文
 * @param {string} translatedText 译文
 * @param {string} sourceLang 源语言
 * @param {string} targetLang 目标语言
 * @param {Array} terminology 术语表（可选）
 * @returns {Promise<Object>} 评估结果
 */
export async function evaluateTranslation(originalText, translatedText, sourceLang = 'ZH', targetLang = 'EN', terminology = []) {
  const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY
  
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API 密钥未配置')
  }
  
  // 构建术语表字符串
  let terminologyStr = '无'
  if (terminology && terminology.length > 0) {
    terminologyStr = terminology
      .map(t => `${t.original} → ${t.translation}`)
      .join('\n')
  }
  
  // 填充 prompt 模板
  const prompt = EVALUATION_PROMPT
    .replace('{{sourceLang}}', sourceLang)
    .replace('{{targetLang}}', targetLang)
    .replace('{{originalText}}', originalText)
    .replace('{{translatedText}}', translatedText)
    .replace('{{terminology}}', terminologyStr)
  
  logger.info('📊 调用 DeepSeek API 评估翻译质量...')
  
  try {
    const response = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的翻译质量评估专家，请严格按照评分标准进行评估，输出纯JSON格式。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 300000  // 延长到 5 分钟
      }
    )
    
    const content = response.data.choices?.[0]?.message?.content || ''
    logger.info('✅ DeepSeek 评估完成')
    
    // 尝试解析 JSON
    let evaluation
    try {
      // 尝试直接解析
      evaluation = JSON.parse(content)
    } catch (parseError) {
      // 尝试提取 JSON 块
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        evaluation = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('无法解析评估结果')
      }
    }
    
    // 验证必要字段
    if (!evaluation.scores || typeof evaluation.scores.total !== 'number') {
      throw new Error('评估结果格式不正确')
    }
    
    // 添加元数据
    evaluation.evaluatedAt = new Date().toISOString()
    evaluation.model = 'deepseek-chat'
    
    return evaluation
    
  } catch (error) {
    const message = error.response?.data?.error?.message || error.message
    logger.error('❌ 翻译评估失败:', message)
    throw new Error(`翻译评估失败: ${message}`)
  }
}

/**
 * 快速评分（仅返回总分和等级）
 */
export async function quickEvaluate(originalText, translatedText, sourceLang = 'ZH', targetLang = 'EN') {
  const result = await evaluateTranslation(originalText, translatedText, sourceLang, targetLang)
  return {
    total: result.scores.total,
    grade: result.grade,
    summary: result.summary
  }
}

export default {
  evaluateTranslation,
  quickEvaluate
}
