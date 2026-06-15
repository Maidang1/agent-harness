import { invoke } from '@tauri-apps/api/core'
import { type BookAgentClientConfig } from './client-config.ts'
import {
  createDefaultUserMemory,
  normalizeUserMemory,
  type UserMemoryView,
} from './memory-data.ts'

export const loadUserMemory = async (): Promise<UserMemoryView> => {
  try {
    return normalizeUserMemory(await invoke('get_user_memory'))
  } catch {
    return createDefaultUserMemory()
  }
}

export const saveUserMemory = async (
  memory: UserMemoryView,
): Promise<UserMemoryView> =>
  normalizeUserMemory(await invoke('save_user_memory', { memory }))

export const clearUserMemory = async (): Promise<UserMemoryView> =>
  normalizeUserMemory(await invoke('clear_user_memory'))

export const generateUserMemoryFromPrompt = async (
  prompt: string,
  config: BookAgentClientConfig,
): Promise<UserMemoryView> =>
  normalizeUserMemory(
    await invoke('generate_user_memory_from_prompt', {
      prompt,
      config: {
        provider: config.provider,
        openrouter: {
          apiKey: config.openrouter.apiKey,
          model: config.openrouter.model,
          baseUrl: config.openrouter.baseUrl,
        },
        codex: {
          model: config.codex.model,
          codexPath: config.codex.codexPath,
          cwd: config.codex.cwd,
          sandbox: config.codex.sandbox,
        },
        memory: config.memory,
      },
    }),
  )
