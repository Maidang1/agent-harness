import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { createDefaultUserMemory } from '../src/memory/memory-data.ts'
import {
  createMemoryLearningRecord,
  hasMemoryLearningRecord,
} from '../src/memory/memory-learning-record.ts'

describe('memory learning record', () => {
  test('builds a compact record for the settings audit panel', () => {
    const memory = createDefaultUserMemory()
    memory.profile.learnedCategories = ['心理成长', '心理成长', '未知分类']
    memory.evidence.recentPrompts = [
      '需求 1',
      '需求 2',
      '需求 3',
      '需求 4',
      '需求 5',
      '需求 6',
    ]
    memory.plans = [
      {
        id: 'plan-old',
        title: '旧计划',
        goal: '读旧书',
        status: 'active',
        evidence: '',
        updatedAt: 1,
      },
      {
        id: 'plan-paused',
        title: '暂停计划',
        goal: '以后再读',
        status: 'paused',
        evidence: '',
        updatedAt: 4,
      },
      {
        id: 'plan-new',
        title: '新计划',
        goal: '读新书',
        status: 'active',
        evidence: '',
        updatedAt: 5,
      },
      {
        id: 'plan-mid',
        title: '中间计划',
        goal: '读中间书',
        status: 'active',
        evidence: '',
        updatedAt: 3,
      },
      {
        id: 'plan-second',
        title: '第二计划',
        goal: '读第二本',
        status: 'active',
        evidence: '',
        updatedAt: 4,
      },
    ]
    memory.meta.lastLearningStatus = {
      status: 'success',
      message: '已更新',
      updatedAt: 1700000000000,
    }

    const record = createMemoryLearningRecord(memory, ['文学小说', '心理成长'])

    assert.equal(hasMemoryLearningRecord(record), true)
    assert.deepEqual(record.recentPrompts, [
      '需求 6',
      '需求 5',
      '需求 4',
      '需求 3',
      '需求 2',
    ])
    assert.deepEqual(record.categories, ['文学小说', '心理成长'])
    assert.deepEqual(
      record.activePlans.map((plan) => plan.id),
      ['plan-new', 'plan-second', 'plan-mid'],
    )
    assert.deepEqual(record.lastLearningStatus, memory.meta.lastLearningStatus)
  })

  test('detects empty records', () => {
    assert.equal(
      hasMemoryLearningRecord(
        createMemoryLearningRecord(createDefaultUserMemory(), []),
      ),
      false,
    )
  })
})
