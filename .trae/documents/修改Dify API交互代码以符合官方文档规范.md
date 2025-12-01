# 修改Dify API交互代码以符合官方文档规范

## 问题分析

1. **workflowType与/chat-messages混用**：使用了workflowType参数但调用的是chat-messages端点
2. **app\_id传参方式错误**：app\_id不应出现在requestBody中，应通过Authorization header传递
3. **没有解析Dify标准响应格式**：当前解析逻辑寻找不存在的字段
4. **把chat API当workflow API用**：inputs字段使用错误
5. **response\_mode没有支持stream模式**：只支持blocking模式
6. **错误的错误处理逻辑**：错误分类无法正确反映Dify错误

## 修改计划

### 1. 修改sendToDifyWorkflow函数

* 重命名函数以反映实际功能

* 移除workflowType参数，因为chat API不支持

* 修正requestBody格式，移除app\_id字段

* 正确解析Dify标准响应格式

* 添加对stream模式的支持

### 2. 修改API调用逻辑

* 确保inputs字段与Dify App配置匹配

* 修正语言字段的传递方式

* 移除无效参数

### 3. 修改响应解析逻辑

* 移除对不存在字段的解析

* 正确解析chat-messages的标准响应格式

* 更新parseDifyAnalysisResult函数

### 4. 修改错误处理逻辑

* 基于Dify返回的状态码进行错误分类

* 移除基于错误消息的不准确分类

* 添加对常见Dify错误码的处理

## 具体修改点

1. **server/routes/translate.js**：

   * 修改sendToDifyWorkflow函数

   * 更新API调用逻辑

   * 修正响应解析

   * 改进错误处理

2. **测试文件**：确保测试用例符合新的API格式

## 修改后的代码特点

* 严格遵循Dify 2024-2025版API规范

* 正确使用chat-messages端点

* 支持blocking和streaming两种响应模式

* 准确解析Dify标准响应格式

* 改进的错误处理逻辑

* 移除无效参数和字段

## 预期效果

* 解决Dify请求格式错误

* 确保能正确接收响应

* 正确解析API返回数据

* 提高代码的健壮性和可维护性

* 符合Dify官方文档规范

