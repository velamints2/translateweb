import axios from 'axios'

// 创建axios实例
const api = axios.create({
  baseURL: '/api',
  timeout: 600000, // 增加超时时间到10分钟
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 增强鲁棒性
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 发送请求: ${config.method?.toUpperCase()} ${config.url}`)
    
    // 确保所有请求都有时间戳
    config.headers['X-Request-Timestamp'] = Date.now()
    
    return config
  },
  (error) => {
    console.error('请求拦截器错误:', error)
    return Promise.reject(new Error('请求配置错误'))
  }
)

// 响应拦截器 - 增强错误处理
api.interceptors.response.use(
  (response) => {
    console.log('✅ 收到响应:', response.status)
    
    // 返回响应数据（允许空对象，但不允许 undefined/null）
    return response.data !== undefined && response.data !== null ? response.data : {}
  },
  (error) => {
    console.error('❌ 请求错误:', error.response?.status || error.code)
    
    // 详细的错误分类
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('请求超时，请稍后重试'))
    }
    
    if (error.response) {
      const status = error.response.status
      const responseData = error.response.data
      
      // 获取详细的错误信息
      let message = responseData?.message || responseData?.error || `服务器错误: ${status}`
      
      // 如果是500错误，返回更详细的错误信息
      if (status === 500 && responseData?.message) {
        message = responseData.message
      }
      
      switch (status) {
        case 400:
          return Promise.reject(new Error(`请求参数错误: ${message}`))
        case 401:
          return Promise.reject(new Error(message || 'API密钥无效或过期'))
        case 403:
          return Promise.reject(new Error('访问被拒绝'))
        case 404:
          return Promise.reject(new Error('请求的资源不存在'))
        case 429:
          return Promise.reject(new Error('请求频率过高，请稍后重试'))
        case 500:
          return Promise.reject(new Error(message || '服务器内部错误'))
        case 502:
          return Promise.reject(new Error('网关错误'))
        case 503:
          return Promise.reject(new Error('服务暂时不可用'))
        default:
          return Promise.reject(new Error(`HTTP错误 ${status}: ${message}`))
      }
    } else if (error.request) {
      return Promise.reject(new Error('网络连接失败，请检查网络设置'))
    } else {
      return Promise.reject(new Error(`请求失败: ${error.message}`))
    }
  }
)

// 输入验证函数
const validateInput = (data, requiredFields) => {
  const errors = []
  
  requiredFields.forEach(field => {
    const value = data[field]
    
    // 处理数组类型（空数组应该被允许）
    if (Array.isArray(value)) {
      // 数组类型：允许空数组，只检查是否为数组
      if (!Array.isArray(value)) {
        errors.push(`字段"${field}"必须是数组`)
      }
    } else if (value === null || value === undefined) {
      // null 或 undefined
      errors.push(`字段"${field}"不能为空`)
    } else if (typeof value === 'string' && value.trim() === '') {
      // 空字符串
      errors.push(`字段"${field}"不能为空`)
    } else if (typeof value === 'object' && Object.keys(value).length === 0) {
      // 空对象
      errors.push(`字段"${field}"不能为空`)
    }
  })
  
  if (errors.length > 0) {
    throw new Error(`输入验证失败: ${errors.join('; ')}`)
  }
}

// 生成会话ID
const generateSessionId = () => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// API函数定义 - 增强输入验证和错误处理

/**
 * 提交翻译文本
 * @param {string} text - 要翻译的文本
 * @param {string} sessionId - 会话ID（可选，不提供则自动生成）
 * @param {string} languageFrom - 源语言（可选，默认为ZH）
 * @param {string} languageTo - 目标语言（可选，默认为EN-US）
 */
export const submitTextAPI = async (text, sessionId = null, languageFrom = 'ZH', languageTo = 'EN-US') => {
  try {
    validateInput({ text }, ['text'])
    
    const data = {
      text: text.trim(),
      sessionId: sessionId || generateSessionId(),
      language_from: languageFrom,
      language_to: languageTo
    }
    
    // 使用统一的 api 实例（统一 baseURL + 拦截器）
    const result = await api.post('/submit-text', data)
    
    // 1. 先判断是否是错误响应
    if (result.error) {
      throw new Error(result.message || result.error)
    }
    
    // 2. 验证正常成功结构
    if (!result.sessionId || !Array.isArray(result.properNouns)) {
      throw new Error('服务器返回格式异常')
    }
    
    // 返回后端实际的数据结构，并转换为前端期望的格式
    return {
      sessionId: result.sessionId,
      documentInfo: result.documentInfo,
      contentStructure: result.contentStructure,
      confirmationText: result.confirmationText,
      translationStrategy: result.translationStrategy,
      // 转换为前端期望的格式
      existingTerms: result.properNouns?.filter(term => term.fromDatabase) || [],
      newTerms: result.properNouns?.filter(term => !term.fromDatabase) || []
    }
  } catch (error) {
    console.error('提交文本API错误:', error)
    console.error('错误详情:', {
      message: error.message,
      response: error.response,
      request: error.request,
      config: error.config
    })
    throw new Error(`提交文本失败: ${error.message}`)
  }
}

/**
 * 确认专有名词翻译
 * @param {string} sessionId - 会话ID
 * @param {Array} confirmedNouns - 确认的专有名词数组
 */
export const confirmNounsAPI = async (sessionId, confirmedNouns) => {
  try {
    // 验证sessionId（必需）
    validateInput({ sessionId }, ['sessionId'])
    
    // 验证confirmedNouns格式（允许空数组）
    if (confirmedNouns !== undefined && confirmedNouns !== null && !Array.isArray(confirmedNouns)) {
      throw new Error('confirmedNouns必须是数组')
    }
    
    // 确保confirmedNouns是数组（即使是空数组）
    const confirmedNounsArray = Array.isArray(confirmedNouns) ? confirmedNouns : []
    
    const data = {
      sessionId: sessionId.trim(),
      confirmedNouns: confirmedNounsArray.map(noun => ({
        original: noun.original?.trim() || '',
        translation: noun.translation?.trim() || '',
        confirmed: noun.confirmed !== false // 默认为true
      }))
    }
    
    return await api.post('/confirm-nouns', data)
  } catch (error) {
    throw new Error(`确认专有名词失败: ${error.message}`)
  }
}

/**
 * 开始翻译
 * @param {string} sessionId - 会话ID
 */
export const startTranslationAPI = async (sessionId) => {
  try {
    validateInput({ sessionId }, ['sessionId'])
    
    const data = {
      sessionId: sessionId.trim()
    }
    
    const result = await api.post('/start-translation', data)
    
    // 验证翻译结果格式 - 支持多种格式
    if (!result) {
      throw new Error('服务器返回空响应')
    }
    
    // 检查是否有错误
    if (result.error) {
      throw new Error(result.message || result.error)
    }
    
    // 支持多种返回格式
    let translatedText = null
    
    if (result.translatedText) {
      // 标准格式
      translatedText = result.translatedText
    } else if (result.answer) {
      // Dify格式兼容
      translatedText = result.answer
    } else if (result.message) {
      // 提示消息（不应该出现在成功响应中）
      throw new Error(result.message || '翻译结果格式异常')
    } else {
      // 未知格式
      throw new Error('翻译结果格式异常：缺少translatedText或answer字段')
    }
    
    // 返回标准格式
    return {
      translatedText: translatedText,
      sessionId: result.sessionId || sessionId,
      translationTime: result.translationTime,
      usage: result.usage || {}
    }
  } catch (error) {
    // 如果错误信息已经包含"开始翻译失败"，直接抛出
    if (error.message.includes('开始翻译失败')) {
      throw error
    }
    throw new Error(`开始翻译失败: ${error.message}`)
  }
}

/**
 * 获取会话状态
 * @param {string} sessionId - 会话ID
 */
export const getSessionAPI = async (sessionId) => {
  try {
    validateInput({ sessionId }, ['sessionId'])
    
    const result = await api.get(`/session/${sessionId.trim()}`)
    
    // 验证会话格式
    if (!result.id && !result.sessionId) {
      throw new Error('会话信息格式异常')
    }
    
    return result
  } catch (error) {
    throw new Error(`获取会话信息失败: ${error.message}`)
  }
}

/**
 * 上传文件进行翻译
 * @param {File} file - 要上传的文件
 */
export const uploadFileAPI = async (file) => {
  try {
    if (!file) {
      throw new Error('请选择要上传的文件')
    }
    
    // 创建FormData对象
    const formData = new FormData()
    formData.append('file', file)
    
    console.log(`📤 上传文件: ${file.name} (${file.type}, ${file.size} bytes)`)
    
    // 使用统一的 api 实例，通过 axios 内部处理 FormData
    const result = await api.post('/upload-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000 // 60秒超时
    })
    
    // 验证返回格式
    if (!result) {
      throw new Error('服务器返回空响应')
    }
    
    if (!result.success) {
      throw new Error(result.error || result.message || '文件处理失败')
    }
    
    console.log('✅ 文件上传成功:', result.fileName)
    return result
  } catch (error) {
    console.error('❌ 文件上传API错误:', error)
    console.error('❌ 错误详情:', {
      message: error.message,
      response: error.response,
      request: error.request,
      config: error.config
    })
    
    // 重新抛出错误，添加更详细的信息
    if (error.response) {
      // 服务器返回了错误状态码
      throw new Error(`文件上传失败: 服务器返回 ${error.response.status} 错误`)
    } else if (error.request) {
      // 请求已发送但没有收到响应
      throw new Error('文件上传失败: 服务器无响应，请检查网络连接')
    } else {
      // 请求配置错误
      throw new Error(`文件上传失败: ${error.message}`)
    }
  }
}

/**
 * 健康检查
 */
export const healthCheckAPI = async () => {
  try {
    const result = await api.get('/health')
    
    // 验证健康检查响应
    if (result.status !== 'ok' && result.status !== 'healthy') {
      throw new Error('服务状态异常')
    }
    
    return result
  } catch (error) {
    throw new Error(`服务不可用: ${error.message}`)
  }
}