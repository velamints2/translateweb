/**
 * 压力测试脚本
 * 测试系统在高负载下的表现
 */

import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()

const BASE_URL = 'http://localhost:3001'

class StressTest {
  constructor(config = {}) {
    this.config = {
      duration: config.duration || 60000, // 默认1分钟
      concurrency: config.concurrency || 10, // 并发数
      rampUp: config.rampUp || 5000, // 启动时间
      ...config
    }
    this.results = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      startTime: null,
      endTime: null
    }
  }

  async makeRequest(testName, requestFn) {
    const startTime = Date.now()
    try {
      await requestFn()
      const responseTime = Date.now() - startTime
      this.results.successRequests++
      this.results.responseTimes.push(responseTime)
      return { success: true, responseTime }
    } catch (error) {
      const responseTime = Date.now() - startTime
      this.results.failedRequests++
      this.results.errors.push({
        test: testName,
        error: error.message,
        time: new Date().toISOString()
      })
      return { success: false, error: error.message, responseTime }
    } finally {
      this.results.totalRequests++
    }
  }

  async runTest(testName, requestFn) {
    console.log(`\n🔥 压力测试: ${testName}`)
    console.log(`⏱️  持续时间: ${this.config.duration / 1000}秒`)
    console.log(`🔄 并发数: ${this.config.concurrency}`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)

    this.results = {
      totalRequests: 0,
      successRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errors: [],
      startTime: Date.now(),
      endTime: null
    }

    const workers = []
    const startTime = Date.now()
    const endTime = startTime + this.config.duration

    // 启动并发工作器
    for (let i = 0; i < this.config.concurrency; i++) {
      // 渐进启动
      await new Promise(resolve => setTimeout(resolve, this.config.rampUp / this.config.concurrency))
      
      const worker = (async () => {
        while (Date.now() < endTime) {
          await this.makeRequest(testName, requestFn)
          // 添加小延迟避免过度压力
          await new Promise(resolve => setTimeout(resolve, Math.random() * 100))
        }
      })()
      
      workers.push(worker)
    }

    // 等待所有工作器完成
    await Promise.all(workers)

    this.results.endTime = Date.now()
    this.printResults()
    return this.results
  }

  printResults() {
    const duration = (this.results.endTime - this.results.startTime) / 1000
    const rps = this.results.totalRequests / duration
    const successRate = (this.results.successRequests / this.results.totalRequests * 100).toFixed(2)

    console.log(`\n📊 测试结果:`)
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
    console.log(`✅ 成功请求: ${this.results.successRequests}`)
    console.log(`❌ 失败请求: ${this.results.failedRequests}`)
    console.log(`📈 总请求数: ${this.results.totalRequests}`)
    console.log(`📊 成功率: ${successRate}%`)
    console.log(`⚡ RPS: ${rps.toFixed(2)} 请求/秒`)
    console.log(`⏱️  总耗时: ${duration.toFixed(2)}秒`)

    if (this.results.responseTimes.length > 0) {
      const sortedTimes = this.results.responseTimes.sort((a, b) => a - b)
      const avg = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length
      const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)]
      const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)]
      const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)]
      const min = sortedTimes[0]
      const max = sortedTimes[sortedTimes.length - 1]

      console.log(`\n⏱️  响应时间统计:`)
      console.log(`   平均: ${avg.toFixed(2)}ms`)
      console.log(`   最小: ${min}ms`)
      console.log(`   P50:  ${p50}ms`)
      console.log(`   P95:  ${p95}ms`)
      console.log(`   P99:  ${p99}ms`)
      console.log(`   最大: ${max}ms`)
    }

    if (this.results.errors.length > 0) {
      console.log(`\n❌ 错误详情 (显示前5个):`)
      this.results.errors.slice(0, 5).forEach((err, i) => {
        console.log(`   ${i + 1}. ${err.error}`)
      })
    }

    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  }
}

// ==================== 测试场景 ====================

async function testHealthCheck() {
  const stressTest = new StressTest({
    duration: 30000, // 30秒
    concurrency: 20,
    rampUp: 2000
  })

  await stressTest.runTest('健康检查端点', async () => {
    await axios.get(`${BASE_URL}/health`)
  })
}

async function testSubmitText() {
  const stressTest = new StressTest({
    duration: 60000, // 60秒
    concurrency: 10,
    rampUp: 5000
  })

  await stressTest.runTest('提交文本API', async () => {
    await axios.post(`${BASE_URL}/api/submit-text`, {
      text: '测试文本。地图质量确认。机器人定位。',
      language_from: 'ZH',
      language_to: 'EN'
    })
  })
}

async function testMixedLoad() {
  const stressTest = new StressTest({
    duration: 60000, // 60秒
    concurrency: 15,
    rampUp: 5000
  })

  await stressTest.runTest('混合负载测试', async () => {
    const random = Math.random()
    
    if (random < 0.4) {
      // 40% 健康检查
      await axios.get(`${BASE_URL}/health`)
    } else if (random < 0.7) {
      // 30% 提交文本
      await axios.post(`${BASE_URL}/api/submit-text`, {
        text: '测试文本',
        language_from: 'ZH',
        language_to: 'EN'
      })
    } else {
      // 30% 查询历史
      await axios.get(`${BASE_URL}/api/history`)
    }
  })
}

async function testLongDuration() {
  const stressTest = new StressTest({
    duration: 300000, // 5分钟
    concurrency: 5,
    rampUp: 10000
  })

  await stressTest.runTest('长时间运行测试', async () => {
    await axios.post(`${BASE_URL}/api/submit-text`, {
      text: '长时间运行测试。'.repeat(10),
      language_from: 'ZH',
      language_to: 'EN'
    })
  })
}

async function testHighConcurrency() {
  const stressTest = new StressTest({
    duration: 30000, // 30秒
    concurrency: 50, // 高并发
    rampUp: 5000
  })

  await stressTest.runTest('高并发测试', async () => {
    await axios.get(`${BASE_URL}/health`)
  })
}

// ==================== 主函数 ====================

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('🔥 压力测试套件')
  console.log('═══════════════════════════════════════════════════════════')
  console.log(`📍 目标服务器: ${BASE_URL}`)
  console.log(`⏰ 开始时间: ${new Date().toISOString()}`)
  
  // 检查服务器是否运行
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 })
    console.log('✅ 服务器正在运行')
  } catch (error) {
    console.error('❌ 无法连接到服务器，请确保服务器正在运行')
    process.exit(1)
  }

  console.log('\n开始测试...\n')

  try {
    // 运行测试场景
    await testHealthCheck()
    await new Promise(resolve => setTimeout(resolve, 5000)) // 间隔5秒
    
    await testSubmitText()
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    await testMixedLoad()
    await new Promise(resolve => setTimeout(resolve, 5000))
    
    await testHighConcurrency()
    
    // 可选：长时间测试（注释掉以节省时间）
    // await testLongDuration()

  } catch (error) {
    console.error('❌ 测试执行出错:', error.message)
    process.exit(1)
  }

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log('✅ 所有压力测试完成')
  console.log(`⏰ 结束时间: ${new Date().toISOString()}`)
  console.log('═══════════════════════════════════════════════════════════')
}

// 执行测试
main().catch(error => {
  console.error('❌ 测试失败:', error)
  process.exit(1)
})


