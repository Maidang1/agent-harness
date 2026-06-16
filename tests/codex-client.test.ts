import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createDefaultClientConfig } from '../src/config/client-config.ts'
import { buildStartCodexChatRunArgs } from '../src/model-clients/codex-client.ts'

describe('codex client', () => {
  test('builds start run args with the complete Tauri client config shape', () => {
    const config = createDefaultClientConfig()
    config.provider = 'codex'
    config.openrouter.apiKey = ''
    config.codex = {
      model: 'gpt-5.4',
      codexPath: '/opt/homebrew/bin/codex',
      cwd: '/tmp/book-agent',
      sandbox: 'read-only',
    }

    assert.deepEqual(
      buildStartCodexChatRunArgs('run-1', '你是什么模型', config),
      {
        runId: 'run-1',
        prompt: '你是什么模型',
        config: {
          provider: 'codex',
          openrouter: {
            apiKey: '',
            model: 'deepseek/deepseek-v4-flash',
            baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
          },
          codex: {
            model: 'gpt-5.4',
            codexPath: '/opt/homebrew/bin/codex',
            cwd: '/tmp/book-agent',
            sandbox: 'read-only',
          },
          memory: {
            enabled: true,
            includeInRecommendations: true,
            autoGenerateFromPrompt: true,
          },
        },
      },
    )
  })
})
