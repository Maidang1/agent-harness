import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  buildBookRecommendationPrompt,
  buildBookRecommendationMessages,
  createReadingContextSummary,
  normalizeOpenRouterServerURL,
  streamOpenRouterChat,
  type OpenRouterChatClient,
} from '../src/model-clients/openrouter-client.ts'
import {
  BOOK_PREFERENCE_CATEGORIES,
  createDefaultClientConfig,
} from '../src/config/client-config.ts'
import { createDefaultUserMemory } from '../src/memory/memory-data.ts'

const collectAsync = async <T>(items: AsyncIterable<T>) => {
  const result: T[] = []

  for await (const item of items) {
    result.push(item)
  }

  return result
}

describe('openrouter client', () => {
  test('normalizes a chat completions endpoint into an SDK server URL', () => {
    assert.equal(
      normalizeOpenRouterServerURL(
        ' https://openrouter.ai/api/v1/chat/completions ',
      ),
      'https://openrouter.ai/api/v1',
    )
  })

  test('builds recommendation messages with persona and memory context', () => {
    const config = createDefaultClientConfig()
    config.preferences.favoriteCategories = [BOOK_PREFERENCE_CATEGORIES[0].value]
    config.persona = {
      presetId: 'concise',
      customPrompt: '',
      useCustomPrompt: false,
    }

    const memory = createDefaultUserMemory()
    memory.profile.userSummary = '喜欢短篇小说'
    memory.profile.autoSummary = '偏好高密度表达'
    memory.profile.learnedCategories = ['文学小说']
    memory.profile.notes = ['偏好中文作品']
    memory.plans = [
      {
        id: 'plan-1',
        title: '读完卡尔维诺',
        goal: '建立现代小说阅读路径',
        status: 'active',
        evidence: '用户主动提过卡尔维诺',
        updatedAt: 1,
      },
    ]

    const messages = buildBookRecommendationMessages(
      [
        { role: 'user', content: '推荐三本小说' },
        { role: 'assistant', content: '可以先看短篇。' },
      ],
      config,
      memory,
    )

    assert.equal(messages[0].role, 'system')
    assert.match(messages[0].content, /JIAJIA/)
    assert.deepEqual(messages.at(-2), {
      role: 'user',
      content: '推荐三本小说',
    })
    assert.deepEqual(messages.at(-1), {
      role: 'assistant',
      content: '可以先看短篇。',
    })
    assert.match(
      messages.map((message) => message.content).join('\n'),
      /简洁直给/,
    )
    assert.match(
      messages.map((message) => message.content).join('\n'),
      /喜欢短篇小说；偏好高密度表达/,
    )
    assert.match(messages.map((message) => message.content).join('\n'), /读完卡尔维诺/)
  })

  test('budgets memory context for recommendation messages', () => {
    const config = createDefaultClientConfig()
    config.preferences.favoriteCategories = ['商业管理']
    const memory = createDefaultUserMemory()
    memory.profile.autoSummary = '偏好案例型商业书'
    memory.profile.learnedCategories = ['商业管理', '心理成长', '未知分类']
    memory.profile.notes = ['偏好备注不会进入推荐上下文']
    memory.evidence.recentPrompts = ['需求 1', '需求 2', '需求 3', '需求 4']
    memory.plans = [
      {
        id: 'plan-1',
        title: '计划 1',
        goal: '目标 1',
        status: 'active',
        evidence: '',
        updatedAt: 1,
      },
      {
        id: 'plan-2',
        title: '计划 2',
        goal: '目标 2',
        status: 'active',
        evidence: '',
        updatedAt: 2,
      },
      {
        id: 'plan-3',
        title: '计划 3',
        goal: '目标 3',
        status: 'active',
        evidence: '',
        updatedAt: 3,
      },
      {
        id: 'plan-4',
        title: '计划 4',
        goal: '目标 4',
        status: 'active',
        evidence: '',
        updatedAt: 4,
      },
    ]

    const content = buildBookRecommendationMessages(
      [{ role: 'user', content: '推荐一本书' }],
      config,
      memory,
    )
      .map((message) => message.content)
      .join('\n')

    assert.match(content, /偏好摘要：偏好案例型商业书/)
    assert.match(content, /偏好分类：商业管理、心理成长/)
    assert.match(content, /计划 4/)
    assert.match(content, /计划 3/)
    assert.match(content, /计划 2/)
    assert.doesNotMatch(content, /计划 1/)
    assert.match(content, /近期需求：需求 2；需求 3；需求 4/)
    assert.doesNotMatch(content, /需求 1/)
    assert.doesNotMatch(content, /偏好备注/)
  })

  test('builds recommendation messages with compact WeRead and workspace context', () => {
    const config = createDefaultClientConfig()
    const content = buildBookRecommendationMessages(
      [{ role: 'user', content: '根据我的书架补一个阅读计划' }],
      config,
      createDefaultUserMemory(),
      {
        wereadSnapshot: {
          schemaVersion: 1,
          updatedAt: 1700000000000,
          status: 'success',
          errorMessage: '',
          shelf: {
            totalCount: 3,
            bookCount: 2,
            albumCount: 1,
            mpCount: 0,
            publicCount: 3,
            privateCount: 0,
            finishedBookCount: 1,
            readingBookCount: 1,
            recentItems: [
              {
                id: 'book-a',
                kind: 'book',
                title: '小王子',
                author: '圣埃克苏佩里',
                category: '文学',
                cover: '',
                updatedAt: 1700000000,
                updatedAtLabel: '2023-11-14',
                isFinished: true,
                isPrivate: false,
                deepLink: 'weread://reading?bId=book-a',
              },
            ],
          },
          readingStats: {
            mode: 'monthly',
            readDays: 5,
            totalReadTimeSeconds: 3600,
            totalReadTimeLabel: '1小时',
            dayAverageReadTimeSeconds: 720,
            dayAverageReadTimeLabel: '12分钟',
            preferCategories: [
              {
                title: '文学',
                readingTimeSeconds: 3600,
                readingTimeLabel: '1小时',
                readingCount: 2,
              },
            ],
            longestBooks: [],
          },
          notebooks: {
            totalBookCount: 1,
            totalNoteCount: 4,
            books: [
              {
                bookId: 'book-a',
                title: '小王子',
                author: '圣埃克苏佩里',
                cover: '',
                reviewCount: 1,
                noteCount: 2,
                bookmarkCount: 1,
                totalNoteCount: 4,
                readingProgress: 100,
                markedStatus: 1,
                sort: 1700000000,
                sortLabel: '2023-11-14',
              },
            ],
          },
          recommendedBooks: [
            {
              bookId: 'book-b',
              title: '山茶文具店',
              author: '小川糸',
              cover: '',
              category: '文学',
              intro: '',
              reason: '为你推荐',
              rating: 88,
              deepLink: 'weread://reading?bId=book-b',
            },
          ],
        },
        readingWorkspace: {
          schemaVersion: 1,
          cards: [
            {
              id: 'card-a',
              title: '也许你该找个人聊聊',
              author: '',
              reason: '情绪友好',
              scenarios: ['心理成长'],
              difficulty: '',
              estimatedReadingTime: '',
              evidence: '用户偏好低压力阅读',
              deepLink: '',
              status: 'planned',
              createdAt: 1700000000000,
              updatedAt: 1700000000000,
            },
          ],
          plans: [],
          reviews: [],
        },
      },
    )
      .map((message) => message.content)
      .join('\n')

    assert.match(content, /微信读书上下文/)
    assert.match(content, /书架 3 个条目/)
    assert.match(content, /最近阅读：小王子/)
    assert.match(content, /笔记较多：小王子/)
    assert.match(content, /本地待读：也许你该找个人聊聊/)
    assert.match(content, /每条推荐必须给出推荐依据/)
  })

  test('creates a bounded reading context summary', () => {
    const summary = createReadingContextSummary({
      wereadSnapshot: {
        schemaVersion: 1,
        updatedAt: 1,
        status: 'failed',
        errorMessage: '网络失败',
        shelf: {
          totalCount: 0,
          bookCount: 0,
          albumCount: 0,
          mpCount: 0,
          publicCount: 0,
          privateCount: 0,
          finishedBookCount: 0,
          readingBookCount: 0,
          recentItems: [],
        },
        readingStats: {
          mode: 'monthly',
          readDays: 0,
          totalReadTimeSeconds: 0,
          totalReadTimeLabel: '0分钟',
          dayAverageReadTimeSeconds: 0,
          dayAverageReadTimeLabel: '0分钟',
          preferCategories: [],
          longestBooks: [],
        },
        notebooks: {
          totalBookCount: 0,
          totalNoteCount: 0,
          books: [],
        },
        recommendedBooks: [],
      },
      readingWorkspace: {
        schemaVersion: 1,
        cards: [],
        plans: [],
        reviews: [],
      },
    })

    assert.match(summary, /同步状态：failed，网络失败/)
  })

  test('builds a provider-neutral Codex prompt from recommendation messages', () => {
    const config = createDefaultClientConfig()
    const prompt = buildBookRecommendationPrompt(
      [{ role: 'user', content: '推荐一本商业书' }],
      config,
      createDefaultUserMemory(),
    )

    assert.match(prompt, /^系统：\n你是一个专业的读书推荐助手/)
    assert.match(prompt, /用户：\n推荐一本商业书$/)
  })

  test('streams content deltas and final reasoning token usage', async () => {
    const requests: unknown[] = []
    const options: unknown[] = []
    const client: OpenRouterChatClient = {
      chat: {
        async send(request, requestOptions) {
          requests.push(request)
          options.push(requestOptions)

          return (async function* () {
            yield {
              choices: [{ delta: { content: '三' } }],
            }
            yield {
              choices: [{ delta: { content: '本书' } }],
            }
            yield {
              choices: [],
              usage: {
                completionTokensDetails: {
                  reasoningTokens: 7,
                },
              },
            }
          })()
        },
      },
    }

    const config = createDefaultClientConfig().openrouter
    config.apiKey = 'sk-test'

    const events = await collectAsync(
      streamOpenRouterChat(client, config, [
        { role: 'user', content: '推荐三本书' },
      ]),
    )

    assert.deepEqual(events, [
      { type: 'content', delta: '三' },
      { type: 'content', delta: '本书' },
      { type: 'usage', reasoningTokens: 7 },
    ])
    assert.deepEqual(requests, [
      {
        chatRequest: {
          model: 'deepseek/deepseek-v4-flash',
          messages: [{ role: 'user', content: '推荐三本书' }],
          stream: true,
        },
      },
    ])
    assert.deepEqual(options, [
      {
        serverURL: 'https://openrouter.ai/api/v1',
        signal: undefined,
      },
    ])
  })
})
