import axios from 'axios'
import fs from 'fs'
import path from 'path'

// 配置测试环境
const API_BASE_URL = 'http://localhost:3001/api'
const TEST_TEXT = '激光雷达系统是机器人自主导航的核心组件。通过激光雷达，机器人可以实时构建环境地图，实现精准定位和路径规划。'

// 创建测试结果目录
const testResultsDir = path.join(process.cwd(), 'test-results')
if (!fs.existsSync(testResultsDir)) {
  fs.mkdirSync(testResultsDir, { recursive: true })
}

// 测试结果记录
const testResults = {
  startTime: new Date().toISOString(),
  tests: [],
  summary: {
    total: 0,
    passed: 0,
    failed: 0
  }
}

// 记录测试结果的函数
function recordTestResult(name, status, message, data = null) {
  const testResult = {
    name,
    status,
    message,
    data,
    timestamp: new Date().toISOString()
  }
  
  testResults.tests.push(testResult)
  testResults.summary.total++
  
  if (status === 'passed') {
    testResults.summary.passed++
  } else {
    testResults.summary.failed++
  }
  
  console.log(`${status.toUpperCase()}: ${name} - ${message}`)
}

// 保存测试结果到文件
function saveTestResults() {
  testResults.endTime = new Date().toISOString()
  const resultFilePath = path.join(testResultsDir, `test-results-${Date.now()}.json`)
  fs.writeFileSync(resultFilePath, JSON.stringify(testResults, null, 2), 'utf8')
  console.log(`\n测试结果已保存到: ${resultFilePath}`)
  console.log(`\n测试总结:`)
  console.log(`- 总测试数: ${testResults.summary.total}`)
  console.log(`- 通过: ${testResults.summary.passed}`)
  console.log(`- 失败: ${testResults.summary.failed}`)
}

// 测试健康检查端点
async function testHealthCheck() {
  try {
    const response = await axios.get('http://localhost:3001/health')
    if (response.status === 200 && response.data.status === 'OK') {
      recordTestResult('健康检查', 'passed', '服务器运行正常')
      return true
    } else {
      recordTestResult('健康检查', 'failed', `返回状态: ${response.status}, 数据: ${JSON.stringify(response.data)}`)
      return false
    }
  } catch (error) {
    recordTestResult('健康检查', 'failed', `请求失败: ${error.message}`)
    return false
  }
}

// 测试submit-text端点
async function testSubmitText() {
  try {
    const response = await axios.post(`${API_BASE_URL}/submit-text`, {
      text: TEST_TEXT,
      language_from: 'ZH',
      language_to: 'EN-US'
    })
    
    if (response.status === 200) {
      recordTestResult('提交文本', 'passed', '文本提交成功', {
        sessionId: response.data.sessionId,
        hasProperNouns: !!response.data.properNouns
      })
      return response.data.sessionId
    } else {
      recordTestResult('提交文本', 'failed', `返回状态: ${response.status}, 数据: ${JSON.stringify(response.data)}`)
      return null
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message
    const errorType = error.response?.data?.type || 'unknown'
    recordTestResult('提交文本', 'failed', `请求失败: ${errorMessage} (类型: ${errorType})`)
    return null
  }
}

// 测试confirm-nouns端点
async function testConfirmNouns(sessionId) {
  if (!sessionId) {
    recordTestResult('确认专有名词', 'skipped', '跳过测试，因为没有有效的sessionId')
    return false
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/confirm-nouns`, {
      sessionId,
      confirmedNouns: []
    })
    
    if (response.status === 200) {
      recordTestResult('确认专有名词', 'passed', '专有名词确认成功')
      return true
    } else {
      recordTestResult('确认专有名词', 'failed', `返回状态: ${response.status}, 数据: ${JSON.stringify(response.data)}`)
      return false
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message
    recordTestResult('确认专有名词', 'failed', `请求失败: ${errorMessage}`)
    return false
  }
}

// 测试start-translation端点
async function testStartTranslation(sessionId) {
  if (!sessionId) {
    recordTestResult('开始翻译', 'skipped', '跳过测试，因为没有有效的sessionId')
    return false
  }
  
  try {
    const response = await axios.post(`${API_BASE_URL}/start-translation`, {
      sessionId,
      userInput: '开始翻译'
    })
    
    if (response.status === 200) {
      recordTestResult('开始翻译', 'passed', '翻译开始成功', {
        hasTranslatedText: !!response.data.translatedText
      })
      return true
    } else {
      recordTestResult('开始翻译', 'failed', `返回状态: ${response.status}, 数据: ${JSON.stringify(response.data)}`)
      return false
    }
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message
    const errorType = error.response?.data?.type || 'unknown'
    recordTestResult('开始翻译', 'failed', `请求失败: ${errorMessage} (类型: ${errorType})`)
    return false
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试Dify API交互...')
  console.log(`📅 测试开始时间: ${new Date().toISOString()}`)
  console.log(`🔗 API基础URL: ${API_BASE_URL}`)
  console.log('\n' + '='.repeat(50) + '\n')
  
  // 运行测试
  await testHealthCheck()
  const sessionId = await testSubmitText()
  await testConfirmNouns(sessionId)
  await testStartTranslation(sessionId)
  
  console.log('\n' + '='.repeat(50) + '\n')
  console.log('📊 测试完成!')
  
  // 保存测试结果
  saveTestResults()
}

// 运行测试
runTests().catch(error => {
  console.error('❌ 测试执行失败:', error)
  process.exit(1)
})