// 简化服务器测试
const express = await import('express');
const cors = await import('cors');

const app = express.default();
const PORT = 3001;

// 中间件
app.use(cors.default());
app.use(express.default.json());

// 简单路由测试
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: '服务器运行正常'
  });
});

// 文件上传测试路由
app.post('/api/test-upload', (req, res) => {
  console.log('📁 收到测试上传请求');
  res.json({ 
    success: true, 
    message: '文件上传测试成功',
    receivedData: req.body
  });
});

// 翻译测试路由
app.post('/api/test-translate', (req, res) => {
  console.log('🔄 收到翻译测试请求:', req.body);
  res.json({
    success: true,
    originalText: req.body.text || '',
    translatedText: '测试翻译结果',
    message: '翻译测试成功'
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🎉 简化服务器运行在端口 ${PORT}`);
  console.log(`🌐 健康检查: http://localhost:${PORT}/health`);
  console.log(`📁 测试上传: POST http://localhost:${PORT}/api/test-upload`);
  console.log(`🔄 测试翻译: POST http://localhost:${PORT}/api/test-translate`);
});

// 保持服务器运行
console.log('✅ 服务器启动完成，按Ctrl+C停止');