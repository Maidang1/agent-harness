import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'

import {
  BOOK_PREFERENCE_CATEGORIES,
  createDefaultClientConfig,
  loadClientConfig,
  saveClientConfig,
  type BookAgentClientConfig,
} from '../src/client-config.ts'

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

describe('client config preferences', () => {
  beforeEach(() => {
    storage.clear()
  })

  test('creates empty preference memory by default', () => {
    assert.deepEqual(createDefaultClientConfig().preferences, {
      favoriteCategories: [],
    })
  })

  test('keeps selected favorite categories when config is saved and loaded', () => {
    const config: BookAgentClientConfig = {
      openrouter: {
        apiKey: 'sk-test',
        model: 'deepseek/test',
        baseUrl: 'https://example.com/chat',
      },
      wechatApiKey: 'wx-test',
      preferences: {
        favoriteCategories: [
          BOOK_PREFERENCE_CATEGORIES[0].value,
          BOOK_PREFERENCE_CATEGORIES[2].value,
        ],
      },
    }

    saveClientConfig(config)

    assert.deepEqual(loadClientConfig().preferences, config.preferences)
  })

  test('loads old config without preferences as empty preference memory', () => {
    window.localStorage.setItem(
      'book-agent.client-config',
      JSON.stringify({
        openrouter: {
          apiKey: 'sk-test',
          model: 'deepseek/test',
          baseUrl: 'https://example.com/chat',
        },
        wechatApiKey: 'wx-test',
      }),
    )

    assert.deepEqual(loadClientConfig().preferences, {
      favoriteCategories: [],
    })
  })

  test('normalizes stored favorite categories', () => {
    window.localStorage.setItem(
      'book-agent.client-config',
      JSON.stringify({
        openrouter: {
          apiKey: 'sk-test',
          model: 'deepseek/test',
          baseUrl: 'https://example.com/chat',
        },
        preferences: {
          favoriteCategories: [
            ` ${BOOK_PREFERENCE_CATEGORIES[1].value} `,
            BOOK_PREFERENCE_CATEGORIES[1].value,
            '未知分类',
            123,
          ],
        },
      }),
    )

    assert.deepEqual(loadClientConfig().preferences.favoriteCategories, [
      BOOK_PREFERENCE_CATEGORIES[1].value,
    ])
  })
})
