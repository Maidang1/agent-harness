import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createSettingsClientConfig } from '../src/config/settings-config.ts'
import {
  BOOK_PERSONA_PRESETS,
  BOOK_PREFERENCE_CATEGORIES,
  DEFAULT_CODEX_PATH,
  DEFAULT_CODEX_SANDBOX,
  DEFAULT_OPENROUTER_BASE_URL,
  DEFAULT_OPENROUTER_MODEL,
  type BookAgentClientConfig,
} from '../src/config/client-config.ts'

describe('settings config', () => {
  test('creates a client config from settings form values', () => {
    const config: BookAgentClientConfig = {
      provider: 'openrouter',
      openrouter: {
        apiKey: 'old-key',
        model: '',
        baseUrl: '',
      },
      codex: {
        model: '',
        codexPath: '',
        cwd: '',
        sandbox: 'read-only',
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
      persona: {
        presetId: BOOK_PERSONA_PRESETS[3].id,
        customPrompt: '像严格的读书教练一样回答。',
        useCustomPrompt: true,
      },
    }

    assert.deepEqual(createSettingsClientConfig(config, {
      provider: 'codex',
      openrouterApiKey: ' sk-new ',
      wechatApiKey: ' weread-new ',
      codex: {
        model: ' gpt-5.4 ',
        codexPath: '',
        cwd: ' /tmp/book-agent ',
        sandbox: 'read-only',
      },
    }), {
      provider: 'codex',
      openrouter: {
        apiKey: 'sk-new',
        model: DEFAULT_OPENROUTER_MODEL,
        baseUrl: DEFAULT_OPENROUTER_BASE_URL,
      },
      codex: {
        model: 'gpt-5.4',
        codexPath: DEFAULT_CODEX_PATH,
        cwd: '/tmp/book-agent',
        sandbox: DEFAULT_CODEX_SANDBOX,
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
      persona: {
        presetId: BOOK_PERSONA_PRESETS[3].id,
        customPrompt: '像严格的读书教练一样回答。',
        useCustomPrompt: true,
      },
    })
  })
})
