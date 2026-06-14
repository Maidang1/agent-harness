import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  buildBookRecommendationMessages,
  normalizeOpenRouterServerURL,
  streamOpenRouterChat,
  type OpenRouterChatClient,
} from '../src/openrouter-client.ts'
import {
  BOOK_PREFERENCE_CATEGORIES,
  createDefaultClientConfig,
} from '../src/client-config.ts'
import { createDefaultUserMemory } from '../src/memory-data.ts'

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
    memory.profile.summary = '喜欢短篇小说和高密度表达'
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
    assert.match(messages[0].content, /读书推荐 Agent/)
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
      /喜欢短篇小说和高密度表达/,
    )
    assert.match(messages.map((message) => message.content).join('\n'), /读完卡尔维诺/)
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
