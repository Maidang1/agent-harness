import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  formatWereadDate,
  formatWereadDuration,
  normalizeWereadSnapshot,
} from '../src/weread/weread-data.ts'

describe('weread data', () => {
  test('normalizes shelf totals with ebooks albums and mp entries', () => {
    const snapshot = normalizeWereadSnapshot({
      updatedAt: 1700000000000,
      shelf: {
        books: [
          {
            bookId: 'book-a',
            title: '置顶书',
            author: '作者 A',
            category: '文学',
            readUpdateTime: 1700000000,
            finishReading: 1,
            secret: 0,
            isTop: 1,
          },
          {
            bookId: 'book-b',
            title: '在读书',
            author: '作者 B',
            category: '心理',
            readUpdateTime: 1700000200,
            finishReading: 0,
            secret: 1,
          },
        ],
        albums: [
          {
            albumInfo: {
              albumId: 'album-a',
              name: '听书 A',
              authorName: '演播 A',
              cover: 'cover-a',
              updateTime: 1700000100,
            },
            albumInfoExtra: {
              secret: 0,
              lectureReadUpdateTime: 1700000300,
            },
          },
        ],
        mp: { name: '文章收藏' },
      },
    })

    assert.equal(snapshot.shelf.totalCount, 4)
    assert.equal(snapshot.shelf.bookCount, 2)
    assert.equal(snapshot.shelf.albumCount, 1)
    assert.equal(snapshot.shelf.mpCount, 1)
    assert.equal(snapshot.shelf.privateCount, 2)
    assert.equal(snapshot.shelf.publicCount, 2)
    assert.equal(snapshot.shelf.finishedBookCount, 1)
    assert.deepEqual(
      snapshot.shelf.recentItems.map((item) => item.title),
      ['听书 A', '在读书', '置顶书'],
    )
    assert.equal(snapshot.shelf.recentItems[1].deepLink, 'weread://reading?bId=book-b')
  })

  test('normalizes notebook counts and reading durations', () => {
    const snapshot = normalizeWereadSnapshot({
      readingStats: {
        readDays: 8,
        totalReadTime: 7380,
        dayAverageReadTime: 600,
        preferCategory: [
          {
            categoryTitle: '文学',
            readingTime: 3600,
            readingCount: 2,
          },
        ],
      },
      notebooks: {
        totalBookCount: 1,
        totalNoteCount: 9,
        books: [
          {
            bookId: 'book-a',
            book: {
              title: '笔记书',
              author: '作者',
              cover: 'cover',
            },
            reviewCount: 2,
            noteCount: 3,
            bookmarkCount: 4,
            readingProgress: 45,
            markedStatus: 0,
            sort: 1700000000,
          },
        ],
      },
    })

    assert.equal(snapshot.readingStats.totalReadTimeLabel, '2小时3分钟')
    assert.equal(snapshot.readingStats.dayAverageReadTimeLabel, '10分钟')
    assert.deepEqual(snapshot.readingStats.preferCategories, [
      {
        title: '文学',
        readingTimeSeconds: 3600,
        readingTimeLabel: '1小时',
        readingCount: 2,
      },
    ])
    assert.equal(snapshot.notebooks.books[0].totalNoteCount, 9)
    assert.equal(formatWereadDuration(0), '0分钟')
    assert.equal(formatWereadDate(1700000000), '2023-11-14')
  })
})
