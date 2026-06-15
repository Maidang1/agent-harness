import { contentToText, truncateTextTitle } from './text-content.ts'

export type SidebarMessage = {
  id?: string
  role?: string
  content?: unknown
}

export type PreferenceMemoryView = {
  queries: string[]
  summary: string
}

export type SidebarChatRow = {
  id: string
  label: string
}

export const EMPTY_PREFERENCE_MEMORY: PreferenceMemoryView = {
  queries: [],
  summary: '',
}

export const createThreadTitle = (
  messages: readonly SidebarMessage[],
  preferenceMemory: PreferenceMemoryView = EMPTY_PREFERENCE_MEMORY,
) => {
  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user')
  const latestUserText = latestUserMessage
    ? contentToText(latestUserMessage.content).trim()
    : ''

  if (latestUserText) {
    return truncateTextTitle(latestUserText)
  }

  const latestStoredQuery = preferenceMemory.queries.at(-1)?.trim()

  if (latestStoredQuery) {
    return truncateTextTitle(latestStoredQuery)
  }

  return 'JIAJIA'
}

export const createMemoryChatRows = (
  preferenceMemory: PreferenceMemoryView,
): SidebarChatRow[] =>
  preferenceMemory.queries
    .map((query, index) => ({
      id: `memory-query-${index}`,
      label: truncateTextTitle(query),
    }))
    .reverse()

export const normalizePreferenceMemory = (
  value: unknown,
): PreferenceMemoryView => {
  if (typeof value !== 'object' || value === null) {
    return EMPTY_PREFERENCE_MEMORY
  }

  const memory = value as Partial<PreferenceMemoryView>

  return {
    summary: typeof memory.summary === 'string' ? memory.summary.trim() : '',
    queries: normalizeQueries(memory.queries),
  }
}

const normalizeQueries = (value: unknown) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .filter((query): query is string => typeof query === 'string')
    .map((query) => query.trim())
    .filter(Boolean)
}
