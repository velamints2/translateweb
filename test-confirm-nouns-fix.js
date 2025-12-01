/**
 * 测试确认术语修复
 * 验证空数组和边界情况
 */

import axios from 'axios'

const BASE_URL = 'http://localhost:3001'

async function testConfirmNouns() {
  console.log('🧪 测试确认术语修复...\n')

  // 1. 先创建一个会话
  console.log('1️⃣ 创建测试会话...')
  const submitResponse = await axios.post(`${BASE_URL}/api/submit-text`, {
    text: '地图质量确认。机器人定位丢失。',
    language_from: 'ZH',
    language_to: 'EN'
  })

  const sessionId = submitResponse.data.sessionId
  console.log(`✅ 会话创建成功: ${sessionId}\n`)

  // 2. 测试空数组
  console.log('2️⃣ 测试空数组场景...')
  try {
    const emptyArrayResponse = await axios.post(`${BASE_URL}/api/confirm-nouns`, {
      sessionId: sessionId,
      confirmedNouns: []
    })
    console.log('✅ 空数组测试通过')
    console.log('   响应:', emptyArrayResponse.data.message.substring(0, 50) + '...')
  } catch (error) {
    console.log('❌ 空数组测试失败:', error.response?.data?.message || error.message)
  }
  console.log('')

  // 3. 测试正常数组
  console.log('3️⃣ 测试正常数组场景...')
  try {
    const normalResponse = await axios.post(`${BASE_URL}/api/confirm-nouns`, {
      sessionId: sessionId,
      confirmedNouns: [
        { original: '测试', translation: 'Test', confirmed: true }
      ]
    })
    console.log('✅ 正常数组测试通过')
    console.log('   响应:', normalResponse.data.message.substring(0, 50) + '...')
  } catch (error) {
    console.log('❌ 正常数组测试失败:', error.response?.data?.message || error.message)
  }
  console.log('')

  // 4. 测试未提供confirmedNouns
  console.log('4️⃣ 测试未提供confirmedNouns场景...')
  try {
    const noArrayResponse = await axios.post(`${BASE_URL}/api/confirm-nouns`, {
      sessionId: sessionId
      // 不提供confirmedNouns
    })
    console.log('✅ 未提供数组测试通过')
    console.log('   响应:', noArrayResponse.data.message.substring(0, 50) + '...')
  } catch (error) {
    console.log('❌ 未提供数组测试失败:', error.response?.data?.message || error.message)
  }
  console.log('')

  console.log('🎉 所有测试完成！')
}

// 运行测试
testConfirmNouns().catch(error => {
  console.error('❌ 测试执行失败:', error.message)
  if (error.response) {
    console.error('   状态码:', error.response.status)
    console.error('   错误信息:', error.response.data)
  }
  process.exit(1)
})

