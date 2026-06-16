import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  addRecommendationCard,
  createReviewDraftFromCard,
  createWorkspacePlanFromCard,
  markRecommendationCardStatus,
  normalizeReadingWorkspace,
} from '../src/reading/reading-workspace.ts'

const card = {
  id: 'card-a',
  title: '小王子',
  author: '圣埃克苏佩里',
  reason: '适合睡前读',
  scenarios: ['睡前'],
  difficulty: '容易',
  estimatedReadingTime: '2 小时',
  evidence: '用户偏好低压力阅读',
  deepLink: 'weread://reading?bId=book-a',
  createdAt: 1700000000000,
}

describe('reading workspace', () => {
  test('normalizes workspace and deduplicates recommendation cards', () => {
    const workspace = normalizeReadingWorkspace({
      cards: [card, { ...card, id: 'card-b', reason: '重复' }],
    })

    assert.equal(workspace.schemaVersion, 1)
    assert.equal(workspace.cards.length, 1)
    assert.equal(workspace.cards[0].status, 'recommended')
  })

  test('adds cards, marks status, creates plans and review drafts', () => {
    const added = addRecommendationCard(normalizeReadingWorkspace({}), card)
    const planned = createWorkspacePlanFromCard(added, card.id, 1700000100000)
    const read = markRecommendationCardStatus(planned, card.id, 'read')
    const reviewed = createReviewDraftFromCard(read, card.id, 1700000200000)

    assert.equal(reviewed.cards[0].status, 'read')
    assert.equal(reviewed.plans[0].title, '读《小王子》')
    assert.equal(reviewed.plans[0].status, 'active')
    assert.match(reviewed.reviews[0].content, /核心观点/)
    assert.match(reviewed.reviews[0].content, /延伸阅读/)
  })
})
