import {
  EventType,
  HttpAgent,
  randomUUID,
  type BaseEvent,
  type Message,
  type RunAgentInput,
} from '@ag-ui/client'
import { Observable, type Subscriber } from 'rxjs'
import { type BookAgentClientConfig } from '../config/client-config.ts'
import { streamCodexChat } from '../model-clients/codex-client.ts'
import { generateUserMemoryFromPrompt } from '../memory/memory-store.ts'
import {
  createMemoryWithLearningStatus,
  createDefaultUserMemory,
  type UserMemoryView,
} from '../memory/memory-data.ts'
import {
  buildBookRecommendationPrompt,
  buildBookRecommendationMessages,
  createOpenRouterChatClient,
  streamOpenRouterChat,
  type BookRecommendationInputMessage,
  type ReadingContext,
} from '../model-clients/openrouter-client.ts'
import { contentToText } from '../chat/text-content.ts'

type BookRecommendationAgentDependencies = {
  streamCodexChat: typeof streamCodexChat
  generateUserMemoryFromPrompt: typeof generateUserMemoryFromPrompt
}

export class BookRecommendationAgent extends HttpAgent {
  private clientConfig: BookAgentClientConfig
  private userMemory: UserMemoryView = createDefaultUserMemory()
  private readingContext: ReadingContext = {}
  private onMemoryChange?: (memory: UserMemoryView) => void
  private dependencies: BookRecommendationAgentDependencies

  constructor(
    clientConfig: BookAgentClientConfig,
    dependencies: Partial<BookRecommendationAgentDependencies> = {},
  ) {
    super({
      url: 'local://book-recommendation',
      description: 'Local Tauri book recommendation agent',
    })
    this.clientConfig = clientConfig
    this.dependencies = {
      streamCodexChat,
      generateUserMemoryFromPrompt,
      ...dependencies,
    }
  }

  setClientConfig(config: BookAgentClientConfig) {
    this.clientConfig = config
  }

  setUserMemory(memory: UserMemoryView) {
    this.userMemory = memory
  }

  setReadingContext(context: ReadingContext) {
    this.readingContext = context
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
    let hasStartedMessage = false

    const emitAssistantDelta = (delta: string) => {
      if (!hasStartedMessage) {
        subscriber.next({
          type: EventType.TEXT_MESSAGE_START,
          messageId,
          role: 'assistant',
        })
        hasStartedMessage = true
      }

      emitTextDelta(delta, messageId, subscriber)
    }

    subscriber.next({ type: EventType.RUN_STARTED, threadId, runId })

    try {
      const inputMessages = toBookMessages(input.messages)
      const latestUserPrompt = getLatestUserPrompt(inputMessages)
      const hasContent = await this.streamRecommendation(
        inputMessages,
        emitAssistantDelta,
        signal,
      )

      if (!hasContent) {
        throw new Error('模型响应中没有可展示内容。')
      }

      this.queueMemoryGeneration(latestUserPrompt)
    } catch (error) {
      if (signal.aborted) {
        subscriber.complete()
        return
      }

      emitAssistantDelta(formatError(error))
    }

    if (hasStartedMessage) {
      subscriber.next({ type: EventType.TEXT_MESSAGE_END, messageId })
    }
    subscriber.next({
      type: EventType.RUN_FINISHED,
      threadId,
      runId,
      outcome: { type: 'success' },
    })
    subscriber.complete()
  }

  private queueMemoryGeneration(prompt: string) {
    if (
      !prompt ||
      !this.clientConfig.memory.enabled ||
      !this.clientConfig.memory.autoGenerateFromPrompt
    ) {
      return
    }

    void this.dependencies.generateUserMemoryFromPrompt(prompt, this.clientConfig)
      .then((userMemory) => this.onMemoryChange?.(userMemory))
      .catch((error) => {
        this.onMemoryChange?.(
          createMemoryWithLearningStatus(
            this.userMemory,
            'failed',
            formatMemoryError(error),
          ),
        )
      })
  }

  private async streamRecommendation(
    inputMessages: BookRecommendationInputMessage[],
    onDelta: (delta: string) => void,
    signal: AbortSignal,
  ) {
    return this.clientConfig.provider === 'codex'
      ? this.streamCodexRecommendation(inputMessages, onDelta, signal)
      : this.streamOpenRouterRecommendation(
          inputMessages,
          onDelta,
          signal,
        )
  }

  private async streamOpenRouterRecommendation(
    inputMessages: BookRecommendationInputMessage[],
    onDelta: (delta: string) => void,
    signal: AbortSignal,
  ) {
    const { openrouter } = this.clientConfig

    if (openrouter.apiKey.trim().length === 0) {
      throw new Error('请先在左下角设置中配置 OpenRouter API Key。')
    }

    const recommendationMessages = buildBookRecommendationMessages(
      inputMessages,
      this.clientConfig,
      this.userMemory,
      this.readingContext,
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
        return hasContent
      }

      if (event.type === 'content') {
        hasContent = true
        onDelta(event.delta)
      }
    }

    return hasContent
  }

  private async streamCodexRecommendation(
    inputMessages: BookRecommendationInputMessage[],
    onDelta: (delta: string) => void,
    signal: AbortSignal,
  ) {
    const prompt = buildBookRecommendationPrompt(
      inputMessages,
      this.clientConfig,
      this.userMemory,
      this.readingContext,
    )
    let hasContent = false

    for await (const event of this.dependencies.streamCodexChat(
      prompt,
      this.clientConfig,
      signal,
    )) {
      if (signal.aborted) {
        return hasContent
      }

      if (event.type === 'content') {
        hasContent = true
        onDelta(event.delta)
      }
    }

    return hasContent
  }
}

export { BookRecommendationAgent as OpenRouterBookAgent }

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

  return `模型调用失败：${message}`
}

const formatMemoryError = (error: unknown) =>
  error instanceof Error
    ? `自动学习失败：${error.message}`
    : typeof error === 'string'
      ? `自动学习失败：${error}`
      : '自动学习失败。'
