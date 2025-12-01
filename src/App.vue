<template>
  <div class="app-container">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="navbar-content">
        <div class="navbar-brand">
          <h2>Dify翻译工作流</h2>
        </div>
        <div class="navbar-menu">
          <router-link to="/" class="navbar-item" active-class="active">
            <el-icon><Document /></el-icon>
            翻译
          </router-link>
          <router-link to="/history" class="navbar-item" active-class="active">
            <el-icon><Clock /></el-icon>
            历史记录
          </router-link>
          <router-link to="/report" class="navbar-item" active-class="active">
            <el-icon><Warning /></el-icon>
            错误报告
          </router-link>
        </div>
      </div>
    </nav>
    
    <!-- 页面内容 -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { Document, Clock, Warning } from '@element-plus/icons-vue'
</script>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: #f5f7fa;
  color: #333;
  line-height: 1.6;
}

/* 应用容器 */
.app-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏样式 */
.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.navbar-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
}

.navbar-brand h2 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.navbar-menu {
  display: flex;
  gap: 10px;
}

.navbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  color: white;
  text-decoration: none;
  border-radius: 8px;
  transition: all 0.3s ease;
  font-weight: 500;
}

.navbar-item:hover {
  background-color: rgba(255, 255, 255, 0.1);
  transform: translateY(-2px);
}

.navbar-item.active {
  background-color: rgba(255, 255, 255, 0.2);
  font-weight: 600;
}

/* 主内容区域 */
.main-content {
  flex: 1;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  width: 100%;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .navbar-content {
    padding: 0 10px;
  }
  
  .navbar-brand h2 {
    font-size: 1.2rem;
  }
  
  .navbar-item {
    padding: 8px 12px;
    font-size: 0.9rem;
  }
  
  .main-content {
    padding: 10px;
  }
}
</style>