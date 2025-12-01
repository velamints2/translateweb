# 服务访问指南

## 🚀 当前服务状态

### ✅ 后端服务器
- **地址**: http://localhost:3001
- **状态**: ✅ 运行中
- **模式**: 本地Agent
- **健康检查**: http://localhost:3001/health

### ✅ 前端应用
- **地址**: http://localhost:3000
- **状态**: ✅ 运行中
- **备用地址**: 
  - http://192.168.0.115:3000 (内网)
  - http://26.26.26.1:3000 (虚拟网络)

---

## 📱 本地访问

### 打开应用

在浏览器中访问: **http://localhost:3000**

或使用命令:
```bash
open http://localhost:3000
```

### 测试后端 API

```bash
# 健康检查
curl http://localhost:3001/health

# 提交文本分析
curl -X POST http://localhost:3001/api/submit-text \
  -H "Content-Type: application/json" \
  -d '{"text":"激光雷达用于建图", "language_from":"ZH", "language_to":"EN-US"}'
```

---

## 📊 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/health` | GET | 健康检查 |
| `/api/submit-text` | POST | 文本分析 |
| `/api/confirm-nouns` | POST | 术语确认 |
| `/api/start-translation` | POST | 开始翻译 |
| `/api/session/:sessionId` | GET | 获取会话 |
| `/api/history` | GET | 查询历史 |
| `/api/upload-file` | POST | 文件上传 |

---

## 🔧 常见问题

### Q: 访问 http://localhost:3000 显示连接拒绝？

**A:** 前端服务可能未启动，运行:
```bash
npm run dev
```

### Q: 访问后看到空白页？

**A:** 检查浏览器控制台（F12），可能有 JS 错误。确保:
1. 后端服务运行中 (`npm run server`)
2. 依赖已安装 (`npm install`)

### Q: 翻译功能不工作？

**A:** 检查:
1. `.env` 文件中 `OPENAI_API_KEY` 已配置
2. OpenAI 账户有充足余额
3. 后端日志是否有错误

### Q: 能否从其他设备访问？

**A:** 是的，使用内网 IP:
```
http://192.168.0.115:3000
```

---

## 🛠️ 常用命令

### 启动完整应用

```bash
# 终端1: 启动后端
npm run server

# 终端2: 启动前端
npm run dev
```

### 停止服务

```bash
# 终端中按 Ctrl+C 停止

# 或通过进程 ID 强制停止
lsof -i :3001   # 查看 3001 端口的进程
kill -9 <PID>   # 强制结束进程
```

### 运行测试

```bash
# 完整流程测试
node test-full-flow.js

# 压力测试
npm run test:stress

# 所有测试
npm run test:all
```

---

## 📋 配置检查清单

- [x] 后端服务: http://localhost:3001 ✅
- [x] 前端应用: http://localhost:3000 ✅
- [x] API 连接: 正常 ✅
- [ ] OPENAI_API_KEY 已配置
- [ ] DEEPSEEK_API_KEY 已配置
- [ ] 飞书配置 (可选)

---

## 🎯 下一步

1. 打开 http://localhost:3000
2. 输入待翻译文本
3. 系统会自动进行分析
4. 确认术语后开始翻译
5. 查看翻译结果

---

**祝你使用愉快！** 🚀
