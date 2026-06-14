# 计划：多轮对话 + OpenRouter SDK + AG-UI 流式输出

## 概述

将当前"单次输入 → 一次性返回推荐结果"的模式改为**多轮对话 + 流式输出**形式。后端使用 `@openrouter/sdk` 调用 `deepseek/deepseek-v4-flash` 模型进行流式生成，通过 **AG-UI 协议**（SSE）将 token 逐个推送给前端。前端使用 `@assistant-ui/react-ag-ui` 渲染对话 UI。

---

## 当前状态分析

### 前端 (`src/App.tsx`)
- 单次表单提交：用户输入 → POST `/api/recommend` → 展示推荐列表
- 无消息历史 UI，无聊天界面

### 后端 (`worker/`)
- `worker/index.ts`：一个 `/api/recommend` 端点，接收 `{ query }` 返回推荐
- `worker/deepseek.ts`：手动 fetch `api.deepseek.com/chat/completions`
- `worker/prompts.ts`：两个 prompt（关键词提取 + 推荐生成）
- `worker/weread.ts`：微信读书搜索 API

### 依赖
- 无任何 LLM SDK
- 环境变量：`DEEPSEEK_API_KEY`、`WEREAD_API_KEY`

---

## 技术方案

### 核心技术栈

| 层 | 技术 | 说明 |
|---|---|---|
| LLM 调用 | `@openrouter/sdk` | 流式调用 `deepseek/deepseek-v4-flash` |
| 后端流式协议 | AG-UI (SSE) | 后端发送标准 AG-UI 事件流 |
| 前端 UI | `@assistant-ui/react` + `@assistant-ui/react-ag-ui` | 聊天 UI 组件 + AG-UI 运行时 |
| 前端 AG-UI 客户端 | `@ag-ui/client` | `HttpAgent` 连接后端 |

### AG-UI 协议事件格式

后端以 SSE (`text/event-stream`) 逐行发送 JSON 事件：

```
data: {"type":"RUN_STARTED","threadId":"t1","runId":"r1"}

data: {"type":"TEXT_MESSAGE_START","messageId":"m1","role":"assistant"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m1","delta":"基于"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m1","delta":"你的"}

data: {"type":"TEXT_MESSAGE_CONTENT","messageId":"m1","delta":"需求"}

data: {"type":"TEXT_MESSAGE_END","messageId":"m1"}

data: {"type":"RUN_FINISHED","threadId":"t1","runId":"r1"}
```

---

## 计划变更

### 1. 安装依赖

```bash
npm install @openrouter/sdk @assistant-ui/react @assistant-ui/react-ag-ui @ag-ui/client
```

### 2. 重写 `worker/deepseek.ts` → `worker/llm.ts`

- 删除 `deepseek.ts`，新建 `worker/llm.ts`
- 使用 `@openrouter/sdk` 的 `OpenRouter` 类，流式调用模型
- 模型：`deepseek/deepseek-v4-flash`

```typescript
import { OpenRouter } from '@openrouter/sdk'

type Message = { role: 'system' | 'user' | 'assistant'; content: string }

export function createOpenRouter(apiKey: string) {
  return new OpenRouter({ apiKey })
}

// 流式调用，返回 async iterable
export async function streamChat(apiKey: string, messages: Message[]) {
  const client = new OpenRouter({ apiKey })
  return client.chat.send({
    model: 'deepseek/deepseek-v4-flash',
    messages,
    stream: true,
  })
}

// 非流式调用（用于关键词提取等内部调用）
export async function callChat(apiKey: string, messages: Message[]): Promise<string> {
  const client = new OpenRouter({ apiKey })
  const result = await client.chat.send({
    model: 'deepseek/deepseek-v4-flash',
    messages,
    stream: false,
  })
  return result.choices[0].message.content ?? ''
}
```

### 3. 修改环境变量

- Env 接口中：`DEEPSEEK_API_KEY` → `OPENROUTER_API_KEY`
- 保留 `WEREAD_API_KEY`

### 4. 重写后端 API 为 AG-UI 协议端点 (`worker/index.ts`)

新增 `POST /api/agent`，遵循 AG-UI 协议：

**请求体**（AG-UI `RunAgentInput` 格式）：
```json
{
  "threadId": "thread-123",
  "runId": "run-456",
  "messages": [
    { "id": "msg-1", "role": "user", "content": "我想学投资理财" }
  ],
  "tools": [],
  "context": [],
  "state": {},
  "forwardedProps": {}
}
```

**响应**：`Content-Type: text/event-stream`，逐行发送 AG-UI 事件。

**处理逻辑**：
1. 接收 messages 历史
2. 判断是否需要搜索微信读书（通过先调用 LLM 提取关键词，非流式）
3. 若需搜索：调用微信读书 API 获取候选书，注入上下文
4. 流式调用 LLM 生成最终回复，逐 token 通过 AG-UI 事件推送给前端
5. 发送 `RUN_FINISHED` 事件

核心伪代码：

```typescript
async function handleAgent(request: Request, env: Env): Promise<Response> {
  const body = await request.json()
  const { messages, threadId, runId } = body

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      // 1. RUN_STARTED
      send({ type: 'RUN_STARTED', threadId, runId })

      // 2. 提取关键词（非流式内部调用）
      const keyword = await extractKeyword(env, messages)

      // 3. 搜索微信读书
      let books = []
      if (keyword) {
        books = await searchWeReadBooks(env.WEREAD_API_KEY, keyword)
      }

      // 4. 流式生成回复
      const messageId = crypto.randomUUID()
      send({ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' })

      const llmStream = await streamChat(env.OPENROUTER_API_KEY, buildMessages(messages, books))
      for await (const chunk of llmStream) {
        const delta = chunk.choices[0]?.delta?.content
        if (delta) {
          send({ type: 'TEXT_MESSAGE_CONTENT', messageId, delta })
        }
      }

      send({ type: 'TEXT_MESSAGE_END', messageId })
      send({ type: 'RUN_FINISHED', threadId, runId })
      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

### 5. 更新 `worker/prompts.ts`

- 合并为一个统一的 system prompt，支持多轮对话
- 保留关键词提取 prompt（用于内部非流式调用判断是否搜索）
- 主对话 prompt 不再要求 JSON 输出，改为自然语言流式回复（可内嵌推荐格式）

### 6. 重构前端为 AG-UI 对话 UI (`src/App.tsx`)

使用 `@assistant-ui/react-ag-ui` 的 `useAgUiRuntime` + `Thread` 组件：

```tsx
import { useMemo } from 'react'
import { AssistantRuntimeProvider } from '@assistant-ui/react'
import { useAgUiRuntime } from '@assistant-ui/react-ag-ui'
import { HttpAgent } from '@ag-ui/client'
import { Thread } from './components/Thread'

export const App = () => {
  const agent = useMemo(
    () => new HttpAgent({ url: '/api/agent' }),
    []
  )
  const runtime = useAgUiRuntime({ agent })

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <Thread />
    </AssistantRuntimeProvider>
  )
}
```

- `Thread` 组件使用 `@assistant-ui/react` 提供的 primitives 构建
- 支持流式文本渲染（token 逐个出现）
- 支持多轮对话（用户发送新消息后自动触发新的 run）
- 保留当前的设计风格（品牌色、字体等）

### 7. 前端 Thread 组件

新增 `src/components/Thread.tsx`，基于 assistant-ui primitives 构建聊天 UI：
- 消息列表（用户消息 + AI 消息）
- 底部 Composer 输入框
- 流式文本逐字显示
- 自动滚动到底部
- 可适配当前的视觉风格（serif 字体、品牌色等）

---

## 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `package.json` | 修改 | 添加 `@openrouter/sdk`、`@assistant-ui/react`、`@assistant-ui/react-ag-ui`、`@ag-ui/client` |
| `worker/deepseek.ts` | 删除 | 不再使用 |
| `worker/llm.ts` | 新建 | OpenRouter SDK 封装（流式 + 非流式） |
| `worker/index.ts` | 重写 | AG-UI 协议端点 `POST /api/agent`，SSE 流式响应 |
| `worker/prompts.ts` | 重写 | 统一多轮对话 system prompt |
| `worker/weread.ts` | 保留 | 无变化 |
| `src/App.tsx` | 重写 | AG-UI runtime provider + Thread |
| `src/components/Thread.tsx` | 新建 | 聊天 UI 组件 |
| `src/index.css` | 修改 | 可能需要添加 assistant-ui 相关样式 |

---

## 假设与决策

1. **模型**：使用 `deepseek/deepseek-v4-flash`（通过 OpenRouter）
2. **流式输出**：使用 `stream: true` 获取 async iterable，逐 token 推送 AG-UI 事件
3. **AG-UI 协议**：后端手动实现 SSE 事件发送（无需额外 AG-UI server SDK，Cloudflare Worker 原生支持 ReadableStream）
4. **前端 UI**：使用 `@assistant-ui/react-ag-ui`，`HttpAgent` 指向 `/api/agent`
5. **对话历史**：由 `@assistant-ui/react` runtime 管理，每次 run 时将完整 messages 发送给后端
6. **搜索触发**：第一次调用仍用非流式 LLM 提取关键词决定是否搜索，搜索结果注入上下文后再流式生成最终回复
7. **环境变量**：`OPENROUTER_API_KEY` 替代 `DEEPSEEK_API_KEY`

---

## 验证步骤

1. `npm install` 正常安装所有新依赖
2. `wrangler dev` 本地启动无报错
3. 前端加载出聊天 UI（Thread + Composer）
4. 发送第一条消息，看到流式文本逐字出现
5. AI 推荐书籍后，继续追问能基于上下文回复
6. 检查 SSE 连接稳定，无中断
