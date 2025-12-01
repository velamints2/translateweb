/**
 * 飞书知识库工具
 */

import axios from 'axios'
import logger from '../../utils/logger.js'

// 飞书配置
const FEISHU_APP_ID = process.env.FEISHU_APP_ID
const FEISHU_APP_SECRET = process.env.FEISHU_APP_SECRET

// 飞书知识库页面配置（wiki 类型）
// URL格式: https://xxx.feishu.cn/wiki/{node_token}
const FEISHU_WIKI_NODES = {
  zh_to_en: 'SON5wso6CiO5UYkk89fc4wo4nBe', // 中-英知识库页面
  zh_to_ja: 'OFHOwWU2DiSpeokTComc83Wwn0d'  // 中-日知识库页面
}

// 内存缓存
let terminologyCache = new Map()
let cacheExpiry = null
const CACHE_DURATION = 30 * 60 * 1000 // 30分钟

/**
 * 获取飞书访问令牌
 */
async function getFeishuAccessToken() {
  if (!FEISHU_APP_ID || !FEISHU_APP_SECRET) {
    logger.warn('⚠️  飞书 App ID 或 Secret 未配置')
    return null
  }

  try {
    logger.info('🔑 获取飞书访问令牌...')
    const response = await axios.post(
      'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal',
      {
        app_id: FEISHU_APP_ID,
        app_secret: FEISHU_APP_SECRET
      },
      {
        timeout: 10000
      }
    )
    
    if (!response.data.tenant_access_token) {
      logger.error('❌ 飞书响应中没有访问令牌')
      return null
    }
    
    logger.info('✅ 成功获取飞书访问令牌')
    return response.data.tenant_access_token
  } catch (error) {
    logger.error('❌ 获取飞书访问令牌失败:', error.response?.data || error.message)
    return null
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
    { original: '导航', translation: 'Navigation' },
    { original: '地图', translation: 'Map' },
    { original: '机器人', translation: 'Robot' },
    { original: '扫地机', translation: 'Cleaning Robot' },
    { original: '充电桩', translation: 'Charging Dock' }
  ]

  // 更新缓存
  terminologyCache.clear()
  mockTerms.forEach(term => {
    terminologyCache.set(term.original, term.translation)
  })
  cacheExpiry = Date.now() + CACHE_DURATION

  return mockTerms
}

/**
 * 从飞书知识库页面提取术语 - 使用 Wiki API
 * 参考: https://open.feishu.cn/document/server-docs/docs/wiki-v2/space-node/get_node
 */
async function extractTermsFromFeishuWiki(nodeToken, accessToken) {
  try {
    logger.info(`📚 从飞书知识库提取术语: ${nodeToken}`)
    
    let content = ''
    let objToken = null
    let objType = null
    
    // 第一步：获取知识库节点信息，得到实际的文档 obj_token
    try {
      logger.info(`📡 获取知识库节点信息...`)
      const nodeResponse = await axios.get(
        `https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node`,
        {
          params: { token: nodeToken },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      )
      
      if (nodeResponse.data?.code === 0 && nodeResponse.data?.data?.node) {
        const node = nodeResponse.data.data.node
        objToken = node.obj_token
        objType = node.obj_type
        logger.info(`✅ 获取节点信息成功: obj_token=${objToken}, obj_type=${objType}`)
      } else {
        logger.warn(`⚠️  获取节点信息失败:`, nodeResponse.data)
      }
    } catch (err) {
      logger.warn(`⚠️  获取节点信息失败: ${err.message}`)
    }
    
    // 第二步：根据文档类型获取内容
    if (objToken) {
      try {
        if (objType === 'docx') {
          // 新版文档使用 docx API
          logger.info(`📡 调用 docx API 获取文档内容...`)
          const response = await axios.get(
            `https://open.feishu.cn/open-apis/docx/v1/documents/${objToken}/raw_content`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 15000
            }
          )
          
          if (response.data?.code === 0 && response.data?.data?.content) {
            content = response.data.data.content
            logger.info(`✅ 成功获取文档内容 (${content.length} 字节)`)
          }
        } else if (objType === 'doc') {
          // 旧版文档使用 docs API
          logger.info(`📡 调用 docs API 获取文档内容...`)
          const response = await axios.get(
            `https://open.feishu.cn/open-apis/doc/v2/${objToken}/raw_content`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              },
              timeout: 15000
            }
          )
          
          if (response.data?.code === 0 && response.data?.data?.content) {
            content = response.data.data.content
            logger.info(`✅ 成功获取文档内容 (${content.length} 字节)`)
          }
        } else {
          logger.warn(`⚠️  不支持的文档类型: ${objType}`)
        }
      } catch (err) {
        const status = err.response?.status
        const errorData = err.response?.data
        
        logger.warn(`⚠️  获取文档内容失败 (${status}):`, {
          message: err.message,
          error: errorData?.msg || '未知错误'
        })
        
        if (status === 403) {
          logger.warn('💡 提示: 需要开通 docx:document 或 wiki:wiki:readonly 权限')
        }
      }
    }

    // 从内容中提取术语
    const terms = []
    if (content && content.length > 0) {
      // 支持多种格式的术语对：
      // 1. 表格格式: "术语 | 翻译" 或 "术语:翻译"
      // 2. 箭头格式: "术语 → 翻译" 或 "术语 => 翻译"
      // 3. 冒号格式: "术语: 翻译"
      
      // 日文字符范围：
      // - 平假名: \u3040-\u309F
      // - 片假名: \u30A0-\u30FF
      // - 日文汉字: \u4E00-\u9FFF (与中文共用)
      // - 半角片假名: \uFF65-\uFF9F
      
      const patterns = [
        // 表格/列表分隔符格式 - 支持英文和日文翻译
        /([^\s|→=:《》【】\n,，]+)\s*[|→=]\s*([A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F][A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F\s\-'()・ー]+)/g,
        // 冒号分隔 - 支持英文和日文翻译
        /([^\s|→=:：《》【】\n,，]+)\s*[:：]\s*([A-Za-z\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F][A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\uFF65-\uFF9F\s\-'()・ー]+)/g,
        // 逗号分隔格式（如 "重影:ゴースト,"）
        /([^\s|→=:：《》【】\n,，]+)\s*[:：]\s*([A-Za-z\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F][A-Za-z0-9\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F\s\-'()・ー]*)/g
      ]

      const seenTerms = new Set() // 避免重复
      
      for (const pattern of patterns) {
        let match
        while ((match = pattern.exec(content)) !== null) {
          const original = match[1].trim()
          const translation = match[2].trim()
          
          // 验证格式
          if (original.length >= 1 && translation.length >= 1) {
            const hasChineseChars = /[\u4e00-\u9fa5]/.test(original)
            // 检查是否有英文或日文字符
            const hasEnglish = /[A-Za-z]/.test(translation)
            const hasJapanese = /[\u3040-\u309F\u30A0-\u30FF\uFF65-\uFF9F]/.test(translation)
            const termKey = `${original}|${translation}`
            
            // 中文术语 + (英文或日文)翻译 + 未重复
            if (hasChineseChars && (hasEnglish || hasJapanese) && !seenTerms.has(termKey) && terms.length < 500) {
              terms.push({ original, translation })
              seenTerms.add(termKey)
              logger.debug(`📝 提取术语: ${original} -> ${translation}`)
            }
          }
        }
      }
    }

    logger.info(`✅ 从飞书文档提取 ${terms.length} 个术语`)
    return terms
  } catch (error) {
    logger.error(`❌ 从飞书文档提取术语失败: ${error.message}`)
    return []
  }
}

/**
 * 加载飞书知识库
 */
async function load() {
  // 检查缓存
  if (cacheExpiry && Date.now() < cacheExpiry && terminologyCache.size > 0) {
    logger.info('✅ 使用缓存的术语库数据')
    return Array.from(terminologyCache.entries()).map(([original, translation]) => ({
      original,
      translation
    }))
  }

  // 尝试从飞书加载
  const accessToken = await getFeishuAccessToken()
  
  if (!accessToken) {
    logger.warn('⚠️  飞书配置未设置，使用模拟数据')
    return getMockTerminology()
  }

  try {
    logger.info('🔍 从飞书知识库加载术语库...')
    const allTerms = []

    // 加载中-英知识库页面
    const enTerms = await extractTermsFromFeishuWiki(FEISHU_WIKI_NODES.zh_to_en, accessToken)
    allTerms.push(...enTerms)

    // 加载中-日知识库页面
    const jaTerms = await extractTermsFromFeishuWiki(FEISHU_WIKI_NODES.zh_to_ja, accessToken)
    allTerms.push(...jaTerms)

    // 去重
    const uniqueTerms = Array.from(
      new Map(allTerms.map(t => [t.original, t])).values()
    )

    logger.info(`✅ 成功加载 ${uniqueTerms.length} 个术语`)

    // 更新缓存
    terminologyCache.clear()
    uniqueTerms.forEach(term => {
      terminologyCache.set(term.original, term.translation)
    })
    cacheExpiry = Date.now() + CACHE_DURATION

    return uniqueTerms
  } catch (error) {
    logger.error('❌ 从飞书加载术语库失败:', error.message)
    logger.warn('⚠️  使用模拟数据作为后备')
    return getMockTerminology()
  }
}

/**
 * 查询术语
 */
async function query(term) {
  if (terminologyCache.size === 0 || !cacheExpiry || Date.now() >= cacheExpiry) {
    await load()
  }
  
  const translation = terminologyCache.get(term)
  return translation ? { original: term, translation } : null
}

/**
 * 添加术语到飞书知识库页面
 * 先获取 wiki 节点的 obj_token，然后追加内容
 */
async function addTermsToFeishuWiki(nodeToken, accessToken, terms) {
  try {
    logger.info(`📝 向飞书知识库 ${nodeToken} 添加 ${terms.length} 个术语...`)
    
    // 第一步：获取知识库节点信息，得到实际的文档 obj_token
    let objToken = null
    let objType = null
    
    try {
      const nodeResponse = await axios.get(
        `https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node`,
        {
          params: { token: nodeToken },
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000
        }
      )
      
      if (nodeResponse.data?.code === 0 && nodeResponse.data?.data?.node) {
        const node = nodeResponse.data.data.node
        objToken = node.obj_token
        objType = node.obj_type
        logger.info(`✅ 获取节点信息: obj_token=${objToken}, obj_type=${objType}`)
      } else {
        throw new Error(nodeResponse.data?.msg || '获取节点信息失败')
      }
    } catch (err) {
      logger.error(`❌ 获取知识库节点失败: ${err.message}`)
      return { success: false, error: err.message }
    }
    
    // 第二步：向文档追加内容
    if (objToken && objType === 'docx') {
      // 构建要添加的内容块
      const children = terms.map(term => ({
        block_type: 2, // text block
        text: {
          elements: [
            {
              text_run: {
                content: `${term.original} | ${term.translation}`
              }
            }
          ],
          style: {}
        }
      }))
      
      const response = await axios.post(
        `https://open.feishu.cn/open-apis/docx/v1/documents/${objToken}/blocks/${objToken}/children`,
        {
          children: children,
          index: -1
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      )
      
      if (response.data?.code === 0) {
        logger.info(`✅ 成功向飞书知识库添加 ${terms.length} 个术语`)
        return { success: true, count: terms.length }
      } else {
        logger.warn(`⚠️  写入返回非预期结果:`, response.data)
        return { success: false, error: response.data?.msg || '未知错误' }
      }
    } else {
      return { success: false, error: `不支持的文档类型: ${objType}` }
    }
  } catch (error) {
    const status = error.response?.status
    const errorData = error.response?.data
    
    logger.error(`❌ 向飞书知识库添加术语失败 (${status}):`, {
      message: error.message,
      error: errorData?.msg || '未知错误'
    })
    
    if (status === 403) {
      logger.warn('💡 提示: 需要飞书应用具有 wiki:wiki 和 docx:document:write 权限')
    }
    
    return { success: false, error: errorData?.msg || error.message }
  }
}

/**
 * 添加术语
 */
async function add(terms) {
  logger.info(`📝 添加 ${terms.length} 个术语...`)
  
  // 更新本地缓存
  terms.forEach(term => {
    terminologyCache.set(term.original, term.translation)
  })
  
  // 尝试写入飞书知识库
  const accessToken = await getFeishuAccessToken()
  
  if (!accessToken) {
    logger.warn('⚠️  飞书未配置，仅更新本地缓存')
    return {
      success: true,
      message: '术语已添加到本地缓存（飞书未配置）',
      count: terms.length,
      savedToFeishu: false
    }
  }
  
  // 默认写入中-英知识库页面
  const result = await addTermsToFeishuWiki(FEISHU_WIKI_NODES.zh_to_en, accessToken, terms)
  
  if (result.success) {
    logger.info(`✅ 术语已成功保存到飞书知识库`)
    return {
      success: true,
      message: '术语已添加到飞书知识库',
      count: terms.length,
      savedToFeishu: true
    }
  } else {
    logger.warn(`⚠️  飞书写入失败，仅保存到本地缓存: ${result.error}`)
    return {
      success: true,
      message: `术语已添加到本地缓存（飞书写入失败: ${result.error}）`,
      count: terms.length,
      savedToFeishu: false
    }
  }
}

export default {
  load,
  query,
  add
}


