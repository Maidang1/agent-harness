import { callChat, streamChat } from './llm'
import { searchWeReadBooks } from './weread'
import { SYSTEM_PROMPT, KEYWORD_PROMPT } from './prompts'

export interface Env {
  OPENROUTER_API_KEY: string
  WEREAD_API_KEY: string
  ASSETS: Fetcher
}

interface AgentMessage {
  id?: string
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface RunAgentInput {
  threadId: string
  runId: string
  messages: AgentMessage[]
  tools?: unknown[]
  context?: unknown[]
  state?: Record<string, unknown>
  forwardedProps?: Record<string, unknown>
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (url.pathname === '/api/agent' && request.method === 'POST') {
      return handleAgent(request, env)
    }

    return env.ASSETS.fetch(request)
  },
} satisfies ExportedHandler<Env>

async function handleAgent(request: Request, env: Env): Promise<Response> {
  const body = await request.json<RunAgentInput>()
  const { messages, threadId, runId } = body

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
      }

      try {
        send({ type: 'RUN_STARTED', threadId, runId })

        // 提取用户消息用于 LLM
        const chatMessages = messages
          .filter((m) => m.role === 'user' || m.role === 'assistant')
          .map((m) => ({ role: m.role, content: m.content }))

        // 提取关键词判断是否需要搜索
        const lastUserMsg = chatMessages.filter((m) => m.role === 'user').pop()
        let books: unknown = []

        if (lastUserMsg) {
          try {
            const keywordResult = await callChat(env.OPENROUTER_API_KEY, [
              { role: 'system', content: KEYWORD_PROMPT },
              { role: 'user', content: lastUserMsg.content },
            ])
            const parsed = JSON.parse(keywordResult) as {
              keyword: string
              need_search: boolean
            }
            if (parsed.need_search && parsed.keyword) {
              books = await searchWeReadBooks(env.WEREAD_API_KEY, parsed.keyword)
            }
          } catch {
            // 关键词提取失败，跳过搜索
          }
        }

        // 构建最终消息列表
        const finalMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          { role: 'system', content: SYSTEM_PROMPT },
          ...chatMessages,
        ]

        // 如果有搜索结果，注入上下文
        const hasBooks = Array.isArray(books) && books.length > 0
        if (hasBooks) {
          finalMessages.push({
            role: 'system',
            content: `以下是从微信读书搜索到的候选书籍，请基于这些书籍和用户需求进行推荐：\n${JSON.stringify(books, null, 2)}`,
          })
        }

        // 流式生成回复
        const messageId = crypto.randomUUID()
        send({ type: 'TEXT_MESSAGE_START', messageId, role: 'assistant' })

        const llmStream = await streamChat(env.OPENROUTER_API_KEY, finalMessages)
        for await (const chunk of llmStream) {
          const delta = chunk.choices[0]?.delta?.content
          if (delta) {
            send({ type: 'TEXT_MESSAGE_CONTENT', messageId, delta })
          }
        }

        send({ type: 'TEXT_MESSAGE_END', messageId })
        send({ type: 'RUN_FINISHED', threadId, runId })
      } catch (err) {
        send({
          type: 'RUN_ERROR',
          threadId,
          runId,
          message: err instanceof Error ? err.message : 'Unknown error',
        })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
