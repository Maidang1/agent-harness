import {
  EventType,
  HttpAgent,
  randomUUID,
  type BaseEvent,
  type Message,
  type RunAgentInput,
} from '@ag-ui/client'
import { Observable, type Subscriber } from 'rxjs'
import { type BookAgentClientConfig } from '../client-config'
import { generateUserMemoryFromPrompt } from '../memory-store'
import {
  createDefaultUserMemory,
  type UserMemoryView,
} from '../memory-data'
import {
  buildBookRecommendationMessages,
  createOpenRouterChatClient,
  streamOpenRouterChat,
  type BookRecommendationInputMessage,
} from '../openrouter-client'
import { contentToText } from '../text-content.ts'

export class OpenRouterBookAgent extends HttpAgent {
  private clientConfig: BookAgentClientConfig
  private userMemory: UserMemoryView = createDefaultUserMemory()
  private onMemoryChange?: (memory: UserMemoryView) => void

  constructor(clientConfig: BookAgentClientConfig) {
    super({
      url: 'local://openrouter',
      description: 'Local Tauri OpenRouter book recommendation agent',
    })
    this.clientConfig = clientConfig
  }

  setClientConfig(config: BookAgentClientConfig) {
    this.clientConfig = config
  }

  setUserMemory(memory: UserMemoryView) {
    this.userMemory = memory
  }

  setMemoryChangeHandler(handler: (memory: UserMemoryView) => void) {
    this.onMemoryChange = handler
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    this.abortController = new AbortController()

    return new Observable<BaseEvent>((subscriber) => {
      void this.emitRun(input, subscriber, this.abortController.signal)

      return () => {
        this.abortController.abort()
      }
    })
  }

  override abortRun(): void {
    this.abortController.abort()
    super.abortRun()
  }

  private async emitRun(
    input: RunAgentInput,
    subscriber: Subscriber<BaseEvent>,
    signal: AbortSignal,
  ) {
    const threadId = input.threadId || this.threadId
    const runId = input.runId || randomUUID()
    const messageId = randomUUID()

    subscriber.next({ type: EventType.RUN_STARTED, threadId, runId })
    subscriber.next({
      type: EventType.TEXT_MESSAGE_START,
      messageId,
      role: 'assistant',
    })

    try {
      const { openrouter } = this.clientConfig

      if (openrouter.apiKey.trim().length === 0) {
        throw new Error('请先在右上角配置 OpenRouter API Key。')
      }

      const inputMessages = toBookMessages(input.messages)
      const latestUserPrompt = getLatestUserPrompt(inputMessages)
      const recommendationMessages = buildBookRecommendationMessages(
        inputMessages,
        this.clientConfig,
        this.userMemory,
      )
      const openrouterClient = createOpenRouterChatClient(openrouter)
      let hasContent = false

      for await (const event of streamOpenRouterChat(
        openrouterClient,
        openrouter,
        recommendationMessages,
        signal,
      )) {
        if (signal.aborted) {
          subscriber.complete()
          return
        }

        if (event.type === 'content') {
          hasContent = true
          emitTextDelta(event.delta, messageId, subscriber)
        }
      }

      if (!hasContent) {
        throw new Error('OpenRouter 响应中没有可展示内容。')
      }

      this.queueMemoryGeneration(latestUserPrompt)
    } catch (error) {
      if (signal.aborted) {
        subscriber.complete()
        return
      }

      emitTextDelta(formatError(error), messageId, subscriber)
    }

    subscriber.next({ type: EventType.TEXT_MESSAGE_END, messageId })
    subscriber.next({
      type: EventType.RUN_FINISHED,
      threadId,
      runId,
      outcome: { type: 'success' },
    })
    subscriber.complete()
  }

  private queueMemoryGeneration(prompt: string) {
    const { memory, openrouter } = this.clientConfig

    if (
      !prompt ||
      !memory.enabled ||
      !memory.autoGenerateFromPrompt ||
      openrouter.apiKey.trim().length === 0
    ) {
      return
    }

    void generateUserMemoryFromPrompt(prompt, this.clientConfig)
      .then((userMemory) => this.onMemoryChange?.(userMemory))
      .catch(() => {
        // Memory extraction is best-effort and must not interrupt the chat run.
      })
  }
}

const toBookMessages = (messages: Message[]): BookRecommendationInputMessage[] =>
  messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role,
      content: contentToText(message.content),
    }))
    .filter((message) => message.content.trim().length > 0)

const getLatestUserPrompt = (messages: BookRecommendationInputMessage[]) =>
  [...messages]
    .reverse()
    .find((message) => message.role === 'user')
    ?.content.trim() ?? ''

const emitTextDelta = (
  delta: string,
  messageId: string,
  subscriber: Subscriber<BaseEvent>,
) => {
  subscriber.next({
    type: EventType.TEXT_MESSAGE_CONTENT,
    messageId,
    delta,
  })
}

const formatError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '未知错误'

  return `OpenRouter 调用失败：${message}`
}
