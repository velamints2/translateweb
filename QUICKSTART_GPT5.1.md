# 快速启动指南 - GPT-5.1 + DeepSeek 版本

## 📋 5 分钟快速开始

### 1️⃣ 安装依赖
```bash
cd /Users/macbookair/Documents/trae_projects/translate
npm install
```

### 2️⃣ 配置 API 密钥

编辑 `.env` 文件，确保以下配置存在：

```bash
# ✅ 翻译功能 (必需)
OPENAI_API_KEY=sk-proj-xxxxxx

# ✅ 分析功能 (必需)
DEEPSEEK_API_KEY=sk-xxxxxx

# ✅ 飞书功能 (可选)
FEISHU_APP_ID=
FEISHU_APP_SECRET=
```

### 3️⃣ 启动服务

```bash
# 启动后端服务
npm run server

# 在另一个终端启动前端
npm run dev
```

### 4️⃣ 访问应用

打开浏览器访问: http://localhost:5173

---

## 🧪 验证安装

### 运行全流程测试

```bash
node test-full-flow.js
```

预期输出:
```
✅ 飞书知识库: 正常
✅ 文本分析: 正常
✅ 文本翻译: 正常
✅ 所有功能正常运行！
```

---

## 🎯 功能一览

| 功能 | 模型 | 状态 | 成本 |
|------|------|------|------|
| 核心翻译 | GPT-5.1 | ✅ | 低 |
| 文本分析 | DeepSeek Chat | ✅ | 极低 |
| 术语库 | 飞书 + 本地缓存 | ✅ | 免费 |

---

## 💡 使用示例

### 基本翻译

```
输入: "激光雷达用于建图和定位"
输出: "LiDAR is used for Mapping and Localization"
```

### 专业术语识别

系统会自动:
1. 识别文本中的专业术语
2. 查询术语库
3. 显示翻译建议
4. 生成分析报告

---

## ⚙️ 高级配置

### 启用飞书知识库

1. 创建飞书应用 (https://open.feishu.cn/)
2. 获取 App ID 和 Secret
3. 在 `.env` 中配置:
```bash
FEISHU_APP_ID=cli_xxxxxx
FEISHU_APP_SECRET=xxxxxx
```
4. 重启服务

系统会自动从这两个文档提取术语:
- 中-英: https://ay8sh8gpeb.feishu.cn/wiki/SON5wso6CiO5UYkk89fc4wo4nBe
- 中-日: https://ay8sh8gpeb.feishu.cn/wiki/OFHOwWU2DiSpeokTComc83Wwn0d

### 调整缓存时间

编辑 `server/agent/tools/feishu-knowledge-base.js`:

```javascript
const CACHE_DURATION = 30 * 60 * 1000 // 改为需要的时间（毫秒）
```

---

## 🐛 故障排查

### 问题：启动时报错 "API key not found"
**解决：** 检查 `.env` 文件中的 `OPENAI_API_KEY` 是否正确

### 问题：翻译功能不工作
**解决：** 
1. 检查 OpenAI 账户余额
2. 查看服务器日志
3. 尝试运行测试脚本

### 问题：飞书知识库加载失败
**解决：** 这是正常的（飞书为可选功能）
- 系统会自动使用本地模拟术语库
- 功能不受影响

---

## 📊 成本监控

### 当前费率

- **GPT-5.1**: $0.015/1K 输入 tokens, $0.060/1K 输出 tokens
- **DeepSeek Chat**: $0.00014/1K 输入 tokens, $0.00028/1K 输出 tokens

### 估算成本

- 单次翻译: ~$0.005
- 月度 1000 次翻译: ~$5

---

## 📝 常见问题

**Q: 能否切换到其他模型？**
A: 可以。编辑相应文件中的 `model` 参数即可。

**Q: 翻译质量如何？**
A: GPT-5.1 是最新的强大模型，翻译质量优于 Claude 3.5。

**Q: 支持哪些语言？**
A: 支持所有主要语言。预配置了中英、中日翻译。

**Q: 能否离线使用？**
A: 不行，需要网络连接使用 OpenAI 和 DeepSeek API。

---

## 🔗 有用的链接

- [OpenAI 文档](https://platform.openai.com/docs/)
- [DeepSeek 文档](https://platform.deepseek.com/docs/)
- [飞书开放平台](https://open.feishu.cn/)

---

**准备好开始了吗？祝你使用愉快！** 🚀
