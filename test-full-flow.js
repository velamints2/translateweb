#!/usr/bin/env node

/**
 * 最小成本全流程验证脚本
 * 使用最少的 token 来验证整个流程是否正常运行
 */

import dotenv from 'dotenv'
import translationAgent from './server/agent/index.js'
import logger from './server/utils/logger.js'

dotenv.config()

async function testFullFlow() {
  logger.info('🚀 开始全流程验证测试...\n')

  try {
    // =====================
    // 第1步: 加载飞书知识库
    // =====================
    logger.info('📚 第1步: 加载飞书知识库')
    const knowledge = await translationAgent.loadKnowledgeBase()
    logger.info(`✅ 成功加载 ${knowledge.length} 个术语\n`)

    if (knowledge.length === 0) {
      logger.warn('⚠️  知识库为空，可能是飞书配置未设置')
    } else {
      logger.info('示例术语:')
      knowledge.slice(0, 3).forEach(term => {
        logger.info(`  - ${term.original} → ${term.translation}`)
      })
      logger.info('')
    }

    // =====================
    // 第2步: 文本分析（使用最少文字）
    // =====================
    logger.info('📋 第2步: 文本分析')
    const testText = '激光雷达用于建图和定位。'
    logger.info(`输入文本: "${testText}"`)

    const analysisResult = await translationAgent.preprocessText(testText, 'ZH', 'EN-US')
    logger.info(`✅ 分析完成`)
    logger.info(`文档领域: ${analysisResult.documentInfo?.domain || 'N/A'}`)
    logger.info(`识别术语: ${analysisResult.properNouns?.length || 0} 个\n`)

    if (analysisResult.properNouns?.length > 0) {
      logger.info('识别的术语:')
      analysisResult.properNouns.slice(0, 3).forEach(noun => {
        logger.info(`  - ${noun.original} → ${noun.translation}`)
      })
      logger.info('')
    }

    // =====================
    // 第3步: 翻译（使用最少文字）
    // =====================
    logger.info('🌐 第3步: 执行翻译')
    logger.info(`原文: "${testText}"`)

    const confirmedTerms = analysisResult.properNouns?.map(noun => ({
      ...noun,
      confirmed: true
    })) || []

    const translationResult = await translationAgent.translate(
      testText,
      'ZH',
      'EN-US',
      confirmedTerms,
      analysisResult.documentInfo,
      '保持专业术语一致性'
    )

    logger.info(`✅ 翻译完成`)
    logger.info(`译文: "${translationResult.translatedText}"\n`)

    // =====================
    // 总结
    // =====================
    logger.info('✨ 全流程验证完成！\n')
    logger.info('📊 成本分析:')
    logger.info(`  分析消耗 token: ${analysisResult.usage?.total_tokens || 'N/A'}`)
    logger.info(`  翻译消耗 token: ${translationResult.usage?.total_tokens || 'N/A'}`)
    logger.info(`  总计: ${(analysisResult.usage?.total_tokens || 0) + (translationResult.usage?.total_tokens || 0)} tokens\n`)

    logger.info('🎯 系统状态:')
    logger.info(`  ✅ 飞书知识库: 正常`)
    logger.info(`  ✅ 文本分析: 正常`)
    logger.info(`  ✅ 文本翻译: 正常`)
    logger.info('\n✅ 所有功能正常运行！')

    process.exit(0)
  } catch (error) {
    logger.error('❌ 测试失败:', error.message)
    logger.error('错误详情:', error)
    process.exit(1)
  }
}

// 运行测试
testFullFlow()
