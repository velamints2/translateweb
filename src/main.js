import { createApp } from 'vue'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import App from './App.vue'
import router from './router'

// 创建Vue应用实例
const app = createApp(App)

// 使用Element Plus和Vue Router
app.use(ElementPlus)
app.use(router)

// 挂载到DOM
app.mount('#app')

console.log('🚀 Vue 3 + Element Plus + Vue Router 应用已成功挂载!')
console.log('✅ 开发服务器运行在: http://localhost:3000')