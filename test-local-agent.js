/**
 * 测试本地Agent功能
 * 运行: node test-local-agent.js
 */

import dotenv from 'dotenv'
import translationAgent from './server/agent/index.js'
import logger from './server/utils/logger.js'

dotenv.config()

async function testAgent() {
  console.log('🧪 开始测试本地Agent...\n')

  try {
    // 测试1: 加载知识库
    console.log('📋 测试1: 加载飞书知识库')
    const knowledgeBase = await translationAgent.loadKnowledgeBase()
    console.log(`✅ 成功加载 ${knowledgeBase.length} 个术语`)
    console.log('示例术语:', knowledgeBase.slice(0, 3))
    console.log()

    // 测试2: 查询术语
    console.log('📋 测试2: 查询术语')
    const term = await translationAgent.queryTerm('激光雷达')
    console.log('查询结果:', term)
    console.log()

    // 测试3: 预处理文本
    console.log('📋 测试3: 预处理文本')
    const testText = `地图质量确认
    
地图重影
地图重影会导致机器人在执行任务时出现定位丢失，表现为运行停止、运行乱走等。建图时需要特别注意，明显特征是墙出现双线或道路扭曲与实际场景不符，不确定时测试重点关注此处。

虚影
地图上有虚影，会导致机器人在执行任务时遇到该位置会出现定位丢失，机器人运行到该位置检测到定位得分下降，定位得分下降到一定值时会导致机器人出现运行停止、运行乱走等。建图时需要特别注意，原因：机器未深入扫描到该区域。若该区域不需要清扫，且不影响周边区域定位，可以接受。若该区域需要清扫，通过扩建功能扩建该区域。`

    const analysisResult = await translationAgent.preprocessText(
      testText,
      'ZH',
      'EN-US'
    )
    
    console.log('✅ 预处理完成')
    console.log('文档信息:', analysisResult.documentInfo)
    console.log('识别的术语数:', analysisResult.properNouns.length)
    console.log('已有术语:', analysisResult.existingTerms.length)
    console.log('新术语:', analysisResult.newTerms.length)
    console.log()

    // 测试4: 执行翻译
    console.log('📋 测试4: 执行翻译')
    const confirmedTerms = analysisResult.properNouns.map(t => ({
      ...t,
      confirmed: true
    }))

    const translationResult = await translationAgent.translate(
      testText,
      'ZH',
      'EN-US',
      confirmedTerms,
      analysisResult.documentInfo,
      analysisResult.translationStrategy
    )

    console.log('✅ 翻译完成')
    console.log('翻译结果预览:')
    console.log(translationResult.translatedText.substring(0, 200) + '...')
    console.log()
    console.log('Token使用情况:', translationResult.usage)
    console.log()

    console.log('🎉 所有测试通过！')

  } catch (error) {
    console.error('❌ 测试失败:', error.message)
    console.error('详细错误:', error)
    process.exit(1)
  }
}

// 运行测试
testAgent()


