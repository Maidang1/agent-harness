import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { parseBookRecommendationCards } from '../src/recommendations/book-cards.ts'

describe('book recommendation cards', () => {
  test('parses markdown recommendation blocks with reasons and evidence', () => {
    const cards = parseBookRecommendationCards(`
### 《小王子》 - 圣埃克苏佩里
推荐理由：温柔短篇，适合睡前读。
适合场景：睡前、低压力
难度：容易
预计阅读时间：2 小时
推荐依据：你最近提到想读治愈作品。

### 《原则》
作者：瑞·达利欧
推荐理由：适合建立决策框架。
`)

    assert.equal(cards.length, 2)
    assert.equal(cards[0].title, '小王子')
    assert.equal(cards[0].author, '圣埃克苏佩里')
    assert.equal(cards[0].reason, '温柔短篇，适合睡前读。')
    assert.deepEqual(cards[0].scenarios, ['睡前', '低压力'])
    assert.equal(cards[0].difficulty, '容易')
    assert.equal(cards[0].estimatedReadingTime, '2 小时')
    assert.equal(cards[0].evidence, '你最近提到想读治愈作品。')
    assert.equal(cards[0].deepLink, undefined)
    assert.equal(cards[1].author, '瑞·达利欧')
  })

  test('deduplicates repeated titles and tolerates missing authors', () => {
    const cards = parseBookRecommendationCards(`
1. 《长安的荔枝》
推荐理由：短，节奏快。

2. 《长安的荔枝》 - 马伯庸
推荐理由：重复书名。
`)

    assert.equal(cards.length, 1)
    assert.equal(cards[0].title, '长安的荔枝')
    assert.equal(cards[0].author, '')
    assert.equal(cards[0].reason, '短，节奏快。')
  })
})
