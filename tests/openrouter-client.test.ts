import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import {
  buildBookRecommendationPrompt,
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
