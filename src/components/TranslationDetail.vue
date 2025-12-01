<template>
  <div class="translation-detail">
    <!-- 基本信息 -->
    <el-descriptions title="基本信息" :column="2" border>
      <el-descriptions-item label="会话ID">
        {{ item.id }}
      </el-descriptions-item>
      <el-descriptions-item label="创建时间">
        {{ formatTime(item.createdAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="状态">
        <el-tag :type="getStatusType(item.status)">
          {{ getStatusText(item.status) }}
        </el-tag>
      </el-descriptions-item>
      <el-descriptions-item label="确认专有名词" v-if="item.confirmedNouns">
        {{ item.confirmedNouns.length }} 个
      </el-descriptions-item>
      <el-descriptions-item label="翻译时间" v-if="item.translationResult">
        {{ formatTime(item.translationResult.translationTime) }}
      </el-descriptions-item>
      <el-descriptions-item label="Tokens使用" v-if="item.translationResult?.usage">
        {{ item.translationResult.usage.total_tokens }}
      </el-descriptions-item>
    </el-descriptions>

    <!-- 原文和译文对比 -->
    <div class="text-comparison-section">
      <h3>📄 原文</h3>
      <el-card class="text-card">
        <div class="text-content">{{ item.originalText }}</div>
        <div class="text-actions">
          <el-button size="small" @click="copyText(item.originalText)">
            <el-icon><DocumentCopy /></el-icon>
            复制原文
          </el-button>
          <el-button size="small" @click="downloadText(item.originalText, 'original.txt')">
            <el-icon><Download /></el-icon>
            下载原文
          </el-button>
        </div>
      </el-card>

      <h3 v-if="item.translationResult">🌍 译文</h3>
      <el-card v-if="item.translationResult" class="text-card">
        <div class="text-content">{{ item.translationResult.translatedText }}</div>
        <div class="text-actions">
          <el-button size="small" @click="copyText(item.translationResult.translatedText)">
            <el-icon><DocumentCopy /></el-icon>
            复制译文
          </el-button>
          <el-button size="small" @click="downloadText(item.translationResult.translatedText, 'translation.txt')">
            <el-icon><Download /></el-icon>
            下载译文
          </el-button>
        </div>
      </el-card>

      <div v-else class="no-translation">
        <el-result
          icon="warning"
          title="暂无译文"
          sub-title="该会话尚未完成翻译"
        />
      </div>
    </div>

    <!-- 专有名词列表 -->
    <div v-if="item.confirmedNouns && item.confirmedNouns.length > 0" class="nouns-section">
      <h3>🔤 确认的专有名词</h3>
      <el-table :data="item.confirmedNouns" border stripe>
        <el-table-column prop="original" label="原文" min-width="200" />
        <el-table-column prop="translation" label="译文" min-width="200" />
        <el-table-column label="操作" width="120">
          <template #default="scope">
            <el-button 
              size="small" 
              @click="copyNoun(scope.row)"
              :icon="DocumentCopy"
            >
              复制
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 操作按钮 -->
    <div class="action-buttons">
      <el-button type="primary" @click="reuseTranslation" size="large">
        <el-icon><RefreshRight /></el-icon>
        复用此翻译
      </el-button>
      <el-button @click="exportToJSON" size="large">
        <el-icon><Download /></el-icon>
        导出JSON
      </el-button>
      <el-button @click="printDetail" size="large">
        <el-icon><Printer /></el-icon>
        打印详情
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import {
  DocumentCopy, Download, RefreshRight, Printer
} from '@element-plus/icons-vue'

const props = defineProps({
  item: {
    type: Object,
    required: true
  }
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

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('文本已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败：' + error.message)
  }
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('文件下载成功')
}

function copyNoun(noun) {
  const text = `${noun.original} → ${noun.translation}`
  copyText(text)
}

function reuseTranslation() {
  // 在实际应用中，这里可以将数据传递到翻译页面
  ElMessage.info('功能开发中...')
}

function exportToJSON() {
  const data = {
    session: props.item,
    exportTime: new Date().toISOString(),
    version: '1.0'
  }
  
  const jsonString = JSON.stringify(data, null, 2)
  downloadText(jsonString, `translation_${props.item.id}.json`)
}

function printDetail() {
  window.print()
}
</script>

<style scoped>
.translation-detail {
  space-y: 24px;
}

.text-comparison-section h3 {
  margin: 24px 0 16px 0;
  color: #303133;
  font-size: 18px;
}

.text-card {
  margin-bottom: 20px;
}

.text-content {
  line-height: 1.6;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 4px;
  margin-bottom: 16px;
}

.text-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.no-translation {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.nouns-section h3 {
  margin: 24px 0 16px 0;
  color: #303133;
  font-size: 18px;
}

.action-buttons {
  display: flex;
  gap: 15px;
  justify-content: center;
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #e8e8e8;
}

@media print {
  .action-buttons {
    display: none;
  }
  
  .text-actions {
    display: none;
  }
}

@media (max-width: 768px) {
  .action-buttons {
    flex-direction: column;
  }
  
  .text-actions {
    flex-direction: column;
  }
}
</style>