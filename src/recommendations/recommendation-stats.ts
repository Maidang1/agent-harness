import {
  BOOK_PREFERENCE_CATEGORIES,
  type BookUserPreferences,
} from '../config/client-config.ts'
import { type UserMemoryView } from '../memory/memory-data.ts'
import { type ChatConversationSnapshot } from '../chat/chat-store.ts'

export type {
  ChatAnalyticsMessage,
  ChatConversationSnapshot,
} from '../chat/chat-store.ts'

export type RecommendationStatsScope = 'current' | 'all'

export type RecommendationIntentId =
  | 'readingPlan'
  | 'comparison'
  | 'problemSolving'
  | 'deepDive'
  | 'scenario'
  | 'beginner'
  | 'general'

export type StatsCountItem = {
  id: string
  label: string
  count: number
  percentage: number
}

export type RecommendationStats = {
  scope: RecommendationStatsScope
  chatCount: number
  userPromptCount: number
  assistantReplyCount: number
  categoryCounts: StatsCountItem[]
  intentCounts: StatsCountItem[]
  recentPrompts: string[]
}

type CreateRecommendationStatsInput = {
  conversations: readonly ChatConversationSnapshot[]
  activeConversationId: string
  scope: RecommendationStatsScope
  preferences: BookUserPreferences
  userMemory: UserMemoryView
}

type IntentDefinition = {
  id: RecommendationIntentId
  label: string
  pattern: RegExp
}

const OTHER_CATEGORY_ID = '其他'

const INTENT_DEFINITIONS: IntentDefinition[] = [
  {
    id: 'readingPlan',
    label: '读书计划',
    pattern:
      /计划|规划|路径|安排|书单|清单|阶段|每周|[0-9一二三四五六七八九十]+\s*周|个月|读完|持续/,
  },
  {
    id: 'comparison',
    label: '选书比较',
    pattern: /比较|对比|区别|差异|哪本|哪一个|怎么选|选哪|二选一|还是/,
  },
  {
    id: 'scenario',
    label: '场景推荐',
    pattern: /通勤|睡前|周末|旅行|出差|碎片|午休|假期|路上|床头|地铁/,
  },
  {
    id: 'problemSolving',
    label: '解决问题',
    pattern: /压力|焦虑|拖延|困惑|解决|提升|改善|职业|工作|沟通|关系|决策|效率/,
  },
  {
    id: 'deepDive',
    label: '深度学习',
    pattern: /深度|系统|研究|进阶|经典|理论|框架|专题|学术/,
  },
  {
    id: 'beginner',
    label: '入门了解',
    pattern: /入门|新手|开始|基础|了解|科普|启蒙/,
  },
]

const INTENT_LABELS = new Map<RecommendationIntentId, string>([
  ...INTENT_DEFINITIONS.map((definition) => [definition.id, definition.label] as const),
  ['general', '一般需求'],
])

const CATEGORY_LABELS = new Map<string, string>([
  ...BOOK_PREFERENCE_CATEGORIES.map((category) => [
    category.value,
    category.label,
  ] as const),
  [OTHER_CATEGORY_ID, OTHER_CATEGORY_ID],
])

const CATEGORY_ORDER = [
  ...BOOK_PREFERENCE_CATEGORIES.map((category) => category.value),
  OTHER_CATEGORY_ID,
]

const INTENT_ORDER: RecommendationIntentId[] = [
  ...INTENT_DEFINITIONS.map((definition) => definition.id),
  'general',
]

export const createRecommendationStats = ({
  conversations,
  activeConversationId,
  scope,
  preferences,
  userMemory,
}: CreateRecommendationStatsInput): RecommendationStats => {
  const scopedConversations = selectScopedConversations(
    conversations,
    activeConversationId,
    scope,
  )
  const scopedMessages = scopedConversations.flatMap(
    (conversation) => conversation.messages,
  )
  const userPrompts = scopedMessages.filter((message) => message.role === 'user')
  const assistantReplies = scopedMessages.filter(
    (message) => message.role === 'assistant',
  )

  return {
    scope,
    chatCount: scopedConversations.length,
    userPromptCount: userPrompts.length,
    assistantReplyCount: assistantReplies.length,
    categoryCounts: buildCategoryCounts(
      scopedMessages.map((message) => message.content),
      preferences,
      userMemory,
    ),
    intentCounts: buildIntentCounts(userPrompts.map((message) => message.content)),
    recentPrompts: buildRecentPrompts(userPrompts, userMemory),
  }
}

export const classifyRecommendationIntent = (
  prompt: string,
): RecommendationIntentId => {
  const normalizedPrompt = prompt.trim()

  for (const definition of INTENT_DEFINITIONS) {
    if (definition.pattern.test(normalizedPrompt)) {
      return definition.id
    }
  }

  return 'general'
}

const selectScopedConversations = (
  conversations: readonly ChatConversationSnapshot[],
  activeConversationId: string,
  scope: RecommendationStatsScope,
) => {
  if (scope === 'all') {
    return [...conversations]
  }

  return conversations.filter((conversation) => conversation.id === activeConversationId)
}

const buildCategoryCounts = (
  messageTexts: string[],
  preferences: BookUserPreferences,
  userMemory: UserMemoryView,
) => {
  const counts = new Map<string, number>()
  const categorySources = [
    ...messageTexts,
    ...preferences.favoriteCategories,
    ...userMemory.profile.learnedCategories,
  ]

  for (const source of categorySources) {
    const matches = matchCategories(source)

    if (matches.length === 0) {
      incrementCount(counts, OTHER_CATEGORY_ID)
      continue
    }

    for (const category of matches) {
      incrementCount(counts, category)
    }
  }

  return toCountItems(counts, CATEGORY_LABELS, CATEGORY_ORDER)
}

const buildIntentCounts = (prompts: string[]) => {
  const counts = new Map<string, number>()

  for (const prompt of prompts) {
    incrementCount(counts, classifyRecommendationIntent(prompt))
  }

  return toCountItems(counts, INTENT_LABELS, INTENT_ORDER)
}

const buildRecentPrompts = (
  userPrompts: Array<{ content: string; createdAt: number }>,
  userMemory: UserMemoryView,
) => {
  const prompts = [
    ...[...userPrompts]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((message) => message.content),
    ...[...userMemory.evidence.recentPrompts].reverse(),
  ]
  const uniquePrompts: string[] = []

  for (const prompt of prompts) {
    const normalizedPrompt = prompt.trim()

    if (!normalizedPrompt || uniquePrompts.includes(normalizedPrompt)) {
      continue
    }

    uniquePrompts.push(normalizedPrompt)

    if (uniquePrompts.length >= 5) {
      break
    }
  }

  return uniquePrompts
}

const matchCategories = (text: string) =>
  BOOK_PREFERENCE_CATEGORIES
    .map((category) => category.value)
    .filter((category) => text.includes(category))

const incrementCount = (counts: Map<string, number>, id: string) => {
  counts.set(id, (counts.get(id) ?? 0) + 1)
}

const toCountItems = (
  counts: Map<string, number>,
  labels: Map<string, string>,
  order: readonly string[],
) => {
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0)

  return [...counts.entries()]
    .map(([id, count]) => ({
      id,
      label: labels.get(id) ?? id,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count
      }

      return order.indexOf(left.id) - order.indexOf(right.id)
    })
}
