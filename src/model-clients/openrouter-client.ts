import { OpenRouter } from '@openrouter/sdk'
import {
  BOOK_PREFERENCE_CATEGORIES,
  DEFAULT_OPENROUTER_MODEL,
  getBookPersonaPrompt,
  type BookPreferenceCategory,
  type BookAgentClientConfig,
  type OpenRouterClientConfig,
} from '../config/client-config.ts'
import {
  type ReadingPlanMemoryView,
  type UserMemoryView,
} from '../memory/memory-data.ts'
import { type ReadingWorkspace } from '../reading/reading-workspace.ts'
import { type WereadSnapshot } from '../weread/weread-data.ts'

export const SYSTEM_PROMPT = `你是一个专业的读书推荐助手，名为「JIAJIA」。

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

export type ReadingContext = {
  wereadSnapshot?: WereadSnapshot
  readingWorkspace?: ReadingWorkspace
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
    appTitle: 'JIAJIA',
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
  readingContext: ReadingContext = {},
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

  const readingContextSummary = createReadingContextSummary(readingContext)

  if (readingContextSummary) {
    openrouterMessages.push({
      role: 'system',
      content: readingContextSummary,
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

export const buildBookRecommendationPrompt = (
  messages: BookRecommendationInputMessage[],
  config: BookAgentClientConfig,
  userMemory: UserMemoryView,
  readingContext: ReadingContext = {},
) =>
  buildBookRecommendationMessages(messages, config, userMemory, readingContext)
    .map(formatPromptMessage)
    .join('\n\n')

export const createReadingContextSummary = ({
  wereadSnapshot,
  readingWorkspace,
}: ReadingContext) => {
  const lines: string[] = []

  if (wereadSnapshot) {
    lines.push('微信读书上下文：')
    lines.push(
      `同步状态：${wereadSnapshot.status}${
        wereadSnapshot.errorMessage ? `，${wereadSnapshot.errorMessage}` : ''
      }。`,
    )

    if (wereadSnapshot.shelf.totalCount > 0) {
      lines.push(
        `书架 ${wereadSnapshot.shelf.totalCount} 个条目：${wereadSnapshot.shelf.bookCount} 本电子书、${wereadSnapshot.shelf.albumCount} 个有声书、${wereadSnapshot.shelf.finishedBookCount} 本已读、${wereadSnapshot.shelf.readingBookCount} 本在读。`,
      )
    }

    if (wereadSnapshot.readingStats.totalReadTimeSeconds > 0) {
      lines.push(
        `本月阅读：${wereadSnapshot.readingStats.readDays} 天，${wereadSnapshot.readingStats.totalReadTimeLabel}，自然日均 ${wereadSnapshot.readingStats.dayAverageReadTimeLabel}。`,
      )
    }

    const categories = wereadSnapshot.readingStats.preferCategories
      .slice(0, 4)
      .map((category) => category.title)

    if (categories.length > 0) {
      lines.push(`微信读书偏好分类：${categories.join('、')}。`)
    }

    const recent = wereadSnapshot.shelf.recentItems
      .slice(0, 4)
      .map((item) => item.title)

    if (recent.length > 0) {
      lines.push(`最近阅读：${recent.join('、')}。`)
    }

    const noteBooks = wereadSnapshot.notebooks.books
      .slice(0, 4)
      .map((book) => `${book.title}（${book.totalNoteCount} 条）`)

    if (noteBooks.length > 0) {
      lines.push(`笔记较多：${noteBooks.join('、')}。`)
    }

    const wereadRecommendations = wereadSnapshot.recommendedBooks
      .slice(0, 3)
      .map((book) => book.title)

    if (wereadRecommendations.length > 0) {
      lines.push(`微信读书推荐：${wereadRecommendations.join('、')}。`)
    }
  }

  if (readingWorkspace) {
    const activePlans = readingWorkspace.plans
      .filter((plan) => plan.status === 'active')
      .slice(0, 3)
      .map((plan) => `${plan.title}：${plan.goal}`)
    const cards = readingWorkspace.cards
      .filter((card) => card.status !== 'read')
      .slice(0, 5)
      .map((card) => card.title)
    const reviews = readingWorkspace.reviews
      .slice(0, 3)
      .map((review) => review.title)

    if (activePlans.length > 0 || cards.length > 0 || reviews.length > 0) {
      lines.push('本地阅读工作区：')
    }

    if (activePlans.length > 0) {
      lines.push(`活跃计划：${activePlans.join('；')}。`)
    }

    if (cards.length > 0) {
      lines.push(`本地待读：${cards.join('、')}。`)
    }

    if (reviews.length > 0) {
      lines.push(`已有复盘：${reviews.join('、')}。`)
    }
  }

  if (lines.length === 0) {
    return ''
  }

  lines.push('每条推荐必须给出推荐依据，优先关联用户偏好、历史提问、读书计划或微信读书数据。')
  lines.push('复盘任务使用固定结构：核心观点、关键划线、我的理解、可执行行动、延伸阅读。')

  return lines.join('\n')
}

const trimChatCompletionPath = (value: string) =>
  value.replace(/\/chat\/completions\/?$/, '') || '/'

const formatPromptMessage = (message: OpenRouterMessage) => {
  const label =
    message.role === 'system'
      ? '系统'
      : message.role === 'assistant'
        ? '助手'
        : '用户'

  return `${label}：\n${message.content}`
}

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
  const summary = createMemorySummary(userMemory)

  if (summary) {
    memoryLines.push(`偏好摘要：${summary}`)
  }

  const categories = normalizeMemoryCategories([
    ...preferences.favoriteCategories,
    ...userMemory.profile.learnedCategories,
  ])

  if (categories.length > 0) {
    memoryLines.push(`偏好分类：${categories.join('、')}。`)
  }

  const activePlans = [...userMemory.plans]
    .filter((plan) => plan.status === 'active')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3)

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

const createMemorySummary = (userMemory: UserMemoryView) => {
  const userSummary = userMemory.profile.userSummary.trim()
  const autoSummary = userMemory.profile.autoSummary.trim()

  if (userSummary && autoSummary) {
    return `${userSummary}；${autoSummary}`
  }

  return userSummary || autoSummary || userMemory.profile.summary.trim()
}

const normalizeMemoryCategories = (
  values: readonly string[],
): BookPreferenceCategory[] => {
  const categories = new Set<BookPreferenceCategory>()

  for (const value of values) {
    const category = BOOK_PREFERENCE_CATEGORIES.find(
      (item) => item.value === value || item.label === value,
    )

    if (category) {
      categories.add(category.value)
    }
  }

  return [...categories]
}
