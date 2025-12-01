import axios from 'axios'
import fs from 'fs'
import path from 'path'

// 配置测试环境
const API_BASE_URL = 'http://localhost:3001/api'
const TEST_FILE_PATH = './test-document.txt'

async function testFileUpload() {
  try {
    console.log('🚀 开始测试文件上传功能...')
    console.log(`📄 测试文件: ${TEST_FILE_PATH}`)
    
    // 检查测试文件是否存在
    if (!fs.existsSync(TEST_FILE_PATH)) {
      console.error('❌ 测试文件不存在:', TEST_FILE_PATH)
      return
    }
    
    // 读取测试文件
    const fileContent = fs.readFileSync(TEST_FILE_PATH, 'utf8')
    console.log(`📊 文件内容长度: ${fileContent.length} 字符`)
    
    // 创建FormData对象
    const formData = new FormData()
    
    // 创建文件对象
    const file = new File([fileContent], path.basename(TEST_FILE_PATH), {
      type: 'text/plain',
      lastModified: Date.now()
    })
    
    formData.append('file', file)
    
    // 发送文件上传请求
    console.log('📤 发送文件上传请求...')
    const response = await axios.post(`${API_BASE_URL}/upload-file`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30秒超时
    })
    
    console.log('✅ 文件上传成功!')
    console.log('📊 响应数据:', response.data)
    
  } catch (error) {
    console.error('❌ 文件上传失败:', error.message)
    if (error.response) {
      console.error('📋 响应状态:', error.response.status)
      console.error('📋 响应数据:', error.response.data)
    } else if (error.request) {
      console.error('📋 请求信息:', error.request)
    }
  }
}

// 运行测试
testFileUpload().catch(error => {
  console.error('❌ 测试执行失败:', error)
  process.exit(1)
})