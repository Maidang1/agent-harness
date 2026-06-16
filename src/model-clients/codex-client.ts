import { invoke } from '@tauri-apps/api/core'
import {
  listen,
  type UnlistenFn,
} from '@tauri-apps/api/event'
import { type BookAgentClientConfig } from '../config/client-config.ts'

export type CodexAuthStatus = {
  authMode: string
  hasTokens: boolean
  hasRefreshToken: boolean
  lastRefresh: string
  loginStatus: string
}

type CodexRunEvent = {
  runId: string
  type: 'delta' | 'done' | 'error'
  delta?: string
  error?: string
}

export type CodexStreamEvent = {
  type: 'content'
  delta: string
}

export type StartCodexChatRunArgs = {
  runId: string
  prompt: string
  config: {
    provider: BookAgentClientConfig['provider']
    openrouter: BookAgentClientConfig['openrouter']
    codex: BookAgentClientConfig['codex']
    memory: BookAgentClientConfig['memory']
  }
}

export const getCodexAuthStatus = async (): Promise<CodexAuthStatus> =>
  invoke('get_codex_auth_status')

export const buildStartCodexChatRunArgs = (
  runId: string,
  prompt: string,
  config: BookAgentClientConfig,
): StartCodexChatRunArgs => ({
  runId,
  prompt,
  config: {
    provider: config.provider,
    openrouter: config.openrouter,
    codex: config.codex,
    memory: config.memory,
  },
})

export const streamCodexChat = async function* (
  prompt: string,
  config: BookAgentClientConfig,
  signal?: AbortSignal,
): AsyncGenerator<CodexStreamEvent> {
  const runId = createRunId()
  const queue: CodexStreamEvent[] = []
  let unlisten: UnlistenFn | undefined
  let wake: (() => void) | undefined
  let isFinished = false
  let runError: Error | undefined

  const notify = () => {
    wake?.()
    wake = undefined
  }

  const waitForEvent = () =>
    new Promise<void>((resolve) => {
      wake = resolve
    })

  const abortRun = () => {
    void invoke('cancel_codex_run', { runId })
    isFinished = true
    notify()
  }

  try {
    unlisten = await listen<CodexRunEvent>('codex-run-event', (event) => {
      const payload = event.payload

      if (payload.runId !== runId) {
        return
      }

      if (payload.type === 'delta' && payload.delta) {
        queue.push({ type: 'content', delta: payload.delta })
        notify()
        return
      }

      if (payload.type === 'error') {
        runError = new Error(payload.error || 'Codex 调用失败')
      }

      isFinished = true
      notify()
    })

    if (signal?.aborted) {
      abortRun()
    } else {
      signal?.addEventListener('abort', abortRun, { once: true })
      await invoke(
        'start_codex_chat_run',
        buildStartCodexChatRunArgs(runId, prompt, config),
      )
    }

    while (!isFinished || queue.length > 0) {
      const event = queue.shift()

      if (event) {
        yield event
        continue
      }

      await waitForEvent()
    }

    if (runError) {
      throw runError
    }
  } finally {
    signal?.removeEventListener('abort', abortRun)
    unlisten?.()
  }
}

const createRunId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  return `codex-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
