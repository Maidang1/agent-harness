import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'

import { listConversationSnapshots } from '../src/chat-store.ts'

class MemoryStorage {
  private readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }

  clear() {
    this.values.clear()
  }
}

const storage = new MemoryStorage()

Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: storage,
  },
})

describe('chat store snapshots', () => {
  beforeEach(() => {
    storage.clear()
  })

  test('reads normalized conversation snapshots for analytics', () => {
    window.localStorage.setItem(
      'book-agent.chats',
      JSON.stringify({
        conversations: [
          {
            id: 'chat-a',
            title: '  压力管理  ',
            createdAt: 10,
            updatedAt: 30,
            repository: {
              headId: 'a2',
              messages: [
                {
                  message: {
                    id: 'u1',
                    role: 'user',
                    content: [{ type: 'text', text: '心理成长推荐' }],
                    createdAt: '2026-06-01T00:00:00.000Z',
                  },
                },
                {
                  message: {
                    id: 'a1',
                    role: 'assistant',
                    content: '可以先看压力管理。',
                    createdAt: '2026-06-01T00:01:00.000Z',
                  },
                },
                {
                  message: {
                    id: 's1',
                    role: 'system',
                    content: 'hidden',
                    createdAt: '2026-06-01T00:02:00.000Z',
                  },
                },
              ],
            },
          },
          {
            id: 'chat-b',
            title: '',
            createdAt: 20,
            updatedAt: 20,
            repository: { messages: [] },
          },
        ],
      }),
    )

    assert.deepEqual(listConversationSnapshots(), [
      {
        id: 'chat-a',
        title: '压力管理',
        updatedAt: 30,
        messages: [
          {
            id: 'u1',
            role: 'user',
            content: '心理成长推荐',
            createdAt: Date.parse('2026-06-01T00:00:00.000Z'),
          },
          {
            id: 'a1',
            role: 'assistant',
            content: '可以先看压力管理。',
            createdAt: Date.parse('2026-06-01T00:01:00.000Z'),
          },
        ],
      },
      {
        id: 'chat-b',
        title: '新对话',
        updatedAt: 20,
        messages: [],
      },
    ])
  })
})
