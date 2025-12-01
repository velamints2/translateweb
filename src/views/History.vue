<template>
  <div class="history-container">
    <el-card class="history-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <el-icon><Histogram /></el-icon>
          <span>翻译历史</span>
        </div>
      </template>
      
      <!-- 搜索和筛选 -->
      <div class="filter-section">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-input
              v-model="searchText"
              placeholder="搜索原文或译文"
              clearable
              @clear="handleSearch"
              @keyup.enter="handleSearch"
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
          </el-col>
          
          <el-col :span="6">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              @change="handleDateChange"
            />
          </el-col>
          
          <el-col :span="4">
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
          </el-col>
          
          <el-col :span="6" style="text-align: right;">
            <el-button @click="clearHistory" type="danger" plain>
              <el-icon><Delete /></el-icon>
              清空历史
            </el-button>
          </el-col>
        </el-row>
      </div>
      
      <!-- 历史记录列表 -->
      <div class="history-list" v-loading="loading">
        <div v-if="filteredHistory.length === 0" class="empty-state">
          <el-empty description="暂无翻译历史">
            <el-button type="primary" @click="$router.push('/')">
              开始新的翻译
            </el-button>
          </el-empty>
        </div>
        
        <div v-else class="history-items">
          <div 
            v-for="item in filteredHistory" 
            :key="item.id"
            class="history-item"
            :class="{ expanded: expandedItems.includes(item.id) }"
          >
            <div class="item-header" @click="toggleExpand(item.id)">
              <div class="item-info">
                <div class="item-title">
                  <el-tag size="small" :type="getStatusType(item.status)">
                    {{ getStatusText(item.status) }}
                  </el-tag>
                  <span class="text-preview">{{ getTextPreview(item.originalText) }}</span>
                </div>
                <div class="item-meta">
                  <span class="time">{{ formatTime(item.createdAt) }}</span>
                  <span class="nouns-count" v-if="item.confirmedNouns">
                    {{ item.confirmedNouns.length }} 个专有名词
                  </span>
                </div>
              </div>
              
              <div class="item-actions">
                <el-button 
                  size="small" 
                  @click.stop="viewDetails(item)"
                  :icon="View"
                >
                  查看详情
                </el-button>
                <el-button 
                  size="small" 
                  @click.stop="copyTranslation(item)"
                  :icon="DocumentCopy"
                >
                  复制译文
                </el-button>
                <el-icon class="expand-icon">
                  <ArrowDown v-if="!expandedItems.includes(item.id)" />
                  <ArrowUp v-else />
                </el-icon>
              </div>
            </div>
            
            <!-- 展开内容 -->
            <div v-if="expandedItems.includes(item.id)" class="item-details">
              <el-divider />
              
              <div class="text-comparison">
                <div class="text-section">
                  <h4>📄 原文</h4>
                  <div class="text-content">{{ item.originalText }}</div>
                </div>
                
                <div class="text-section" v-if="item.translationResult">
                  <h4>🌍 译文</h4>
                  <div class="text-content">{{ item.translationResult.translatedText }}</div>
                </div>
              </div>
              
              <!-- 专有名词列表 -->
              <div v-if="item.confirmedNouns && item.confirmedNouns.length > 0" class="nouns-section">
                <h4>🔤 确认的专有名词</h4>
                <div class="nouns-grid">
                  <el-tag 
                    v-for="noun in item.confirmedNouns" 
                    :key="noun.original"
                    type="success"
                    effect="light"
                    class="noun-tag"
                  >
                    {{ noun.original }} → {{ noun.translation }}
                  </el-tag>
                </div>
              </div>
              
              <!-- 翻译信息 -->
              <div v-if="item.translationResult" class="translation-info">
                <el-descriptions :column="2" border size="small">
                  <el-descriptions-item label="翻译时间">
                    {{ formatTime(item.translationResult.translationTime) }}
                  </el-descriptions-item>
                  <el-descriptions-item label="Tokens使用" v-if="item.translationResult.usage">
                    {{ item.translationResult.usage.total_tokens }}
                  </el-descriptions-item>
                  <el-descriptions-item label="会话ID">
                    {{ item.id }}
                  </el-descriptions-item>
                </el-descriptions>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 分页 -->
        <div class="pagination-section" v-if="filteredHistory.length > 0">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="filteredHistory.length"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-card>
    
    <!-- 详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      :title="`翻译详情 - ${selectedItem?.id}`"
      width="80%"
      top="5vh"
    >
      <TranslationDetail :item="selectedItem" v-if="selectedItem" />
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Histogram, Search, Delete, View, DocumentCopy,
  ArrowDown, ArrowUp
} from '@element-plus/icons-vue'
import TranslationDetail from '../components/TranslationDetail.vue'

// 响应式数据
const loading = ref(false)
const searchText = ref('')
const dateRange = ref([])
const expandedItems = ref([])
const detailDialogVisible = ref(false)
const selectedItem = ref(null)
const currentPage = ref(1)
const pageSize = ref(10)

// 模拟历史数据（实际项目中应从后端获取）
const mockHistory = ref([
  {
    id: 'session_123456789',
    originalText: 'Apple Inc. announced the new iPhone 15 with advanced AI features. The product launch event was held in Cupertino, California.',
    status: 'translation_completed',
    confirmedNouns: [
      { original: 'Apple Inc.', translation: '苹果公司' },
      { original: 'iPhone 15', translation: 'iPhone 15' },
      { original: 'AI features', translation: '人工智能功能' },
      { original: 'Cupertino', translation: '库比蒂诺' },
      { original: 'California', translation: '加利福尼亚州' }
    ],
    translationResult: {
      translatedText: '苹果公司发布了配备先进人工智能功能的新款iPhone 15。产品发布会在加利福尼亚州的库比蒂诺举行。',
      translationTime: new Date('2024-01-15T10:30:00').toISOString(),
      usage: { total_tokens: 150 }
    },
    createdAt: new Date('2024-01-15T10:00:00').toISOString()
  },
  {
    id: 'session_987654321',
    originalText: 'Microsoft Corporation unveiled its latest Windows 12 operating system with enhanced security features and improved user interface.',
    status: 'nouns_confirmed',
    confirmedNouns: [
      { original: 'Microsoft Corporation', translation: '微软公司' },
      { original: 'Windows 12', translation: 'Windows 12' },
      { original: 'security features', translation: '安全功能' }
    ],
    createdAt: new Date('2024-01-14T15:20:00').toISOString()
  },
  {
    id: 'session_456789123',
    originalText: 'The United Nations Climate Change Conference discussed global warming issues and sustainable development goals.',
    status: 'awaiting_confirmation',
    createdAt: new Date('2024-01-13T09:45:00').toISOString()
  }
])

// 计算属性：过滤后的历史记录
const filteredHistory = computed(() => {
  let filtered = [...mockHistory.value]
  
  // 文本搜索
  if (searchText.value) {
    const query = searchText.value.toLowerCase()
    filtered = filtered.filter(item => 
      item.originalText.toLowerCase().includes(query) ||
      (item.translationResult?.translatedText?.toLowerCase().includes(query))
    )
  }
  
  // 日期筛选
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.createdAt)
      return itemDate >= start && itemDate <= end
    })
  }
  
  // 按时间倒序排序
  filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  
  return filtered
})

// 分页后的数据
const paginatedHistory = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredHistory.value.slice(start, end)
})

// 方法定义
function getStatusType(status) {
  const types = {
    'analyzing': 'info',
    'awaiting_confirmation': 'warning',
    'nouns_confirmed': 'success',
    'translation_completed': 'success'
  }
  return types[status] || 'info'
}

function getStatusText(status) {
  const texts = {
    'analyzing': '分析中',
    'awaiting_confirmation': '待确认',
    'nouns_confirmed': '已确认',
    'translation_completed': '已完成'
  }
  return texts[status] || status
}

function getTextPreview(text, maxLength = 80) {
  if (!text) return '无内容'
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

function toggleExpand(itemId) {
  const index = expandedItems.value.indexOf(itemId)
  if (index > -1) {
    expandedItems.value.splice(index, 1)
  } else {
    expandedItems.value.push(itemId)
  }
}

function viewDetails(item) {
  selectedItem.value = item
  detailDialogVisible.value = true
}

async function copyTranslation(item) {
  if (!item.translationResult?.translatedText) {
    ElMessage.warning('该记录暂无译文')
    return
  }
  
  try {
    await navigator.clipboard.writeText(item.translationResult.translatedText)
    ElMessage.success('译文已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败：' + error.message)
  }
}

function handleSearch() {
  currentPage.value = 1
  // 实际项目中这里应该调用API
}

function handleDateChange() {
  currentPage.value = 1
}

function handleSizeChange(newSize) {
  pageSize.value = newSize
  currentPage.value = 1
}

function handleCurrentChange(newPage) {
  currentPage.value = newPage
}

function clearHistory() {
  ElMessageBox.confirm('确定要清空所有翻译历史吗？此操作不可恢复。', '警告', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning',
    confirmButtonClass: 'el-button--danger'
  }).then(() => {
    mockHistory.value = []
    ElMessage.success('历史记录已清空')
  }).catch(() => {
    // 用户取消操作
  })
}

onMounted(() => {
  // 模拟加载数据
  loading.value = true
  setTimeout(() => {
    loading.value = false
  }, 1000)
})
</script>

<style scoped>
.history-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  min-height: calc(100vh - 124px);
}

.history-card {
  border-radius: 12px;
  border: none;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.filter-section {
  margin-bottom: 20px;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

.history-list {
  min-height: 400px;
}

.empty-state {
  padding: 60px 0;
}

.history-items {
  space-y: 16px;
}

.history-item {
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.history-item:hover {
  border-color: #409EFF;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.history-item.expanded {
  border-color: #409EFF;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  cursor: pointer;
  background: white;
  transition: background-color 0.3s ease;
}

.item-header:hover {
  background: #f5f7fa;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.text-preview {
  font-size: 14px;
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-meta {
  display: flex;
  gap: 20px;
  font-size: 12px;
  color: #909399;
}

.item-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.expand-icon {
  color: #909399;
  transition: transform 0.3s ease;
}

.item-details {
  background: #fafafa;
  padding: 20px;
}

.text-comparison {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.text-section {
  background: white;
  padding: 15px;
  border-radius: 6px;
  border: 1px solid #e8e8e8;
}

.text-section h4 {
  margin-bottom: 10px;
  color: #333;
  font-size: 14px;
}

.text-content {
  line-height: 1.5;
  max-height: 200px;
  overflow-y: auto;
  font-size: 13px;
  color: #666;
}

.nouns-section {
  margin-bottom: 20px;
}

.nouns-section h4 {
  margin-bottom: 10px;
  color: #333;
  font-size: 14px;
}

.nouns-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.noun-tag {
  margin-bottom: 4px;
}

.translation-info {
  margin-top: 20px;
}

.pagination-section {
  margin-top: 30px;
  display: flex;
  justify-content: center;
}

@media (max-width: 768px) {
  .history-container {
    padding: 10px;
  }
  
  .filter-section .el-col {
    margin-bottom: 10px;
  }
  
  .item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }
  
  .item-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .text-comparison {
    grid-template-columns: 1fr;
  }
  
  .item-meta {
    flex-direction: column;
    gap: 5px;
  }
}
</style>