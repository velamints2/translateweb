<template>
  <div class="report-container">
    <h1 class="report-title">📊 错误日志报告</h1>
    
    <!-- 报告概览 -->
    <el-card class="overview-card">
      <div class="overview-content">
        <div class="overview-item">
          <div class="overview-number">{{ totalErrors }}</div>
          <div class="overview-label">总错误数</div>
        </div>
        <div class="overview-item">
          <div class="overview-number">{{ todayErrors }}</div>
          <div class="overview-label">今日错误</div>
        </div>
        <div class="overview-item">
          <div class="overview-number">{{ uniqueErrors }}</div>
          <div class="overview-label">唯一错误</div>
        </div>
        <div class="overview-item">
          <div class="overview-number">{{ errorRate }}%</div>
          <div class="overview-label">错误率</div>
        </div>
      </div>
    </el-card>
    
    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="search-section">
        <el-input
          v-model="searchQuery"
          placeholder="搜索错误信息..."
          clearable
          size="large"
          class="search-input"
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="filter-section">
        <el-select
          v-model="filterOption"
          placeholder="筛选选项"
          size="large"
          class="filter-select"
        >
          <el-option label="全部错误" value="all"></el-option>
          <el-option label="今日错误" value="today"></el-option>
          <el-option label="最近24小时" value="24h"></el-option>
          <el-option label="最近7天" value="7d"></el-option>
        </el-select>
        <el-button
          type="danger"
          size="large"
          @click="clearErrors"
          :loading="loading.clear"
        >
          <el-icon><Delete /></el-icon>
          清空错误日志
        </el-button>
        <el-button
          type="primary"
          size="large"
          @click="refreshErrors"
          :loading="loading.refresh"
        >
          <el-icon><Refresh /></el-icon>
          刷新数据
        </el-button>
      </div>
    </div>
    
    <!-- 错误日志列表 -->
    <el-card class="errors-card">
      <template #header>
        <div class="card-header">
          <el-icon><Warning /></el-icon>
          <span>错误日志详情</span>
        </div>
      </template>
      
      <div v-if="loading.fetch" class="loading-container">
        <el-skeleton :rows="10" animated />
      </div>
      
      <div v-else-if="errors.length === 0" class="empty-container">
        <el-result
          icon="success"
          title="暂无错误日志"
          sub-title="系统运行正常，没有错误记录"
        />
      </div>
      
      <div v-else class="errors-list">
        <el-collapse v-model="activeNames" accordion>
          <el-collapse-item
            v-for="(error, index) in filteredErrors"
            :key="index"
            :title="getErrorTitle(error)"
            :name="index.toString()"
            class="error-item"
          >
            <div class="error-detail">
              <div class="error-header">
                <div class="error-time">{{ formatTime(error.timestamp) }}</div>
                <el-tag type="danger" size="small">ERROR</el-tag>
              </div>
              
              <div class="error-message">
                <h4>错误信息</h4>
                <pre>{{ error.message }}</pre>
              </div>
              
              <div v-if="error.stack" class="error-stack">
                <h4>堆栈信息</h4>
                <pre class="stack-trace">{{ error.stack }}</pre>
              </div>
              
              <div v-if="error.service" class="error-service">
                <h4>服务信息</h4>
                <p>{{ error.service }}</p>
              </div>
              
              <div v-if="error.meta" class="error-meta">
                <h4>元数据</h4>
                <pre>{{ JSON.stringify(error.meta, null, 2) }}</pre>
              </div>
              
              <div class="error-actions">
                <el-button
                  size="small"
                  @click="copyError(error)"
                  :icon="DocumentCopy"
                >
                  复制错误
                </el-button>
                <el-button
                  size="small"
                  @click="copyStack(error)"
                  :icon="DocumentCopy"
                  v-if="error.stack"
                >
                  复制堆栈
                </el-button>
              </div>
            </div>
          </el-collapse-item>
        </el-collapse>
      </div>
      
      <!-- 分页 -->
      <div v-if="errors.length > 0" class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredErrors.length"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
    
    <!-- 导出按钮 -->
    <div class="export-section">
      <el-button
        type="success"
        size="large"
        @click="exportReport"
        :loading="loading.export"
      >
        <el-icon><Download /></el-icon>
        导出报告
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Search, Warning, Refresh, Delete, DocumentCopy, Download 
} from '@element-plus/icons-vue'
import axios from 'axios'

// 响应式数据
const errors = ref([])
const activeNames = ref([])
const searchQuery = ref('')
const filterOption = ref('all')
const currentPage = ref(1)
const pageSize = ref(20)

// 加载状态
const loading = ref({
  fetch: false,
  refresh: false,
  clear: false,
  export: false
})

// 计算属性
const totalErrors = computed(() => errors.value.length)

const todayErrors = computed(() => {
  const today = new Date().toDateString()
  return errors.value.filter(error => {
    const errorDate = new Date(error.timestamp).toDateString()
    return errorDate === today
  }).length
})

const uniqueErrors = computed(() => {
  const uniqueMessages = new Set(errors.value.map(error => error.message))
  return uniqueMessages.size
})

const errorRate = computed(() => {
  // 这里可以根据实际情况计算错误率
  // 暂时返回模拟数据
  return (totalErrors.value / 1000 * 100).toFixed(2)
})

const filteredErrors = computed(() => {
  let result = [...errors.value]
  
  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(error => {
      return (
        error.message.toLowerCase().includes(query) ||
        (error.stack && error.stack.toLowerCase().includes(query)) ||
        (error.service && error.service.toLowerCase().includes(query))
      )
    })
  }
  
  // 时间过滤
  const now = new Date()
  switch (filterOption.value) {
    case 'today':
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      result = result.filter(error => new Date(error.timestamp) >= today)
      break
    case '24h':
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      result = result.filter(error => new Date(error.timestamp) >= last24h)
      break
    case '7d':
      const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      result = result.filter(error => new Date(error.timestamp) >= last7d)
      break
  }
  
  return result
})

// 分页数据
const paginatedErrors = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredErrors.value.slice(start, end)
})

// 方法定义
const fetchErrors = async () => {
  loading.value.fetch = true
  try {
    const response = await axios.get('/api/report/errors')
    if (response.data.success) {
      errors.value = response.data.errors
      ElMessage.success('错误日志加载成功')
    } else {
      ElMessage.error('错误日志加载失败: ' + (response.data.message || '未知错误'))
    }
  } catch (error) {
    console.error('获取错误日志失败:', error)
    ElMessage.error('获取错误日志失败: ' + error.message)
  } finally {
    loading.value.fetch = false
  }
}

const refreshErrors = async () => {
  loading.value.refresh = true
  await fetchErrors()
  loading.value.refresh = false
}

const clearErrors = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空所有错误日志吗？此操作不可恢复。',
      '警告',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    loading.value.clear = true
    const response = await axios.delete('/api/report/errors/clear')
    if (response.data.success) {
      errors.value = []
      ElMessage.success('错误日志已清空')
    } else {
      ElMessage.error('清空错误日志失败: ' + (response.data.message || '未知错误'))
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('清空错误日志失败:', error)
      ElMessage.error('清空错误日志失败: ' + error.message)
    }
  } finally {
    loading.value.clear = false
  }
}

const exportReport = async () => {
  loading.value.export = true
  try {
    const reportData = {
      errors: errors.value,
      exportTime: new Date().toISOString(),
      summary: {
        totalErrors: totalErrors.value,
        todayErrors: todayErrors.value,
        uniqueErrors: uniqueErrors.value,
        errorRate: errorRate.value
      }
    }
    
    const jsonString = JSON.stringify(reportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `error_report_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    ElMessage.success('报告导出成功')
  } catch (error) {
    console.error('导出报告失败:', error)
    ElMessage.error('导出报告失败: ' + error.message)
  } finally {
    loading.value.export = false
  }
}

const copyError = async (error) => {
  try {
    const errorText = `错误时间: ${error.timestamp}\n错误信息: ${error.message}\n服务: ${error.service || '未知'}`
    await navigator.clipboard.writeText(errorText)
    ElMessage.success('错误信息已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败: ' + error.message)
  }
}

const copyStack = async (error) => {
  try {
    await navigator.clipboard.writeText(error.stack)
    ElMessage.success('堆栈信息已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败: ' + error.message)
  }
}

const getErrorTitle = (error) => {
  const time = formatTime(error.timestamp)
  const message = error.message.length > 50 ? error.message.slice(0, 50) + '...' : error.message
  return `${time} - ${message}`
}

const formatTime = (timestamp) => {
  if (!timestamp) return 'N/A'
  return new Date(timestamp).toLocaleString('zh-CN')
}

const handleSizeChange = (size) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (current) => {
  currentPage.value = current
}

// 生命周期钩子
onMounted(() => {
  fetchErrors()
})
</script>

<style scoped>
.report-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.report-title {
  text-align: center;
  color: #2c3e50;
  margin-bottom: 30px;
  font-size: 2rem;
  font-weight: 600;
}

.overview-card {
  margin-bottom: 20px;
}

.overview-content {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  text-align: center;
}

.overview-item {
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 12px;
  transition: transform 0.3s ease;
}

.overview-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.overview-number {
  font-size: 2.5rem;
  font-weight: 700;
  color: #e74c3c;
  margin-bottom: 8px;
}

.overview-label {
  font-size: 1rem;
  color: #6c757d;
  font-weight: 500;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 20px;
  flex-wrap: wrap;
}

.search-section {
  flex: 1;
  min-width: 300px;
}

.search-input {
  width: 100%;
}

.filter-section {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
}

.filter-select {
  min-width: 150px;
}

.errors-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 1.2rem;
}

.loading-container {
  padding: 20px 0;
}

.empty-container {
  text-align: center;
  padding: 40px 0;
}

.errors-list {
  space-y: 10px;
}

.error-item {
  margin-bottom: 10px;
  border: 1px solid #e3e8f0;
  border-radius: 8px;
  overflow: hidden;
}

.error-item :deep(.el-collapse-item__header) {
  background-color: #f8f9fa;
  border-bottom: 1px solid #e3e8f0;
  padding: 16px 20px;
  font-weight: 500;
  color: #2c3e50;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.error-item :deep(.el-collapse-item__header:hover) {
  background-color: #e9ecef;
}

.error-item :deep(.el-collapse-item__header.is-active) {
  background-color: #ffebee;
  border-bottom-color: #ef5350;
}

.error-item :deep(.el-collapse-item__content) {
  padding: 20px;
  background-color: #fff5f5;
}

.error-detail {
  space-y: 16px;
}

.error-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ef5350;
}

.error-time {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.9rem;
}

.error-message {
  margin-bottom: 16px;
}

.error-message h4,
.error-stack h4,
.error-service h4,
.error-meta h4 {
  margin: 0 0 8px 0;
  color: #ef5350;
  font-size: 1rem;
  font-weight: 600;
}

.error-message pre,
.error-stack pre,
.error-meta pre {
  margin: 0;
  padding: 12px;
  background-color: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  overflow-x: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #2c3e50;
  max-height: 300px;
  overflow-y: auto;
}

.stack-trace {
  background-color: #fafafa;
  border-left: 4px solid #ef5350;
}

.error-service {
  margin-bottom: 16px;
}

.error-service p {
  margin: 0;
  padding: 12px;
  background-color: #fff;
  border: 1px solid #e3e8f0;
  border-radius: 6px;
  color: #2c3e50;
}

.error-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e3e8f0;
}

.pagination-container {
  margin-top: 20px;
  text-align: center;
}

.export-section {
  text-align: center;
  margin-top: 20px;
}

@media (max-width: 768px) {
  .action-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-section {
    min-width: auto;
  }
  
  .filter-section {
    justify-content: center;
  }
  
  .overview-content {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
