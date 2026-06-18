import assert from 'node:assert/strict'
import { describe, test } from 'node:test'

import { EventType, type BaseEvent } from '@ag-ui/client'
import { BookRecommendationAgent } from '../src/agents/openrouter-book-agent.ts'
import { createDefaultClientConfig } from '../src/config/client-config.ts'
import { createDefaultUserMemory } from '../src/memory/memory-data.ts'
import { type CodexStreamEvent } from '../src/model-clients/codex-client.ts'

const collectRunEvents = (agent: BookRecommendationAgent) =>
  new Promise<BaseEvent[]>((resolve, reject) => {
    const events: BaseEvent[] = []

    agent
      .run({
        threadId: 'thread-a',
        runId: 'run-a',
        messages: [
          {
            id: 'message-a',
            role: 'user',
            content: '推荐一本书',
          },
        ],
      } as never)
      .subscribe({
        next: (event) => events.push(event),
        error: reject,
        complete: () => resolve(events),
      })
  })

describe('book recommendation agent', () => {
  test('points missing OpenRouter key users to the left-bottom settings entry', async () => {
    const agent = new BookRecommendationAgent(createDefaultClientConfig())
    const events = await collectRunEvents(agent)
    const content = events
      .filter((event) => event.type === EventType.TEXT_MESSAGE_CONTENT)
      .map((event) => 'delta' in event ? event.delta : '')
      .join('')

    assert.match(content, /左下角设置/)
  })

  test('waits for Codex content before starting the assistant message', async () => {
    const config = createDefaultClientConfig()
    config.provider = 'codex'
    let releaseStream!: () => void
    const release = new Promise<void>((resolve) => {
      releaseStream = resolve
    })
    const agent = new BookRecommendationAgent(config, {
      streamCodexChat: async function* (): AsyncGenerator<CodexStreamEvent> {
        await release
        yield { type: 'content', delta: '推荐《原则》。' }
      },
      generateUserMemoryFromPrompt: async () => createDefaultUserMemory(),
    })
    const events: BaseEvent[] = []
    const completed = new Promise<void>((resolve, reject) => {
      agent
        .run({
          threadId: 'thread-a',
          runId: 'run-a',
          messages: [
            {
              id: 'message-a',
              role: 'user',
              content: '推荐一本书',
            },
          ],
        } as never)
        .subscribe({
          next: (event) => events.push(event),
          error: reject,
          complete: resolve,
        })
    })

    await Promise.resolve()
    assert.deepEqual(
      events.map((event) => event.type),
      [EventType.RUN_STARTED],
    )

    releaseStream()
    await completed

    assert.deepEqual(
      events.map((event) => event.type),
      [
        EventType.RUN_STARTED,
        EventType.TEXT_MESSAGE_START,
        EventType.TEXT_MESSAGE_CONTENT,
        EventType.TEXT_MESSAGE_END,
        EventType.RUN_FINISHED,
      ],
    )
  })

  test('does not learn memory when automatic prompt learning is disabled', async () => {
    const config = createDefaultClientConfig()
    config.provider = 'codex'
    config.memory.autoGenerateFromPrompt = false
    let didGenerateMemory = false
    const agent = new BookRecommendationAgent(config, {
      streamCodexChat: async function* (): AsyncGenerator<CodexStreamEvent> {
        yield { type: 'content', delta: '推荐《原则》。' }
      },
      generateUserMemoryFromPrompt: async () => {
        didGenerateMemory = true
        return createDefaultUserMemory()
      },
    })

    await collectRunEvents(agent)

    assert.equal(didGenerateMemory, false)
  })
})
