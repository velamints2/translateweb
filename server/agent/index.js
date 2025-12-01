/**
 * 本地化翻译Agent
 * 直接集成三个工具的功能，无需单独的MCP进程
 */

import feishuTool from './tools/feishu-knowledge-base.js'
import preprocessTool from './tools/preprocess-text.js'
import translateTool from './tools/translate-agent.js'
import logger from '../utils/logger.js'

class TranslationAgent {
  constructor() {
    this.tools = {
      feishu: feishuTool,
      preprocess: preprocessTool,
      translate: translateTool
    }
  }

  /**
   * 加载飞书知识库
   */
  async loadKnowledgeBase() {
    logger.info('📚 加载飞书知识库...')
    try {
      const result = await this.tools.feishu.load()
      logger.info(`✅ 成功加载 ${result.length} 个术语`)
      return result
    } catch (error) {
      logger.error('❌ 加载飞书知识库失败:', error)
      throw error
    }
  }

  /**
   * 查询术语
   */
  async queryTerm(term) {
    try {
      return await this.tools.feishu.query(term)
    } catch (error) {
      logger.error(`❌ 查询术语失败:`, error)
      return null
    }
  }

  /**
   * 添加术语
   */
  async addTerms(terms) {
    logger.info(`📝 添加 ${terms.length} 个术语...`)
    try {
      const result = await this.tools.feishu.add(terms)
      logger.info(`✅ 成功添加术语`)
      return result
    } catch (error) {
      logger.error('❌ 添加术语失败:', error)
      throw error
    }
  }

  /**
   * 预处理文本并生成报告
   */
  async preprocessText(text, languageFrom, languageTo) {
    logger.info('📋 预处理文本...')
    try {
      // 先加载术语库
      const terminologyDatabase = await this.loadKnowledgeBase()
      
      // 执行预处理
      const result = await this.tools.preprocess.analyze(
        text,
        languageFrom,
        languageTo,
        terminologyDatabase
      )
      
      logger.info('✅ 文本预处理完成')
      return result
    } catch (error) {
      logger.error('❌ 预处理文本失败:', error)
      throw error
    }
  }

  /**
   * 执行翻译
   */
  async translate(text, languageFrom, languageTo, confirmedTerms, documentInfo, translationStrategy) {
    logger.info('🌐 执行翻译...')
    try {
      const result = await this.tools.translate.execute(
        text,
        languageFrom,
        languageTo,
        confirmedTerms,
        documentInfo,
        translationStrategy
      )
      
      logger.info('✅ 翻译完成')
      return result
    } catch (error) {
      logger.error('❌ 翻译失败:', error)
      throw error
    }
  }

  /**
   * 完整的翻译工作流
   */
  async fullWorkflow(text, languageFrom, languageTo, userConfirmation = null) {
    try {
      // 1. 预处理文本
      const analysisResult = await this.preprocessText(text, languageFrom, languageTo)
      
      // 2. 如果提供了用户确认，使用确认的术语
      let confirmedTerms = analysisResult.properNouns
      if (userConfirmation) {
        confirmedTerms = userConfirmation.confirmedNouns || confirmedTerms
        
        // 保存新术语到知识库
        const newTerms = confirmedTerms.filter(t => t.confirmed && !t.fromDatabase)
        if (newTerms.length > 0) {
          await this.addTerms(newTerms)
        }
      }
      
      // 3. 执行翻译
      const translationResult = await this.translate(
        text,
        languageFrom,
        languageTo,
        confirmedTerms,
        analysisResult.documentInfo,
        analysisResult.translationStrategy
      )
      
      return {
        analysisResult,
        translationResult
      }
    } catch (error) {
      logger.error('❌ 翻译工作流失败:', error)
      throw error
    }
  }
}

// 创建单例
const translationAgent = new TranslationAgent()

export default translationAgent


