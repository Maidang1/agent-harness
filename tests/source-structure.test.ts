import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { describe, test } from 'node:test'

const sourceUrl = (path: string) => new URL(`../src/${path}`, import.meta.url)

describe('source structure', () => {
  test('groups source modules by responsibility', () => {
    const expectedFiles = [
      'config/client-config.ts',
      'config/settings-config.ts',
      'chat/chat-store.ts',
      'chat/sidebar-data.ts',
      'chat/text-content.ts',
      'layout/sidebar-layout.ts',
      'memory/memory-data.ts',
      'memory/memory-learning-record.ts',
      'memory/memory-store.ts',
      'model-clients/codex-client.ts',
      'model-clients/openrouter-client.ts',
      'reading/reading-store.ts',
      'reading/reading-workspace.ts',
      'weread/weread-data.ts',
      'weread/weread-store.ts',
      'recommendations/book-cards.ts',
      'recommendations/recommendation-stats.ts',
      'components/thread/ChatWorkspace.tsx',
    ]
    const retiredRootFiles = [
      'client-config.ts',
      'settings-config.ts',
      'chat-store.ts',
      'sidebar-data.ts',
      'text-content.ts',
      'sidebar-layout.ts',
      'memory-data.ts',
      'memory-learning-record.ts',
      'memory-store.ts',
      'codex-client.ts',
      'openrouter-client.ts',
      'recommendation-stats.ts',
      'components/ChatWorkspace.tsx',
    ]

    for (const file of expectedFiles) {
      assert.equal(existsSync(sourceUrl(file)), true, `${file} should exist`)
    }

    for (const file of retiredRootFiles) {
      assert.equal(existsSync(sourceUrl(file)), false, `${file} should be moved`)
    }
  })
})
