<template>
  <div class="dify-translator">
    <!-- 页面头部 -->
    <div class="header">
      <div class="header-content">
        <div class="header-text">
          <h1>Dify翻译工作流</h1>
          <p class="subtitle">专业的技术文档翻译解决方案</p>
        </div>
        <div class="header-actions">
          <el-button type="primary" icon="Refresh" @click="resetAll">
            重置会话
          </el-button>
        </div>
      </div>
    </div>

    <!-- 语言选择 -->
    <div class="language-section">
      <el-card class="language-card">
        <div class="language-inputs">
          <el-select v-model="languageFrom" class="language-select">
            <el-option label="中文" value="ZH"></el-option>
          </el-select>
          <el-icon style="font-size: 24px; color: #666;">
            <Switch />
          </el-icon>
          <el-select v-model="languageTo" class="language-select">
            <el-option label="英文" value="EN-US"></el-option>
            <el-option label="日文" value="JA"></el-option>
          </el-select>
        </div>
        <div class="simulation-option">
          <el-checkbox v-model="useSimulation" size="large">
            使用模拟数据（不调用真实API）
          </el-checkbox>
        </div>
      </el-card>
    </div>

    <!-- 文件上传 -->
    <div class="file-upload-section">
      <el-card class="input-card">
        <template #header>
          <div class="card-header">
            <el-icon><UploadFilled /></el-icon>
            <span>文件上传</span>
          </div>
        </template>
        <div class="upload-container">
          <el-upload
            :before-upload="beforeFileUpload"
            :on-success="handleFileUploadSuccess"
            :on-error="handleFileUploadError"
            :file-list="fileList"
            :auto-upload="true"
            :show-file-list="false"
            :http-request="customUpload"
            class="upload-demo"
          >
            <el-button type="primary" icon="Document">选择文件</el-button>
            <div class="el-upload__tip">
              支持 txt, doc, docx, pdf, jpg, jpeg, png, ppt, pptx 格式，文件大小不超过 10MB
            </div>
          </el-upload>
          
          <!-- 上传文件信息 -->
          <div v-if="uploadedFile" class="uploaded-file-info">
            <el-alert
              title="文件上传成功"
              type="success"
              :closable="false"
              show-icon
            >
              <div>
                <strong>文件名：</strong>{{ uploadedFile.name }}<br>
                <strong>大小：</strong>{{ formatFileSize(uploadedFile.size) }}
                <el-button
                  type="danger"
                  size="small"
                  style="margin-left: 10px;"
                  @click="clearUploadedFile"
                >
                  清除
                </el-button>
              </div>
            </el-alert>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 文本输入 -->
    <div class="text-input-section">
      <el-card class="input-card">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>输入文本</span>
          </div>
        </template>
        <div class="input-section">
          <el-input
            v-model="inputText"
            type="textarea"
            :rows="10"
            placeholder="请输入或粘贴需要翻译的文本..."
            class="text-input"
          ></el-input>
          <div class="input-actions">
            <el-button
              type="primary"
              :loading="loading.submit"
              @click="submitText"
              :disabled="!inputText.trim()"
            >
              提交分析
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 分析结果 -->
    <div v-if="analysisResult" class="analysis-section">
      <el-card class="analysis-card">
        <template #header>
          <div class="card-header">
            <el-icon><ChatDotRound /></el-icon>
            <span>文档分析结果</span>
          </div>
        </template>
        <div class="analysis-content">
          <!-- 文档信息 -->
          <div class="document-info">
            <h4>文档基本信息</h4>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">所属领域：</span>
                <span class="value">{{ analysisResult.documentInfo.domain }}</span>
              </div>
              <div class="info-item">
                <span class="label">文体风格：</span>
                <span class="value">{{ analysisResult.documentInfo.style }}</span>
              </div>
              <div class="info-item">
                <span class="label">翻译用途：</span>
                <span class="value">{{ analysisResult.documentInfo.purpose }}</span>
              </div>
            </div>
          </div>

          <!-- 内容结构 -->
          <div class="content-structure">
            <h4>内容结构概览</h4>
            <p>{{ analysisResult.contentStructure }}</p>
          </div>

          <!-- 术语部分 -->
          <div class="terms-section">
            <h4>术语分类整理</h4>
            
            <!-- 已有术语 -->
            <div class="existing-terms">
              <h5>1. 数据库中已有翻译（待确认）</h5>
              <el-table :data="existingTerms" border style="width: 100%; margin-bottom: 20px;">
                <el-table-column prop="original" label="中文术语" width="150"></el-table-column>
                <el-table-column label="翻译" width="200">
                  <template #default="scope">
                    <el-input 
                      v-model="scope.row.translation" 
                      size="small"
                      placeholder="输入您希望的翻译"
                    ></el-input>
                  </template>
                </el-table-column>
                <el-table-column prop="suggestion" label="是否建议沿用" width="120"></el-table-column>
                <el-table-column prop="remark" label="备注"></el-table-column>
                <el-table-column label="确认" width="80">
                  <template #default="scope">
                    <el-checkbox v-model="scope.row.confirmed"></el-checkbox>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 新术语 -->
            <div class="new-terms">
              <h5>2. 新术语（建议翻译，待确认）</h5>
              <el-table :data="newTerms" border style="width: 100%; margin-bottom: 20px;">
                <el-table-column prop="original" label="中文术语" width="150"></el-table-column>
                <el-table-column label="翻译" width="200">
                  <template #default="scope">
                    <el-input 
                      v-model="scope.row.translation" 
                      size="small"
                      placeholder="输入您希望的翻译"
                    ></el-input>
                  </template>
                </el-table-column>
                <el-table-column prop="reason" label="建议理由"></el-table-column>
                <el-table-column label="确认" width="80">
                  <template #default="scope">
                    <el-checkbox v-model="scope.row.confirmed"></el-checkbox>
                  </template>
                </el-table-column>
              </el-table>
            </div>

            <!-- 确认文案 -->
            <div class="confirmation-text">
              <h4>3. 给客户的确认文案</h4>
              <div class="confirmation-content">
                <div class="confirmation-text-wrapper">
                  <div class="confirmation-icon">
                    <el-icon><ChatDotRound /></el-icon>
                  </div>
                  <div class="confirmation-text-content">
                    <h5 class="confirmation-title">确认提示</h5>
                    <div class="confirmation-message">
                      {{ analysisResult.confirmationText }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- 翻译策略 -->
            <div class="translation-strategy">
              <h4>4. 翻译策略建议</h4>
              <p>{{ analysisResult.translationStrategy }}</p>
            </div>

            <!-- 确认按钮 -->
            <div class="confirmation-actions">
              <el-button
                type="primary"
                :loading="loading.confirm"
                @click="confirmAllTerms"
              >
                确认所有术语
              </el-button>
              <el-button
                type="success"
                :loading="loading.confirm"
                @click="confirmSelectedTerms"
              >
                只确认选中术语
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 术语确认结果 -->
    <div v-if="confirmationResult" class="confirmation-section">
      <el-card class="confirmation-card">
        <template #header>
          <div class="card-header">
            <el-icon><ChatDotRound /></el-icon>
            <span>术语确认结果</span>
          </div>
        </template>
        <div class="confirmation-result">
          <div class="success-message">
            ✅ {{ confirmationResult.message }}
          </div>
          <div class="prompt-message">
            {{ confirmationResult.prompt }}
          </div>
          <div class="translation-input">
            <el-input
              v-model="translationCommand"
              placeholder="请输入'开始翻译'以开始翻译流程"
              class="command-input"
            ></el-input>
            <el-button
              type="primary"
              :loading="loading.translate"
              @click="startTranslation"
              :disabled="translationCommand.trim() !== '开始翻译'"
            >
              执行翻译
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 翻译结果 -->
    <div v-if="translationResult" class="translation-section">
      <el-card class="translation-card">
        <template #header>
          <div class="card-header">
            <el-icon><Document /></el-icon>
            <span>翻译结果</span>
          </div>
        </template>
        <div class="translation-content">
          <div class="translation-text">
            {{ translationResult.translatedText }}
          </div>
          <div class="translation-info">
            <p>翻译完成时间：{{ formatDate(translationResult.translationTime) }}</p>
            <p v-if="translationResult.usage">
              总令牌数：{{ translationResult.usage.total_tokens }} | 
              提示令牌：{{ translationResult.usage.prompt_tokens }} | 
              完成令牌：{{ translationResult.usage.completion_tokens }}
            </p>
          </div>
          <div class="translation-actions">
            <el-button type="primary" icon="DocumentCopy" @click="copyTranslation">
              复制译文
            </el-button>
            <el-button type="success" icon="Download" @click="downloadTranslation('txt')">
              下载 TXT
            </el-button>
            <el-button type="warning" icon="Download" @click="downloadTranslation('docx')">
              下载 Word
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 错误信息 -->
    <div v-if="errorMessage" class="error-section">
      <el-alert
        :title="errorMessage"
        type="error"
        :closable="true"
        show-icon
        @close="errorMessage = ''"
      ></el-alert>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, UploadFilled, Document, ChatDotRound, Switch, Download, DocumentCopy } from '@element-plus/icons-vue'
import { 
  submitTextAPI, 
  confirmNounsAPI, 
  startTranslationAPI, 
  uploadFileAPI 
} from '../api/translate.js'

// 响应式数据
const languageFrom = ref('ZH')
const languageTo = ref('EN-US')
const inputText = ref('')
const analysisResult = ref(null)
const confirmationResult = ref(null)
const translationResult = ref(null)
const errorMessage = ref('')
const translationCommand = ref('')
const uploadedFile = ref(null)
const fileList = ref([])
// 模拟数据选项
const useSimulation = ref(false)
// 可编辑的术语列表
const editableExistingTerms = ref([])
const editableNewTerms = ref([])

// 加载状态
const loading = reactive({
  submit: false,
  confirm: false,
  translate: false,
  upload: false
})

// 计算属性
const existingTerms = computed(() => editableExistingTerms.value)

const newTerms = computed(() => editableNewTerms.value)

const hasActiveSession = computed(() => {
  return !!(analysisResult.value || confirmationResult.value || translationResult.value)
})

// 初始化可编辑术语列表
const initializeEditableTerms = () => {
  const existing = analysisResult.value?.existingTerms || []
  const newT = analysisResult.value?.newTerms || []
  
  // 已有术语默认全部选中
  editableExistingTerms.value = existing.map(term => ({
    ...term,
    confirmed: term.confirmed !== undefined ? term.confirmed : true
  }))
  
  // 新术语默认不选中
  editableNewTerms.value = newT.map(term => ({
    ...term,
    confirmed: term.confirmed !== undefined ? term.confirmed : false
  }))
}

// API调用函数
const submitText = async () => {
  loading.submit = true
  errorMessage.value = ''
  
  try {
    if (useSimulation.value) {
      // 使用模拟数据，不调用真实API
      console.log('📤 使用模拟数据进行文档分析')
      
      // 生成模拟分析结果
      const simulationData = {
        sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        documentInfo: {
          domain: '机器人导航与地图构建技术',
          style: '技术说明文档',
          purpose: '国际技术文档发布'
        },
        contentStructure: inputText.value.includes('地图质量确认') ? 
          '地图质量确认文档：包含地图重影、虚影和玻璃场景的处理说明' : 
          '技术文档：包含多个技术问题的描述和解决方案',
        properNouns: [
          { original: '重影', translation: 'Ghosting', fromDatabase: false, confirmed: false },
          { original: '虚影', translation: 'Phantom', fromDatabase: false, confirmed: false },
          { original: '定位得分', translation: 'Localization Score', fromDatabase: false, confirmed: false },
          { original: '扩建功能', translation: 'Expansion Function', fromDatabase: false, confirmed: false },
          { original: '点云数据', translation: 'Point Cloud Data', fromDatabase: false, confirmed: false },
          { original: '定位丢失', translation: 'Localization Loss', fromDatabase: false, confirmed: false },
          { original: '运行停止', translation: 'Operation Halt', fromDatabase: false, confirmed: false },
          { original: '乱走', translation: 'Erratic Movement', fromDatabase: false, confirmed: false },
          { original: '禁区', translation: 'Forbidden Zone', fromDatabase: false, confirmed: false }
        ].filter(noun => inputText.value.includes(noun.original)),
        confirmationText: '请确认以下术语的译法',
        translationStrategy: '保持技术文档的专业性和准确性，使用简洁明了的表达方式',
        existingTerms: [],
        newTerms: [
          { original: '重影', translation: 'Ghosting', reason: '新术语建议翻译', confirmed: false },
          { original: '虚影', translation: 'Phantom', reason: '新术语建议翻译', confirmed: false },
          { original: '定位得分', translation: 'Localization Score', reason: '新术语建议翻译', confirmed: false },
          { original: '扩建功能', translation: 'Expansion Function', reason: '新术语建议翻译', confirmed: false },
          { original: '点云数据', translation: 'Point Cloud Data', reason: '新术语建议翻译', confirmed: false },
          { original: '定位丢失', translation: 'Localization Loss', reason: '新术语建议翻译', confirmed: false },
          { original: '运行停止', translation: 'Operation Halt', reason: '新术语建议翻译', confirmed: false },
          { original: '乱走', translation: 'Erratic Movement', reason: '新术语建议翻译', confirmed: false },
          { original: '禁区', translation: 'Forbidden Zone', reason: '新术语建议翻译', confirmed: false }
        ].filter(noun => inputText.value.includes(noun.original))
      }
      
      analysisResult.value = simulationData
      initializeEditableTerms() // 初始化可编辑术语
      ElMessage.success('文档分析完成！（使用模拟数据）')
    } else {
      // 调用真实API
      const data = await submitTextAPI(inputText.value.trim(), null, languageFrom.value, languageTo.value)
      analysisResult.value = data
      initializeEditableTerms() // 初始化可编辑术语
      ElMessage.success('文档分析完成！')
    }
  } catch (error) {
    errorMessage.value = error.message
    ElMessage.error(errorMessage.value)
  } finally {
    loading.submit = false
  }
}

const confirmAllTerms = async () => {
  await confirmTerms('all')
}

const confirmSelectedTerms = async () => {
  await confirmTerms('selected')
}

const confirmTerms = async (type) => {
  loading.confirm = true
  errorMessage.value = ''
  
  try {
    const confirmedNouns = []
    
    // 获取确认的已有术语（检查 confirmed 状态）
    existingTerms.value.forEach(term => {
      if (type === 'all' || term.confirmed) {
        confirmedNouns.push({
          original: term.original,
          translation: term.translation,
          confirmed: true,
          fromDatabase: true
        })
      }
    })
    
    // 获取确认的新术语
    newTerms.value.forEach(term => {
      if (type === 'all' || term.confirmed) {
        confirmedNouns.push({
          original: term.original,
          translation: term.translation,
          confirmed: true,
          fromDatabase: false
        })
      }
    })
    
    console.log('📝 确认的术语:', confirmedNouns)
    
    const data = await confirmNounsAPI(analysisResult.value.sessionId, confirmedNouns)
    confirmationResult.value = data
    confirmationResult.value.sessionId = analysisResult.value.sessionId // 保存sessionId
    ElMessage.success('术语确认成功！')
  } catch (error) {
    errorMessage.value = error.message
    ElMessage.error(errorMessage.value)
  } finally {
    loading.confirm = false
  }
}

const startTranslation = async () => {
  loading.translate = true
  errorMessage.value = ''
  
  try {
    const data = await startTranslationAPI(confirmationResult.value.sessionId)
    translationResult.value = data
    ElMessage.success('翻译完成！')
  } catch (error) {
    errorMessage.value = error.message
    ElMessage.error(errorMessage.value)
  } finally {
    loading.translate = false
  }
}

// 辅助函数
const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleString('zh-CN')
}

// 重置功能
const resetAll = () => {
  // 重置所有数据
  analysisResult.value = null
  confirmationResult.value = null
  translationResult.value = null
  translationCommand.value = ''
  errorMessage.value = ''
  uploadedFile.value = null
  inputText.value = ''
  
  // 重置加载状态
  loading.submit = false
  loading.confirm = false
  loading.translate = false
  loading.upload = false
  
  ElMessage.success('会话已重置，可以开始新的翻译工作！')
}

// 文件上传相关功能
const beforeFileUpload = (file) => {
  // 获取文件扩展名
  const fileExt = file.name.split('.').pop().toLowerCase()
  
  // 允许的文件扩展名
  const allowedExts = ['txt', 'doc', 'docx', 'pdf', 'jpg', 'jpeg', 'png', 'ppt', 'pptx']
  
  // 允许的MIME类型
  const allowedTypes = [
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
  
  const isAllowedType = allowedTypes.includes(file.type) || allowedExts.includes(fileExt)
  const isLt10M = file.size / 1024 / 1024 < 10

  if (!isAllowedType) {
    ElMessage.error('只能上传 txt, doc, docx, pdf, jpg, jpeg, png, ppt, pptx 格式的文件!')
    return false
  }
  if (!isLt10M) {
    ElMessage.error('文件大小不能超过 10MB!')
    return false
  }
  
  loading.upload = true
  return true
}

const handleFileUploadSuccess = async (response, file) => {
  console.log('📥 收到文件上传响应:', response)
  loading.upload = false
  
  try {
    // 检查response是否存在
    if (!response) {
      ElMessage.error('文件上传失败: 服务器返回空响应')
      return
    }
    
    // 检查response格式
    if (response.success) {
      const extractedText = response.originalText || response.extractedText || ''
      
      // 检查是否有有效的提取文本（排除占位符文本）
      const isPlaceholder = extractedText.includes('[PDF文件无') || 
                           extractedText.includes('[图片无') ||
                           extractedText.trim().length === 0
      
      uploadedFile.value = {
        name: response.fileName || file.name,
        size: file.size,
        type: file.type,
        extractedText: extractedText
      }
      
      // 自动填充到输入框
      inputText.value = isPlaceholder ? '' : extractedText
      
      if (isPlaceholder) {
        ElMessage.warning('文件上传成功，但未能识别到文本内容。请尝试其他格式或检查文件。')
      } else {
        ElMessage.success('文件上传成功! 文本内容已自动提取')
      }
    } else {
      ElMessage.error('文件处理失败: ' + (response.error || response.message || '未知错误'))
    }
  } catch (error) {
    console.error('❌ 处理文件上传响应时出错:', error)
    ElMessage.error('文件上传失败: ' + (error.message || '处理响应时出错'))
  }
}

const handleFileUploadError = (error) => {
  loading.upload = false
  ElMessage.error(`文件上传失败: ${error.message}`)
}

// 自定义文件上传函数
const customUpload = async (options) => {
  loading.upload = true
  try {
    console.log('📤 开始上传文件:', options.file.name)
    const response = await uploadFileAPI(options.file)
    console.log('📥 上传成功，响应:', response)
    options.onSuccess(response, options.file)
  } catch (error) {
    console.error('❌ 上传失败:', error)
    // 确保onError接收一个包含message属性的对象
    options.onError({
      message: error.message || '文件上传失败'
    })
  } finally {
    loading.upload = false
  }
}

const clearUploadedFile = () => {
  uploadedFile.value = null
  inputText.value = ''
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 复制翻译结果到剪贴板
const copyTranslation = async () => {
  if (!translationResult.value?.translatedText) {
    ElMessage.warning('没有可复制的内容')
    return
  }
  
  try {
    await navigator.clipboard.writeText(translationResult.value.translatedText)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    // 降级方案：使用传统方式复制
    const textarea = document.createElement('textarea')
    textarea.value = translationResult.value.translatedText
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('已复制到剪贴板')
  }
}

// 下载翻译结果为文件
const downloadTranslation = async (format) => {
  if (!translationResult.value?.translatedText) {
    ElMessage.warning('没有可下载的内容')
    return
  }
  
  const text = translationResult.value.translatedText
  const timestamp = new Date().toISOString().slice(0, 10)
  
  if (format === 'txt') {
    // 下载为 TXT 文件
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `翻译结果_${timestamp}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success('TXT 文件下载成功')
  } else if (format === 'docx') {
    // 下载为 Word 文档（简易 HTML 格式，Word 可打开）
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" 
            xmlns:w="urn:schemas-microsoft-com:office:word">
      <head>
        <meta charset="utf-8">
        <title>翻译结果</title>
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; font-size: 12pt; line-height: 1.6; }
          p { margin: 0 0 10pt 0; }
        </style>
      </head>
      <body>
        <h2>翻译结果</h2>
        <p>翻译时间：${formatDate(translationResult.value.translationTime)}</p>
        <hr>
        ${text.split('\n').map(line => `<p>${line || '&nbsp;'}</p>`).join('')}
      </body>
      </html>
    `
    const blob = new Blob([htmlContent], { type: 'application/msword' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `翻译结果_${timestamp}.doc`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    ElMessage.success('Word 文件下载成功')
  }
}
</script>

<style scoped>
.dify-translator {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.header {
  margin-bottom: 30px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 20px;
}

.header-text {
  flex: 1;
  min-width: 300px;
}

.header-actions {
  flex-shrink: 0;
}

.header h1 {
  margin: 0 0 10px 0;
  font-size: 2.5rem;
  font-weight: 600;
  color: white;
}

.header .subtitle {
  margin: 0;
  opacity: 0.9;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.8);
}

/* 文件上传样式 */
.file-upload-section {
  margin-bottom: 20px;
}

.uploaded-file-info {
  margin-top: 10px;
  text-align: center;
}

.text-input-section {
  margin-top: 20px;
}

.language-section {
  margin-bottom: 20px;
}

.language-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.language-inputs {
  display: flex;
  align-items: center;
  gap: 20px;
  justify-content: center;
}

.language-select {
  width: 200px;
}

.input-section {
  margin-bottom: 20px;
}

.input-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.text-input {
  margin-bottom: 15px;
}

.input-actions {
  text-align: center;
}

.analysis-section,
.confirmation-section,
.translation-section {
  margin-bottom: 20px;
}

.analysis-card,
.confirmation-card,
.translation-card {
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.analysis-content {
  padding: 20px 0;
}

.document-info,
.content-structure,
.terms-section,
.confirmation-text,
.translation-strategy {
  margin-bottom: 30px;
}

.document-info h4,
.content-structure h4,
.terms-section h4,
.confirmation-text h4,
.translation-strategy h4 {
  color: #2c3e50;
  margin-bottom: 15px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9ecef;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
}

.info-item {
  display: flex;
  align-items: center;
}

.label {
  font-weight: 600;
  color: #495057;
  margin-right: 8px;
}

.value {
  color: #6c757d;
}

.existing-terms,
.new-terms {
  margin-bottom: 20px;
}

.existing-terms h5,
.new-terms h5 {
  color: #495057;
  margin-bottom: 10px;
}

.confirmation-content {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid #e3e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.confirmation-text-wrapper {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.confirmation-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.confirmation-text-content {
  flex: 1;
}

.confirmation-title {
  font-size: 16px;
  font-weight: 600;
  color: #2c3e50;
  margin: 0 0 8px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9ecef;
}

.confirmation-message {
  font-size: 14px;
  line-height: 1.6;
  color: #495057;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.confirmation-actions {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 20px;
}

.confirmation-result {
  padding: 20px 0;
}

.success-message {
  color: #28a745;
  font-weight: 600;
  margin-bottom: 10px;
}

.prompt-message {
  color: #6c757d;
  margin-bottom: 20px;
}

.translation-input {
  display: flex;
  gap: 10px;
  align-items: center;
}

.command-input {
  flex: 1;
}

.translation-content {
  padding: 20px 0;
}

.translation-text {
  background-color: #f8f9fa;
  padding: 20px;
  border-radius: 6px;
  border: 1px solid #e9ecef;
  white-space: pre-wrap;
  word-wrap: break-word;
  font-family: 'Courier New', monospace;
  line-height: 1.6;
}

.translation-info {
  margin-top: 20px;
  padding: 15px;
  background-color: #e9ecef;
  border-radius: 6px;
}

.translation-actions {
  margin-top: 20px;
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.error-section {
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .dify-translator {
    padding: 10px;
  }
  
  .header h1 {
    font-size: 2rem;
  }
  
  .language-inputs {
    flex-direction: column;
    gap: 10px;
  }
  
  .language-select {
    width: 100%;
  }
  
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .confirmation-actions {
    flex-direction: column;
  }
  
  .translation-input {
    flex-direction: column;
  }
}
</style>