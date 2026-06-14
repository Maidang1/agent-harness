import { OpenRouter } from '@openrouter/sdk'
import {
  DEFAULT_OPENROUTER_MODEL,
  getBookPersonaPrompt,
  type BookAgentClientConfig,
  type OpenRouterClientConfig,
} from './client-config.ts'
import {
  type ReadingPlanMemoryView,
  type UserMemoryView,
} from './memory-data.ts'

const SYSTEM_PROMPT = `你是一个专业的读书推荐助手，名为「读书推荐 Agent」。

你的能力：
- 基于用户的阅读需求、兴趣、目标推荐合适的书籍
- 提供具体的推荐理由和阅读建议
- 如果用户追问或补充需求，基于对话历史给出更精准的推荐

回复规范：
- 使用自然、友好的对话语气
- 推荐书籍时，每本书给出：书名、作者、推荐理由、适合人群、阅读建议
- 回复保持简洁有力

推荐标准：
- 和用户需求高度相关
- 推荐理由具体
- 适合用户当前的阅读目标`

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export type BookRecommendationInputMessage = {
  role: string
  content: string
}

export type OpenRouterChatRequest = {
  chatRequest: {
    model: string
    messages: OpenRouterMessage[]
    stream: true
  }
}

export type OpenRouterRequestOptions = {
  serverURL: string | undefined
  signal: AbortSignal | undefined
}

type OpenRouterStreamChunk = {
  choices?: Array<{
    delta?: {
      content?: string | null
    }
  }>
  error?: {
    message?: string
  }
  usage?: {
    reasoningTokens?: number | null
    completionTokensDetails?: {
      reasoningTokens?: number | null
    } | null
  }
}

export type OpenRouterChatClient = {
  chat: {
    send: (
      request: OpenRouterChatRequest,
      options?: OpenRouterRequestOptions,
    ) => Promise<AsyncIterable<OpenRouterStreamChunk>>
  }
}

export type OpenRouterStreamEvent =
  | {
      type: 'content'
      delta: string
    }
  | {
      type: 'usage'
      reasoningTokens: number
    }

export const createOpenRouterChatClient = (
  config: OpenRouterClientConfig,
): OpenRouterChatClient => {
  const serverURL = normalizeOpenRouterServerURL(config.baseUrl)

  return new OpenRouter({
    apiKey: config.apiKey.trim(),
    httpReferer: 'tauri://book-agent',
    appTitle: 'Book Agent',
    ...(serverURL ? { serverURL } : {}),
  })
}

export const streamOpenRouterChat = async function* (
  client: OpenRouterChatClient,
  config: OpenRouterClientConfig,
  messages: OpenRouterMessage[],
  signal?: AbortSignal,
): AsyncGenerator<OpenRouterStreamEvent> {
  const stream = await client.chat.send(
    {
      chatRequest: {
        model: config.model.trim() || DEFAULT_OPENROUTER_MODEL,
        messages,
        stream: true,
      },
    },
    {
      serverURL: normalizeOpenRouterServerURL(config.baseUrl),
      signal,
    },
  )

  for await (const chunk of stream) {
    if (signal?.aborted) {
      return
    }

    if (chunk.error) {
      throw new Error(chunk.error.message || 'OpenRouter streaming error')
    }

    const delta = chunk.choices?.[0]?.delta?.content

    if (delta) {
      yield { type: 'content', delta }
    }

    const reasoningTokens =
      chunk.usage?.completionTokensDetails?.reasoningTokens ??
      chunk.usage?.reasoningTokens

    if (typeof reasoningTokens === 'number') {
      yield { type: 'usage', reasoningTokens }
    }
  }
}

export const normalizeOpenRouterServerURL = (baseUrl: string) => {
  const trimmedUrl = baseUrl.trim()

  if (!trimmedUrl) {
    return undefined
  }

  try {
    const url = new URL(trimmedUrl)
    url.pathname = trimChatCompletionPath(url.pathname)

    return url.toString().replace(/\/$/, '')
  } catch {
    return trimChatCompletionPath(trimmedUrl).replace(/\/$/, '')
  }
}

export const buildBookRecommendationMessages = (
  messages: BookRecommendationInputMessage[],
  config: BookAgentClientConfig,
  userMemory: UserMemoryView,
): OpenRouterMessage[] => {
  const openrouterMessages: OpenRouterMessage[] = [
    {
      role: 'system',
      content: SYSTEM_PROMPT,
    },
  ]

  const personaContext = buildPersonaContext(config)

  if (personaContext) {
    openrouterMessages.push({
      role: 'system',
      content: personaContext,
    })
  }

  const memoryContext = buildMemoryContext(config, userMemory)

  if (memoryContext) {
    openrouterMessages.push({
      role: 'system',
      content: memoryContext,
    })
  }

  for (const message of messages) {
    if (message.role !== 'user' && message.role !== 'assistant') {
      continue
    }

    const content = message.content.trim()

    if (!content) {
      continue
    }

    openrouterMessages.push({
      role: message.role,
      content,
    })
  }

  return openrouterMessages
}

const trimChatCompletionPath = (value: string) =>
  value.replace(/\/chat\/completions\/?$/, '') || '/'

const buildPersonaContext = (config: BookAgentClientConfig) => {
  const personaPrompt = getBookPersonaPrompt(config.persona).trim()

  return personaPrompt ? `回复人设：\n${personaPrompt}` : undefined
}

const buildMemoryContext = (
  config: BookAgentClientConfig,
  userMemory: UserMemoryView,
) => {
  const { memory, preferences } = config

  if (!memory.enabled || !memory.includeInRecommendations) {
    return undefined
  }

  const memoryLines: string[] = []
  const summary = userMemory.profile.summary.trim()

  if (summary) {
    memoryLines.push(`偏好摘要：${summary}`)
  }

  if (preferences.favoriteCategories.length > 0) {
    memoryLines.push(
      `显式偏好分类：${preferences.favoriteCategories.join('、')}。`,
    )
  }

  if (userMemory.profile.learnedCategories.length > 0) {
    memoryLines.push(
      `模型学习分类：${userMemory.profile.learnedCategories.join('、')}。`,
    )
  }

  if (userMemory.profile.notes.length > 0) {
    memoryLines.push(`偏好备注：${userMemory.profile.notes.join('；')}。`)
  }

  const activePlans = userMemory.plans.filter(
    (plan) => plan.status === 'active',
  )

  if (activePlans.length > 0) {
    memoryLines.push('活跃读书计划：')
    memoryLines.push(...activePlans.map(formatReadingPlan))
  }

  const recentPrompts = userMemory.evidence.recentPrompts.slice(-3)

  if (recentPrompts.length > 0) {
    memoryLines.push(`近期需求：${recentPrompts.join('；')}。`)
  }

  return memoryLines.length > 0
    ? `长期用户记忆：\n${memoryLines.join('\n')}`
    : undefined
}

const formatReadingPlan = (plan: ReadingPlanMemoryView) => {
  const evidence = plan.evidence.trim()

  return evidence
    ? `- ${plan.title}：${plan.goal}；依据：${evidence}`
    : `- ${plan.title}：${plan.goal}`
}
