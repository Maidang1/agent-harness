import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createSettingsClientConfig } from '../src/settings-config.ts'
import {
  BOOK_PREFERENCE_CATEGORIES,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  type BookAgentClientConfig,
} from '../src/client-config.ts'

describe('settings config', () => {
  test('creates a client config from settings form values', () => {
    const config: BookAgentClientConfig = {
      openrouter: {
        apiKey: 'old-key',
        model: '',
        baseUrl: '',
      },
      wechatApiKey: 'wx-key',
      memory: {
        enabled: true,
        includeInRecommendations: true,
        autoGenerateFromPrompt: true,
      },
      preferences: {
        favoriteCategories: [BOOK_PREFERENCE_CATEGORIES[0].value],
      },
    }

    assert.deepEqual(createSettingsClientConfig(config, ' sk-new ', ' weread-new '), {
      openrouter: {
        apiKey: 'sk-new',
        model: DEFAULT_OPENROUTER_MODEL,
        baseUrl: DEFAULT_OPENROUTER_BASE_URL,
      },
      wechatApiKey: 'weread-new',
      memory: {
        enabled: true,
        includeInRecommendations: true,
        autoGenerateFromPrompt: true,
      },
      preferences: {
        favoriteCategories: [BOOK_PREFERENCE_CATEGORIES[0].value],
      },
    })
  })
})
