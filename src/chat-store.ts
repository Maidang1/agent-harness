import type {
  ExportedMessageRepository,
  ExportedMessageRepositoryItem,
  ThreadHistoryAdapter,
  ThreadMessage,
} from '@assistant-ui/react'
import { contentToText, truncateTextTitle } from './text-content.ts'

export type ChatSummary = {
  id: string
  title: string
  updatedAt: number
}

type StoredConversation = {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  repository: ExportedMessageRepository
}

type StoredState = {
  conversations: StoredConversation[]
}

const STORAGE_KEY = 'book-agent.chats'
const DEFAULT_TITLE = '新对话'

type Listener = () => void

const listeners = new Set<Listener>()

export const subscribeChats = (listener: Listener) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const emitChange = () => {
  for (const listener of listeners) {
    listener()
  }
}

export const createConversationId = () =>
  `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const readState = (): StoredState => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (!raw) {
      return { conversations: [] }
    }

    const parsed = JSON.parse(raw) as Partial<StoredState>

    if (!parsed || !Array.isArray(parsed.conversations)) {
      return { conversations: [] }
    }

    return { conversations: parsed.conversations.filter(isStoredConversation) }
  } catch {
    return { conversations: [] }
  }
}

const writeState = (state: StoredState) => {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

const isStoredConversation = (value: unknown): value is StoredConversation => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const conversation = value as Partial<StoredConversation>

  return (
    typeof conversation.id === 'string' &&
    typeof conversation.repository === 'object' &&
    conversation.repository !== null &&
    Array.isArray((conversation.repository as ExportedMessageRepository).messages)
  )
}

export const listConversations = (): ChatSummary[] =>
  readState()
    .conversations.map((conversation) => ({
      id: conversation.id,
      title: conversation.title?.trim() || DEFAULT_TITLE,
      updatedAt: conversation.updatedAt ?? conversation.createdAt ?? 0,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt)

export const deleteConversation = (id: string) => {
  const state = readState()
  const next = state.conversations.filter((conversation) => conversation.id !== id)

  if (next.length !== state.conversations.length) {
    writeState({ conversations: next })
    emitChange()
  }
}

const reviveMessage = (message: ThreadMessage): ThreadMessage => {
  const createdAt =
    message.createdAt instanceof Date
      ? message.createdAt
      : new Date(message.createdAt as unknown as string)

  return { ...message, createdAt }
}

const loadRepository = (id: string): ExportedMessageRepository => {
  const conversation = readState().conversations.find(
    (entry) => entry.id === id,
  )

  if (!conversation) {
    return { messages: [] }
  }

  return {
    headId: conversation.repository.headId ?? null,
    messages: conversation.repository.messages.map((item) => ({
      ...item,
      message: reviveMessage(item.message),
    })),
  }
}

const appendRepositoryItem = (id: string, item: ExportedMessageRepositoryItem) => {
  const state = readState()
  const now = Date.now()
  const index = state.conversations.findIndex((entry) => entry.id === id)
  const existing =
    index >= 0
      ? state.conversations[index]
      : {
          id,
          title: DEFAULT_TITLE,
          createdAt: now,
          updatedAt: now,
          repository: { messages: [], headId: null } as ExportedMessageRepository,
        }

  const messages = existing.repository.messages.filter(
    (entry) => entry.message.id !== item.message.id,
  )
  messages.push(item)

  const nextConversation: StoredConversation = {
    ...existing,
    updatedAt: now,
    title: deriveTitle(existing.title, item.message),
    repository: {
      headId: item.message.id,
      messages,
    },
  }

  const conversations = [...state.conversations]

  if (index >= 0) {
    conversations[index] = nextConversation
  } else {
    conversations.push(nextConversation)
  }

  writeState({ conversations })
  emitChange()
}

const deriveTitle = (currentTitle: string, message: ThreadMessage): string => {
  if (currentTitle && currentTitle !== DEFAULT_TITLE) {
    return currentTitle
  }

  if (message.role !== 'user') {
    return currentTitle || DEFAULT_TITLE
  }

  const text = contentToText(message.content).trim()

  if (!text) {
    return currentTitle || DEFAULT_TITLE
  }

  return truncateTextTitle(text)
}

export const createChatHistoryAdapter = (
  conversationId: string,
): ThreadHistoryAdapter => ({
  load: async () => loadRepository(conversationId),
  append: async (item) => {
    appendRepositoryItem(conversationId, item)
  },
})
