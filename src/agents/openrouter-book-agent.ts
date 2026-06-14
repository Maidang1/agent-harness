import { invoke } from '@tauri-apps/api/core'
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
import { type UserMemoryView } from '../memory-data'
import { contentToText } from '../text-content.ts'

type TauriMessage = {
  role: 'user' | 'assistant'
  content: string
}

export class OpenRouterBookAgent extends HttpAgent {
  private clientConfig: BookAgentClientConfig
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
      const { openrouter, wechatApiKey, preferences } = this.clientConfig

      if (openrouter.apiKey.trim().length === 0) {
        throw new Error('请先在右上角配置 OpenRouter API Key。')
      }

      const tauriMessages = toTauriMessages(input.messages)
      const latestUserPrompt = getLatestUserPrompt(tauriMessages)
      const response = await invoke<string>('recommend_books', {
        messages: tauriMessages,
        config: {
          openrouter: {
            apiKey: openrouter.apiKey,
            model: openrouter.model,
            baseUrl: openrouter.baseUrl,
          },
          wechatApiKey,
          preferences,
          memory: this.clientConfig.memory,
        },
      })

      if (signal.aborted) {
        subscriber.complete()
        return
      }

      await streamText(response, messageId, subscriber, signal)
      this.queueMemoryGeneration(latestUserPrompt)
    } catch (error) {
      if (signal.aborted) {
        subscriber.complete()
        return
      }

      await streamText(formatError(error), messageId, subscriber, signal)
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

const toTauriMessages = (messages: Message[]): TauriMessage[] =>
  messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      role: message.role,
      content: contentToText(message.content),
    }))
    .filter((message) => message.content.trim().length > 0)

const getLatestUserPrompt = (messages: TauriMessage[]) =>
  [...messages]
    .reverse()
    .find((message) => message.role === 'user')
    ?.content.trim() ?? ''

const streamText = async (
  text: string,
  messageId: string,
  subscriber: Subscriber<BaseEvent>,
  signal: AbortSignal,
) => {
  for (const chunk of splitResponse(text)) {
    if (signal.aborted) {
      return
    }

    subscriber.next({
      type: EventType.TEXT_MESSAGE_CONTENT,
      messageId,
      delta: chunk,
    })
    await delay(18, signal)
  }
}

const splitResponse = (response: string) => {
  const chunks = response.match(/(.|\n){1,34}/g)
  return chunks ?? [response]
}

const delay = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      resolve()
      return
    }

    const timer = window.setTimeout(resolve, ms)
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timer)
        reject(new DOMException('Run aborted', 'AbortError'))
      },
      { once: true },
    )
  })

const formatError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '未知错误'

  return `OpenRouter 调用失败：${message}`
}
