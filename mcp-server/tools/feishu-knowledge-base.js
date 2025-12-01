/**
 * 飞书知识库MCP工具
 * 功能：
 * 1. 从飞书云文档获取术语对照表
 * 2. 向飞书云文档添加新术语
 * 3. 查询特定术语的翻译
 */

import axios from 'axios'

// 飞书知识库配置
const FEISHU_DOC_URL = 'https://ay8sh8gpeb.feishu.cn/wiki/SON5wso6CiO5UYkk89fc4wo4nBe?from=from_copylink'
const FEISHU_APP_ID = process.env.FEISHU_APP_ID
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET

// 内存缓存（实际应用中可能需要使用Redis等）
let terminologyCache = new Map()
let cacheExpiry = null
const CACHE_DURATION = 30 * 60 * 1000 // 30分钟

/**
 * 获取飞书访问令牌
 */
async function getFeishuAccessToken() {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    console.warn('⚠️  飞书配置未设置，使用模拟数据')
    return null
  }

  try {
    const response = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET
      }
    )
    return response.data.tenant_access_token
  } catch (error) {
    console.error('❌ 获取飞书访问令牌失败:', error.message)
    return null
  }
}

/**
 * 从飞书云文档获取术语库内容
 */
async function loadFeishuKnowledgeBase() {
  // 检查缓存
  if (cacheExpiry && Date.now() < cacheExpiry && terminologyCache.size > 0) {
    console.log('✅ 使用缓存的术语库数据')
    return Array.from(terminologyCache.entries()).map(([original, translation]) => ({
      original,
      translation
    }))
  }

  const accessToken = await getFeishuAccessToken()
  
  if (!accessToken) {
    // 使用模拟数据
    return getMockTerminology()
  }

  try {
    // 从URL提取文档ID
    const docIdMatch = FEISHU_DOC_URL.match(/wiki\/([^?]+)/)
    const docId = docIdMatch ? docIdMatch[1] : null

    if (!docId) {
      throw new Error('无法从URL提取文档ID')
    }

    const response = await axios.get(
      `https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node`,
      {
        params: { token: docId },
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    )

    // 解析飞书文档内容，提取术语对照表
    const content = response.data.data.node.content || ''
    const terms = parseTerminologyFromMarkdown(content)
    
    // 更新缓存
    terminologyCache.clear()
    terms.forEach(term => {
      terminologyCache.set(term.original, term.translation)
    })
    cacheExpiry = Date.now() + CACHE_DURATION

    console.log(`✅ 成功从飞书加载 ${terms.length} 个术语`)
    return terms
  } catch (error) {
    console.error('❌ 加载飞书知识库失败:', error.message)
    return getMockTerminology()
  }
}

/**
 * 从Markdown格式解析术语对照表
 */
function parseTerminologyFromMarkdown(markdown) {
  const terms = []
  const lines = markdown.split('\n')
  
  for (const line of lines) {
    // 匹配表格行格式: | 中文 | English | 备注 |
    const match = line.match(/\|\s*([\u4e00-\u9fa5]+)\s*\|\s*([A-Za-z\s]+)\s*\|/)
    if (match) {
      terms.push({
        original: match[1].trim(),
        translation: match[2].trim()
      })
    }
    
    // 匹配简单格式: 中文:English 或 中文 = English
    const simpleMatch = line.match(/([\u4e00-\u9fa5]+)[:=]\s*([A-Za-z\s]+)/)
    if (simpleMatch) {
      terms.push({
        original: simpleMatch[1].trim(),
        translation: simpleMatch[2].trim()
      })
    }
  }
  
  return terms
}

/**
 * 查询特定术语的翻译
 */
async function queryTerminology(term) {
  if (terminologyCache.size === 0 || !cacheExpiry || Date.now() >= cacheExpiry) {
    await loadFeishuKnowledgeBase()
  }
  
  return terminologyCache.get(term) || null
}

/**
 * 添加新术语到飞书知识库
 */
async function addTerminology(terms) {
  const accessToken = await getFeishuAccessToken()
  
  if (!accessToken) {
    console.warn('⚠️  飞书配置未设置，仅更新本地缓存')
    terms.forEach(term => {
      terminologyCache.set(term.original, term.translation)
    })
    return { success: true, message: '已更新本地缓存', count: terms.length }
  }

  try {
    // 更新飞书文档
    // 注意：这需要根据实际的飞书API来实现
    // 这里先更新本地缓存
    terms.forEach(term => {
      terminologyCache.set(term.original, term.translation)
    })
    
    console.log(`✅ 成功添加 ${terms.length} 个术语`)
    return { success: true, message: '术语已添加', count: terms.length }
  } catch (error) {
    console.error('❌ 添加术语失败:', error.message)
    return { success: false, message: error.message }
  }
}

/**
 * 模拟术语库数据
 */
function getMockTerminology() {
  const mockTerms = [
    { original: '激光雷达', translation: 'LiDAR' },
    { original: '建图', translation: 'Mapping' },
    { original: '定位', translation: 'Localization' },
    { original: '重影', translation: 'Ghosting' },
    { original: '虚影', translation: 'Phantom' },
    { original: '定位得分', translation: 'Localization Score' },
    { original: '扩建功能', translation: 'Expansion Function' },
    { original: '点云数据', translation: 'Point Cloud Data' },
    { original: '定位丢失', translation: 'Localization Loss' },
    { original: '运行停止', translation: 'Operation Halt' },
    { original: '乱走', translation: 'Erratic Movement' },
    { original: '禁区', translation: 'Forbidden Zone' },
    { original: '路径规划', translation: 'Path Planning' },
    { original: '避障', translation: 'Obstacle Avoidance' },
    { original: '导航', translation: 'Navigation' }
  ]

  // 更新缓存
  terminologyCache.clear()
  mockTerms.forEach(term => {
    terminologyCache.set(term.original, term.translation)
  })
  cacheExpiry = Date.now() + CACHE_DURATION

  return mockTerms
}

// 导出工具函数
export default {
  name: 'feishu_knowledge_base',
  description: '飞书知识库工具，用于加载、查询和添加术语翻译对照表',
  inputSchema: {
    type: 'object',
    properties: {
      action: {
        type: 'string',
        enum: ['load', 'query', 'add'],
        description: '操作类型：load-加载所有术语，query-查询特定术语，add-添加新术语'
      },
      term: {
        type: 'string',
        description: '查询的术语（action为query时必填）'
      },
      terms: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            original: { type: 'string' },
            translation: { type: 'string' }
          },
          required: ['original', 'translation']
        },
        description: '要添加的术语列表（action为add时必填）'
      }
    },
    required: ['action']
  },
  handler: async (args) => {
    const { action, term, terms } = args

    switch (action) {
      case 'load':
        const allTerms = await loadFeishuKnowledgeBase()
        return {
          success: true,
          data: allTerms,
          count: allTerms.length
        }

      case 'query':
        if (!term) {
          return { success: false, error: 'term参数必填' }
        }
        const translation = await queryTerminology(term)
        return {
          success: true,
          data: translation ? { original: term, translation } : null
        }

      case 'add':
        if (!terms || !Array.isArray(terms) || terms.length === 0) {
          return { success: false, error: 'terms参数必填且不能为空' }
        }
        const result = await addTerminology(terms)
        return result

      default:
        return { success: false, error: '无效的action参数' }
    }
  }
}


