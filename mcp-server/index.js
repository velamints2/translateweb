/**
 * 翻译MCP服务器
 * 
 * 提供三个MCP工具：
 * 1. feishu_knowledge_base - 飞书知识库工具
 * 2. preprocess_text - 预处理翻译文本并生成报告
 * 3. translate_agent - 翻译Agent
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js'
import dotenv from 'dotenv'

// 加载环境变量
dotenv.config()

// 导入工具
import feishuKnowledgeBase from './tools/feishu-knowledge-base.js'
import preprocessText from './tools/preprocess-text.js'
import translateAgent from './tools/translate-agent.js'

// 创建MCP服务器
const server = new Server(
  {
    name: 'translation-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
)

// 注册的工具列表
const tools = [
  feishuKnowledgeBase,
  preprocessText,
  translateAgent
]

// 处理工具列表请求
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  }
})

// 处理工具调用请求
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params
  
  console.log(`🔧 调用工具: ${name}`)
  console.log(`📥 参数:`, args)
  
  // 查找对应的工具
  const tool = tools.find(t => t.name === name)
  
  if (!tool) {
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `未找到工具: ${name}`
          })
        }
      ]
    }
  }
  
  try {
    // 调用工具处理器
    const result = await tool.handler(args)
    
    console.log(`✅ 工具执行完成: ${name}`)
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2)
        }
      ]
    }
  } catch (error) {
    console.error(`❌ 工具执行失败: ${name}`, error)
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: error.message,
            stack: error.stack
          })
        }
      ],
      isError: true
    }
  }
})

// 启动服务器
async function main() {
  console.log('🚀 启动翻译MCP服务器...')
  
  // 检查必要的环境变量
  if (!process.env.ANTHROPIC_API_KEY && !process.env.CLAUDE_API_KEY) {
    console.warn('⚠️  警告: ANTHROPIC_API_KEY 或 CLAUDE_API_KEY 未设置')
    console.warn('   AI 功能将无法正常工作')
  }
  
  if (!process.env.FEISHU_APP_ID || !process.env.FEISHU_APP_SECRET) {
    console.warn('⚠️  警告: 飞书配置未设置，将使用模拟数据')
  }
  
  const transport = new StdioServerTransport()
  await server.connect(transport)
  
  console.log('✅ 翻译MCP服务器已启动')
  console.log('📋 已注册的工具:')
  tools.forEach(tool => {
    console.log(`   - ${tool.name}: ${tool.description}`)
  })
}

main().catch(error => {
  console.error('❌ 服务器启动失败:', error)
  process.exit(1)
})


