import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  createMemoryChatRows,
  createThreadTitle,
  normalizePreferenceMemory,
  type SidebarMessage,
} from '../src/sidebar-data.ts'

describe('sidebar data', () => {
  test('builds the thread title from the latest user message', () => {
    const messages: SidebarMessage[] = [
      {
        id: 'u1',
        role: 'user',
        content: [{ type: 'text', text: '最近工作压力大，想读心理成长类的书' }],
      },
      {
        id: 'a1',
        role: 'assistant',
        content: [{ type: 'text', text: '可以先看压力管理。' }],
      },
      {
        id: 'u2',
        role: 'user',
        content: '也想了解商业管理和创业',
      },
    ]

    assert.equal(createThreadTitle(messages), '也想了解商业管理和创业')
  })

  test('uses the app brand as the fallback thread title', () => {
    assert.equal(createThreadTitle([]), 'JIAJIA')
  })

  test('uses stored memory queries for chat rows', () => {
    const rows = createMemoryChatRows({
      summary: '最近需求偏向心理成长、商业管理。',
      queries: [
        '最近工作压力大，想读心理成长类的书',
        '也想了解商业管理和创业',
      ],
    })

    assert.deepEqual(rows, [
      {
        id: 'memory-query-1',
        label: '也想了解商业管理和创业',
      },
      {
        id: 'memory-query-0',
        label: '最近工作压力大，想读心理成长类的书',
      },
    ])
  })

  test('normalizes malformed stored memory', () => {
    assert.deepEqual(
      normalizePreferenceMemory({
        summary: 123,
        queries: ['  心理成长  ', 42, '', '商业管理'],
      }),
      {
        summary: '',
        queries: ['心理成长', '商业管理'],
      },
    )
  })
})
