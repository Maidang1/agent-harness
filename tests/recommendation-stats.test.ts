import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { BOOK_PREFERENCE_CATEGORIES } from '../src/config/client-config.ts'
import { createDefaultUserMemory, type UserMemoryView } from '../src/memory/memory-data.ts'
import {
  createRecommendationStats,
  type ChatConversationSnapshot,
} from '../src/recommendations/recommendation-stats.ts'

const conversationA: ChatConversationSnapshot = {
  id: 'chat-a',
  title: '压力管理',
  updatedAt: 20,
  messages: [
    {
      role: 'user',
      content: '工作压力大，想读心理成长类的书，给我一个 4 周读书计划',
      createdAt: 1,
    },
    {
      role: 'assistant',
      content: '推荐《也许你该找个人聊聊》，心理成长方向。',
      createdAt: 2,
    },
    {
      role: 'user',
      content: '也推荐一本适合通勤读的商业管理书',
      createdAt: 3,
    },
    {
      role: 'assistant',
      content: '《定位》偏商业管理，通勤可读。',
      createdAt: 4,
    },
  ],
}

const conversationB: ChatConversationSnapshot = {
  id: 'chat-b',
  title: '历史入门',
  updatedAt: 10,
  messages: [
    {
      role: 'user',
      content: '想入门历史社科',
      createdAt: 5,
    },
    {
      role: 'assistant',
      content: '推荐《枪炮、病菌与钢铁》。',
      createdAt: 6,
    },
  ],
}

const userMemory: UserMemoryView = {
  ...createDefaultUserMemory(),
  profile: {
    summary: '偏好案例型阅读',
    userSummary: '',
    autoSummary: '偏好案例型阅读',
    learnedCategories: ['科技科普'],
    notes: [],
  },
  evidence: {
    recentPrompts: ['想找科技科普入门书'],
  },
}

const preferences = {
  favoriteCategories: [BOOK_PREFERENCE_CATEGORIES[0].value],
}

const countFor = (items: readonly { id: string; count: number }[], id: string) =>
  items.find((item) => item.id === id)?.count ?? 0

describe('recommendation stats', () => {
  test('builds current conversation category and intent stats', () => {
    const stats = createRecommendationStats({
      conversations: [conversationA, conversationB],
      activeConversationId: 'chat-a',
      scope: 'current',
      preferences,
      userMemory,
    })

    assert.equal(stats.scope, 'current')
    assert.equal(stats.chatCount, 1)
    assert.equal(stats.userPromptCount, 2)
    assert.equal(stats.assistantReplyCount, 2)
    assert.equal(countFor(stats.categoryCounts, '心理成长'), 2)
    assert.equal(countFor(stats.categoryCounts, '商业管理'), 2)
    assert.equal(countFor(stats.categoryCounts, '科技科普'), 1)
    assert.equal(countFor(stats.categoryCounts, '文学小说'), 1)
    assert.equal(countFor(stats.intentCounts, 'readingPlan'), 1)
    assert.equal(countFor(stats.intentCounts, 'scenario'), 1)
    assert.deepEqual(stats.recentPrompts.slice(0, 2), [
      '也推荐一本适合通勤读的商业管理书',
      '工作压力大，想读心理成长类的书，给我一个 4 周读书计划',
    ])
  })

  test('builds all-history stats separately from the current conversation', () => {
    const stats = createRecommendationStats({
      conversations: [conversationA, conversationB],
      activeConversationId: 'chat-a',
      scope: 'all',
      preferences,
      userMemory,
    })

    assert.equal(stats.scope, 'all')
    assert.equal(stats.chatCount, 2)
    assert.equal(stats.userPromptCount, 3)
    assert.equal(stats.assistantReplyCount, 3)
    assert.equal(countFor(stats.categoryCounts, '历史社科'), 1)
    assert.equal(countFor(stats.categoryCounts, '其他'), 1)
    assert.equal(countFor(stats.intentCounts, 'beginner'), 1)
  })

  test('classifies unmatched prompts as general intent', () => {
    const stats = createRecommendationStats({
      conversations: [
        {
          id: 'chat-c',
          title: '普通需求',
          updatedAt: 30,
          messages: [
            {
              role: 'user',
              content: '推荐一本最近值得读的书',
              createdAt: 7,
            },
          ],
        },
      ],
      activeConversationId: 'chat-c',
      scope: 'current',
      preferences: { favoriteCategories: [] },
      userMemory: createDefaultUserMemory(),
    })

    assert.equal(countFor(stats.intentCounts, 'general'), 1)
    assert.equal(countFor(stats.categoryCounts, '其他'), 1)
  })
})
