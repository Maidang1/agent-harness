import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  createClearedUserMemory,
  createDefaultUserMemory,
  createEditedUserMemory,
  createMemoryWithLearningStatus,
  createSimpleEditedUserMemory,
  normalizeUserMemory,
} from '../src/memory/memory-data.ts'

describe('user memory data', () => {
  test('creates an empty structured memory by default', () => {
    assert.deepEqual(createDefaultUserMemory(), {
      schemaVersion: 2,
      profile: {
        summary: '',
        userSummary: '',
        autoSummary: '',
        learnedCategories: [],
        notes: [],
      },
      plans: [],
      evidence: {
        recentPrompts: [],
      },
      meta: {
        lastLearningStatus: null,
      },
    })
  })

  test('normalizes learned profile, plans, and evidence', () => {
    assert.deepEqual(
      normalizeUserMemory({
        schemaVersion: 2,
        profile: {
          summary: '  喜欢心理成长和商业管理  ',
          userSummary: '  偏好短章节  ',
          learnedCategories: [' 心理成长 ', '心理成长', 42, '商业管理'],
          notes: ['  喜欢案例型推荐  ', '', '喜欢案例型推荐', '避免太学术'],
        },
        plans: [
          {
            id: ' plan-a ',
            title: '  建立压力管理阅读计划  ',
            goal: '  用 4 周读完三本心理成长书  ',
            status: 'active',
            evidence: ' 用户明确提到工作压力 ',
            updatedAt: 1700000000000,
          },
          {
            title: '',
            goal: ' ',
            status: 'unknown',
          },
        ],
        evidence: {
          recentPrompts: [' 想读压力管理 ', 123, '', '想读压力管理', '了解创业'],
        },
        meta: {
          lastLearningStatus: {
            status: 'failed',
            message: ' 自动学习失败 ',
            updatedAt: -1,
          },
        },
      }),
      {
        schemaVersion: 2,
        profile: {
          summary: '偏好短章节；喜欢心理成长和商业管理',
          userSummary: '偏好短章节',
          autoSummary: '喜欢心理成长和商业管理',
          learnedCategories: ['心理成长', '商业管理'],
          notes: ['喜欢案例型推荐', '避免太学术'],
        },
        plans: [
          {
            id: 'plan-a',
            title: '建立压力管理阅读计划',
            goal: '用 4 周读完三本心理成长书',
            status: 'active',
            evidence: '用户明确提到工作压力',
            updatedAt: 1700000000000,
          },
        ],
        evidence: {
          recentPrompts: ['想读压力管理', '了解创业'],
        },
        meta: {
          lastLearningStatus: {
            status: 'failed',
            message: '自动学习失败',
            updatedAt: 0,
          },
        },
      },
    )
  })

  test('creates an edited user memory from textarea fields', () => {
    assert.deepEqual(
      createEditedUserMemory(createDefaultUserMemory(), {
        summary: '  喜欢商业案例  ',
        learnedCategoriesText: '商业管理\n心理成长\n商业管理',
        notesText: '偏好短章节\n避免纯理论',
        recentPromptsText: '推荐创业书\n制定压力管理计划',
        plans: [
          {
            id: 'plan-a',
            title: '创业阅读计划',
            goal: '读完三本创业案例书',
            status: 'active',
            evidence: '用户手动编辑',
            updatedAt: 1700000000000,
          },
        ],
      }),
      {
        schemaVersion: 2,
        profile: {
          summary: '喜欢商业案例',
          userSummary: '喜欢商业案例',
          autoSummary: '',
          learnedCategories: ['商业管理', '心理成长'],
          notes: ['偏好短章节', '避免纯理论'],
        },
        plans: [
          {
            id: 'plan-a',
            title: '创业阅读计划',
            goal: '读完三本创业案例书',
            status: 'active',
            evidence: '用户手动编辑',
            updatedAt: 1700000000000,
          },
        ],
        evidence: {
          recentPrompts: ['推荐创业书', '制定压力管理计划'],
        },
        meta: {
          lastLearningStatus: null,
        },
      },
    )
  })

  test('creates a simple edited memory without dropping hidden details', () => {
    const memory = normalizeUserMemory({
      profile: {
        summary: '旧摘要',
        userSummary: '',
        autoSummary: '自动摘要',
        learnedCategories: ['商业管理'],
        notes: ['喜欢案例'],
      },
      plans: [
        {
          id: 'plan-a',
          title: '创业阅读计划',
          goal: '读完三本创业案例书',
          status: 'active',
          evidence: '用户手动编辑',
          updatedAt: 1700000000000,
        },
      ],
      evidence: {
        recentPrompts: ['推荐创业书'],
      },
    })

    assert.deepEqual(createSimpleEditedUserMemory(memory, ' 新摘要 '), {
      ...memory,
      profile: {
        ...memory.profile,
        summary: '新摘要；自动摘要',
        userSummary: '新摘要',
      },
    })
  })

  test('clears editable memory fields', () => {
    assert.deepEqual(createClearedUserMemory(), createDefaultUserMemory())
  })

  test('adds a local learning status fallback', () => {
    const memory = createMemoryWithLearningStatus(
      createDefaultUserMemory(),
      'failed',
      ' 自动学习失败 ',
      -1,
    )

    assert.deepEqual(memory.meta.lastLearningStatus, {
      status: 'failed',
      message: '自动学习失败',
      updatedAt: 0,
    })
  })
})
