/**
 * 综合测试脚本
 * 测试系统的鲁棒性和可靠性
 */

import dotenv from 'dotenv'
import translationAgent from '../server/agent/index.js'
import logger from '../server/utils/logger.js'
import axios from 'axios'

dotenv.config()

const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
}

// 测试工具函数
function test(name, fn) {
  return async () => {
    console.log(`\n🧪 测试: ${name}`)
    const startTime = Date.now()
    try {
      await fn()
      const duration = Date.now() - startTime
      console.log(`   ✅ 通过 (${duration}ms)`)
      testResults.passed++
      testResults.tests.push({ name, status: 'passed', duration })
    } catch (error) {
      const duration = Date.now() - startTime
      console.log(`   ❌ 失败: ${error.message}`)
      testResults.failed++
      testResults.tests.push({ name, status: 'failed', duration, error: error.message })
    }
  }
}

function expect(value) {
  return {
    toBe(expected) {
      if (value !== expected) {
        throw new Error(`期望 ${expected}, 实际 ${value}`)
      }
    },
    toBeGreaterThan(expected) {
      if (value <= expected) {
        throw new Error(`期望 > ${expected}, 实际 ${value}`)
      }
    },
    toBeLessThan(expected) {
      if (value >= expected) {
        throw new Error(`期望 < ${expected}, 实际 ${value}`)
      }
    },
    toBeDefined() {
      if (value === undefined) {
        throw new Error(`期望已定义, 实际 undefined`)
      }
    },
    toBeNull() {
      if (value !== null) {
        throw new Error(`期望 null, 实际 ${value}`)
      }
    },
    toContain(expected) {
      if (!value.includes(expected)) {
        throw new Error(`期望包含 ${expected}`)
      }
    },
    toHaveLength(expected) {
      if (value.length !== expected) {
        throw new Error(`期望长度 ${expected}, 实际 ${value.length}`)
      }
    }
  }
}

// ==================== 单元测试 ====================

const unitTests = [
  // 1. 知识库测试
  test('加载知识库', async () => {
    const terms = await translationAgent.loadKnowledgeBase()
    expect(terms).toBeDefined()
    expect(terms.length).toBeGreaterThan(0)
  }),

  test('查询存在的术语', async () => {
    const term = await translationAgent.queryTerm('激光雷达')
    expect(term).toBeDefined()
    expect(term.translation).toBe('LiDAR')
  }),

  test('查询不存在的术语', async () => {
    const term = await translationAgent.queryTerm('不存在的术语xyz123')
    expect(term).toBeNull()
  }),

  test('添加新术语', async () => {
    const result = await translationAgent.addTerms([
      { original: '测试术语', translation: 'Test Term' }
    ])
    expect(result.success).toBe(true)
  }),

  // 2. 预处理测试
  test('预处理普通文本', async () => {
    const result = await translationAgent.preprocessText(
      '地图质量确认。机器人定位丢失。',
      'ZH',
      'EN'
    )
    expect(result).toBeDefined()
    expect(result.documentInfo).toBeDefined()
    expect(result.properNouns).toBeDefined()
  }),

  test('预处理短文本', async () => {
    const result = await translationAgent.preprocessText('测试', 'ZH', 'EN')
    expect(result).toBeDefined()
  }),

  test('预处理长文本', async () => {
    const longText = '测试文本。'.repeat(100)
    const result = await translationAgent.preprocessText(longText, 'ZH', 'EN')
    expect(result).toBeDefined()
  })
]

// ==================== 边界测试 ====================

const boundaryTests = [
  test('空字符串查询', async () => {
    const term = await translationAgent.queryTerm('')
    expect(term).toBeNull()
  }),

  test('超长字符串查询', async () => {
    const longTerm = 'a'.repeat(10000)
    const term = await translationAgent.queryTerm(longTerm)
    expect(term).toBeNull()
  }),

  test('特殊字符查询', async () => {
    const term = await translationAgent.queryTerm('@#$%^&*()')
    expect(term).toBeNull()
  }),

  test('最小文本（1字符）', async () => {
    const result = await translationAgent.preprocessText('测', 'ZH', 'EN')
    expect(result).toBeDefined()
  }),

  test('纯数字文本', async () => {
    const result = await translationAgent.preprocessText('123456789', 'ZH', 'EN')
    expect(result).toBeDefined()
    expect(result.properNouns.length).toBe(0)
  }),

  test('纯符号文本', async () => {
    const result = await translationAgent.preprocessText('!@#$%^&*()', 'ZH', 'EN')
    expect(result).toBeDefined()
    expect(result.properNouns.length).toBe(0)
  }),

  test('混合语言文本', async () => {
    const text = '这是中文 This is English 混合文本'
    const result = await translationAgent.preprocessText(text, 'ZH', 'EN')
    expect(result).toBeDefined()
  })
]

// ==================== 性能测试 ====================

const performanceTests = [
  test('知识库加载性能 (<100ms)', async () => {
    const start = Date.now()
    await translationAgent.loadKnowledgeBase()
    const duration = Date.now() - start
    console.log(`     ⏱️  耗时: ${duration}ms`)
    expect(duration).toBeLessThan(100)
  }),

  test('术语查询性能 (<10ms)', async () => {
    await translationAgent.loadKnowledgeBase() // 预热
    const start = Date.now()
    await translationAgent.queryTerm('激光雷达')
    const duration = Date.now() - start
    console.log(`     ⏱️  耗时: ${duration}ms`)
    expect(duration).toBeLessThan(10)
  }),

  test('批量术语查询性能', async () => {
    await translationAgent.loadKnowledgeBase()
    const terms = ['激光雷达', '建图', '定位', '重影', '虚影']
    const start = Date.now()
    
    for (const term of terms) {
      await translationAgent.queryTerm(term)
    }
    
    const duration = Date.now() - start
    console.log(`     ⏱️  5个术语耗时: ${duration}ms`)
    expect(duration).toBeLessThan(50)
  }),

  test('预处理性能 (<1000ms)', async () => {
    const text = '地图质量确认。'.repeat(10)
    const start = Date.now()
    await translationAgent.preprocessText(text, 'ZH', 'EN')
    const duration = Date.now() - start
    console.log(`     ⏱️  耗时: ${duration}ms`)
    expect(duration).toBeLessThan(1000)
  })
]

// ==================== 压力测试 ====================

const stressTests = [
  test('连续100次查询', async () => {
    await translationAgent.loadKnowledgeBase()
    const start = Date.now()
    
    for (let i = 0; i < 100; i++) {
      await translationAgent.queryTerm('激光雷达')
    }
    
    const duration = Date.now() - start
    const avgTime = duration / 100
    console.log(`     ⏱️  100次查询耗时: ${duration}ms, 平均: ${avgTime.toFixed(2)}ms`)
    expect(avgTime).toBeLessThan(5)
  }),

  test('内存稳定性测试', async () => {
    const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024

    // 执行100次操作
    for (let i = 0; i < 100; i++) {
      await translationAgent.queryTerm(`测试${i}`)
    }

    const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024
    const memoryIncrease = finalMemory - initialMemory
    
    console.log(`     💾 内存增长: ${memoryIncrease.toFixed(2)} MB`)
    expect(memoryIncrease).toBeLessThan(50) // 增长<50MB
  }),

  test('缓存有效性测试', async () => {
    // 第一次加载
    await translationAgent.loadKnowledgeBase()
    
    // 第二次应该从缓存读取
    const start = Date.now()
    await translationAgent.loadKnowledgeBase()
    const duration = Date.now() - start
    
    console.log(`     ⏱️  缓存读取耗时: ${duration}ms`)
    expect(duration).toBeLessThan(5)
  })
]

// ==================== API测试 ====================

const apiTests = [
  test('后端健康检查', async () => {
    try {
      const response = await axios.get('http://localhost:3001/health')
      expect(response.status).toBe(200)
      expect(response.data.status).toBe('OK')
      expect(response.data.mode).toBeDefined()
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('后端服务器未启动')
      }
      throw error
    }
  }),

  test('提交文本API', async () => {
    try {
      const response = await axios.post('http://localhost:3001/api/submit-text', {
        text: '测试文本',
        language_from: 'ZH',
        language_to: 'EN'
      })
      expect(response.status).toBe(200)
      expect(response.data.sessionId).toBeDefined()
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('后端服务器未启动')
      }
      throw error
    }
  }),

  test('历史记录API', async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/history')
      expect(response.status).toBe(200)
      expect(response.data.success).toBe(true)
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('后端服务器未启动')
      }
      throw error
    }
  })
]

// ==================== 错误处理测试 ====================

const errorHandlingTests = [
  test('空文本处理', async () => {
    try {
      await translationAgent.preprocessText('', 'ZH', 'EN')
      throw new Error('应该抛出错误')
    } catch (error) {
      // 预期会抛出错误
      expect(error.message).toBeDefined()
    }
  }),

  test('无效参数处理', async () => {
    try {
      await translationAgent.preprocessText(null, 'ZH', 'EN')
      throw new Error('应该抛出错误')
    } catch (error) {
      expect(error.message).toBeDefined()
    }
  }),

  test('API错误处理', async () => {
    try {
      // 尝试访问不存在的端点
      await axios.get('http://localhost:3001/api/nonexistent')
    } catch (error) {
      expect(error.response.status).toBe(404)
    }
  })
]

// ==================== 运行所有测试 ====================

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🧪 开始综合测试')
  console.log('═══════════════════════════════════════════════════════════')

  const testSuites = [
    { name: '单元测试', tests: unitTests },
    { name: '边界测试', tests: boundaryTests },
    { name: '性能测试', tests: performanceTests },
    { name: '压力测试', tests: stressTests },
    { name: 'API测试', tests: apiTests },
    { name: '错误处理测试', tests: errorHandlingTests }
  ]

  for (const suite of testSuites) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`📦 ${suite.name} (${suite.tests.length}个测试)`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    for (const testFn of suite.tests) {
      await testFn()
    }
  }

  // 生成测试报告
  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('📊 测试报告')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`\n✅ 通过: ${testResults.passed}`)
  console.log(`❌ 失败: ${testResults.failed}`)
  console.log(`⏭️  跳过: ${testResults.skipped}`)
  console.log(`📈 成功率: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`)

  // 显示失败的测试
  if (testResults.failed > 0) {
    console.log('\n❌ 失败的测试:')
    testResults.tests.filter(t => t.status === 'failed').forEach(t => {
      console.log(`   - ${t.name}: ${t.error}`)
    })
  }

  // 性能统计
  const avgDuration = testResults.tests.reduce((sum, t) => sum + t.duration, 0) / testResults.tests.length
  console.log(`\n⏱️  平均耗时: ${avgDuration.toFixed(2)}ms`)
  console.log(`⏱️  总耗时: ${testResults.tests.reduce((sum, t) => sum + t.duration, 0)}ms`)

  console.log('\n═══════════════════════════════════════════════════════════')

  // 保存测试结果
  const reportPath = `test-results/test-results-${Date.now()}.json`
  const fs = await import('fs')
  const path = await import('path')
  
  const reportDir = path.dirname(reportPath)
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true })
  }
  
  fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2))
  console.log(`\n📄 测试报告已保存: ${reportPath}`)

  // 退出码
  process.exit(testResults.failed > 0 ? 1 : 0)
}

// 执行测试
runAllTests().catch(error => {
  console.error('❌ 测试执行失败:', error)
  process.exit(1)
})


