import assert from 'node:assert/strict'
import { beforeEach, describe, test } from 'node:test'

import {
  BOOK_PERSONA_PRESETS,
  BOOK_PREFERENCE_CATEGORIES,
  createDefaultClientConfig,
  DEFAULT_CODEX_PATH,
  DEFAULT_CODEX_SANDBOX,
  DEFAULT_BOOK_PERSONA_PRESET_ID,
  OPENROUTER_MODEL_OPTIONS,
  loadClientConfig,
  saveClientConfig,
  type BookAgentClientConfig,
} from '../src/config/client-config.ts'

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
    const config = createDefaultClientConfig()

    assert.deepEqual(config.preferences, {
      favoriteCategories: [],
    })
    assert.deepEqual(config.memory, {
      enabled: true,
      includeInRecommendations: true,
      autoGenerateFromPrompt: true,
    })
    assert.deepEqual(config.persona, {
      presetId: DEFAULT_BOOK_PERSONA_PRESET_ID,
      customPrompt: '',
      useCustomPrompt: false,
    })
    assert.equal(config.provider, 'openrouter')
    assert.deepEqual(config.codex, {
      model: '',
      codexPath: DEFAULT_CODEX_PATH,
      cwd: '',
      sandbox: DEFAULT_CODEX_SANDBOX,
    })
  })

  test('exposes supported OpenRouter model choices', () => {
    assert.deepEqual(
      OPENROUTER_MODEL_OPTIONS.map((option) => option.id),
      [
        'deepseek/deepseek-v4-flash',
        'qwen/qwen3.5-flash-02-23',
        'xiaomi/mimo-v2.5',
      ],
    )
  })

  test('keeps selected favorite categories when config is saved and loaded', () => {
    const config: BookAgentClientConfig = {
      provider: 'codex',
      openrouter: {
        apiKey: 'sk-test',
        model: 'deepseek/test',
        baseUrl: 'https://example.com/chat',
      },
      codex: {
        model: 'gpt-5.4',
        codexPath: '/opt/homebrew/bin/codex',
        cwd: '/tmp/book-agent',
        sandbox: 'read-only',
      },
      wechatApiKey: 'wx-test',
      memory: {
        enabled: true,
        includeInRecommendations: false,
        autoGenerateFromPrompt: false,
      },
      preferences: {
        favoriteCategories: [
          BOOK_PREFERENCE_CATEGORIES[0].value,
          BOOK_PREFERENCE_CATEGORIES[2].value,
        ],
      },
      persona: {
        presetId: BOOK_PERSONA_PRESETS[1].id,
        customPrompt: '用短句回答，优先给明确书单。',
        useCustomPrompt: true,
      },
    }

    saveClientConfig(config)

    assert.deepEqual(loadClientConfig().preferences, config.preferences)
    assert.deepEqual(loadClientConfig().memory, config.memory)
    assert.deepEqual(loadClientConfig().persona, config.persona)
    assert.equal(loadClientConfig().provider, 'codex')
    assert.deepEqual(loadClientConfig().codex, config.codex)
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
    assert.deepEqual(loadClientConfig().memory, {
      enabled: true,
      includeInRecommendations: true,
      autoGenerateFromPrompt: true,
    })
    assert.deepEqual(loadClientConfig().persona, {
      presetId: DEFAULT_BOOK_PERSONA_PRESET_ID,
      customPrompt: '',
      useCustomPrompt: false,
    })
    assert.equal(loadClientConfig().provider, 'openrouter')
    assert.deepEqual(loadClientConfig().codex, createDefaultClientConfig().codex)
  })

  test('normalizes stored Codex provider settings', () => {
    window.localStorage.setItem(
      'book-agent.client-config',
      JSON.stringify({
        provider: 'codex',
        codex: {
          model: '  gpt-5.4  ',
          codexPath: '  /usr/local/bin/codex  ',
          cwd: '  /tmp/books  ',
          sandbox: 'danger-full-access',
        },
      }),
    )

    const config = loadClientConfig()

    assert.equal(config.provider, 'codex')
    assert.deepEqual(config.codex, {
      model: 'gpt-5.4',
      codexPath: '/usr/local/bin/codex',
      cwd: '/tmp/books',
      sandbox: 'read-only',
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

  test('normalizes stored memory settings', () => {
    window.localStorage.setItem(
      'book-agent.client-config',
      JSON.stringify({
        openrouter: {
          apiKey: 'sk-test',
          model: 'deepseek/test',
          baseUrl: 'https://example.com/chat',
        },
        memory: {
          enabled: false,
          includeInRecommendations: 'yes',
          autoGenerateFromPrompt: false,
        },
      }),
    )

    assert.deepEqual(loadClientConfig().memory, {
      enabled: false,
      includeInRecommendations: true,
      autoGenerateFromPrompt: false,
    })
  })

  test('normalizes stored persona settings', () => {
    window.localStorage.setItem(
      'book-agent.client-config',
      JSON.stringify({
        openrouter: {
          apiKey: 'sk-test',
          model: 'deepseek/test',
          baseUrl: 'https://example.com/chat',
        },
        persona: {
          presetId: ` ${BOOK_PERSONA_PRESETS[2].id} `,
          customPrompt: '  像耐心的读书陪伴者一样回答。  ',
          useCustomPrompt: true,
        },
      }),
    )

    assert.deepEqual(loadClientConfig().persona, {
      presetId: BOOK_PERSONA_PRESETS[2].id,
      customPrompt: '像耐心的读书陪伴者一样回答。',
      useCustomPrompt: true,
    })
  })

  test('falls back to the default persona for malformed stored persona settings', () => {
    window.localStorage.setItem(
      'book-agent.client-config',
      JSON.stringify({
        openrouter: {
          apiKey: 'sk-test',
          model: 'deepseek/test',
          baseUrl: 'https://example.com/chat',
        },
        persona: {
          presetId: 'unknown',
          customPrompt: 123,
          useCustomPrompt: 'yes',
        },
      }),
    )

    assert.deepEqual(loadClientConfig().persona, {
      presetId: DEFAULT_BOOK_PERSONA_PRESET_ID,
      customPrompt: '',
      useCustomPrompt: false,
    })
  })
})
